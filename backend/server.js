const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");

const app = express();

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});

const upload = multer({ storage });

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

const formatAttachment = (row, req) => {
  if (!row) return null;
  const publicUrl =
    row.url && row.url.startsWith("http")
      ? row.url
      : `${req.protocol}://${req.get("host")}${row.url || ""}`;
  return {
    id: row.id,
    taskId: row.task_id,
    type: row.type,
    name: row.name,
    url: publicUrl,
    mimeType: row.mime_type,
    size: row.size,
    createdAt: row.created_at,
  };
};

const attachAttachmentsToTasks = (tasks, attachments, req) => {
  const grouped = attachments.reduce((acc, attachment) => {
    const list = acc.get(attachment.task_id) || [];
    list.push(formatAttachment(attachment, req));
    acc.set(attachment.task_id, list);
    return acc;
  }, new Map());

  return tasks.map((task) => ({
    ...task,
    description: task.description || "",
    attachments: grouped.get(task.id) || [],
  }));
};

// get all tasks
app.get("/api/tasks", (req, res) => {
  db.all("SELECT * FROM tasks", [], (taskErr, tasks) => {
    if (taskErr) {
      return res.status(500).json({ error: taskErr.message });
    }
    db.all("SELECT * FROM attachments", [], (attachmentErr, attachments) => {
      if (attachmentErr) {
        return res.status(500).json({ error: attachmentErr.message });
      }
      res.json(attachAttachmentsToTasks(tasks, attachments, req));
    });
  });
});

// create a new task
app.post("/api/tasks", (req, res) => {
  const { title, status, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  const id = uuidv4();
  db.run(
    "INSERT INTO tasks (id, title, description, status) VALUES (?, ?, ?, ?)",
    [id, title, description || "", status || "todo"],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res
        .status(201)
        .json({ id, title, description: description || "", status: status || "todo", attachments: [] });
    }
  );
});

// update a task
app.put("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const { title, status, description } = req.body;

  const updates = [];
  const values = [];

  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    values.push(description);
  }
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
  }

  if (!updates.length) {
    return res.status(400).json({ error: "No fields provided to update" });
  }

  values.push(id);

  db.run(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`, values, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get("SELECT * FROM tasks WHERE id = ?", [id], (selectErr, taskRow) => {
      if (selectErr) {
        return res.status(500).json({ error: selectErr.message });
      }
      if (!taskRow) {
        return res.status(404).json({ error: "Task not found" });
      }
      db.all(
        "SELECT * FROM attachments WHERE task_id = ?",
        [id],
        (attachmentErr, attachmentRows) => {
          if (attachmentErr) {
            return res.status(500).json({ error: attachmentErr.message });
          }
          res.json({
            ...taskRow,
            description: taskRow.description || "",
            attachments: attachmentRows.map((row) => formatAttachment(row, req)),
          });
        }
      );
    });
  });
});

// delete a task (and its attachments)
app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  db.all("SELECT * FROM attachments WHERE task_id = ?", [id], (fetchErr, rows) => {
    if (fetchErr) {
      return res.status(500).json({ error: fetchErr.message });
    }
    db.run("DELETE FROM tasks WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      rows
        .filter((attachment) => attachment.type === "file" && attachment.path)
        .forEach((attachment) => {
          fs.unlink(attachment.path, (unlinkErr) => {
            if (unlinkErr && unlinkErr.code !== "ENOENT") {
              console.error(`Failed to remove file ${attachment.path}`, unlinkErr);
            }
          });
        });
      res.json({ message: "Task deleted" });
    });
  });
});

// get attachments for a task
app.get("/api/tasks/:id/attachments", (req, res) => {
  const { id } = req.params;
  db.all(
    "SELECT * FROM attachments WHERE task_id = ? ORDER BY datetime(created_at) DESC",
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows.map((row) => formatAttachment(row, req)));
    }
  );
});

// upload a file attachment
app.post(
  "/api/tasks/:id/attachments/upload",
  upload.single("file"),
  (req, res) => {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    db.get("SELECT id FROM tasks WHERE id = ?", [id], (taskErr, taskRow) => {
      if (taskErr) {
        return res.status(500).json({ error: taskErr.message });
      }
      if (!taskRow) {
        return res.status(404).json({ error: "Task not found" });
      }

      const attachmentId = uuidv4();
      const publicPath = `/uploads/${path.basename(req.file.path)}`;

      db.run(
        `
        INSERT INTO attachments (id, task_id, type, name, url, mime_type, size, path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          attachmentId,
          id,
          "file",
          req.file.originalname,
          publicPath,
          req.file.mimetype,
          req.file.size,
          req.file.path,
        ],
        (insertErr) => {
          if (insertErr) {
            return res.status(500).json({ error: insertErr.message });
          }
          db.get(
            "SELECT * FROM attachments WHERE id = ?",
            [attachmentId],
            (selectErr, row) => {
              if (selectErr) {
                return res.status(500).json({ error: selectErr.message });
              }
              res.status(201).json(formatAttachment(row, req));
            }
          );
        }
      );
    });
  }
);

// add a link attachment
app.post("/api/tasks/:id/attachments/link", (req, res) => {
  const { id } = req.params;
  const { url, name } = req.body || {};

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  db.get("SELECT id FROM tasks WHERE id = ?", [id], (taskErr, taskRow) => {
    if (taskErr) {
      return res.status(500).json({ error: taskErr.message });
    }
    if (!taskRow) {
      return res.status(404).json({ error: "Task not found" });
    }

    const attachmentId = uuidv4();
    db.run(
      `
      INSERT INTO attachments (id, task_id, type, name, url, mime_type, size, path)
      VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)
    `,
      [attachmentId, id, "link", name || url, url],
      (insertErr) => {
        if (insertErr) {
          return res.status(500).json({ error: insertErr.message });
        }
        db.get(
          "SELECT * FROM attachments WHERE id = ?",
          [attachmentId],
          (selectErr, row) => {
            if (selectErr) {
              return res.status(500).json({ error: selectErr.message });
            }
            res.status(201).json(formatAttachment(row, req));
          }
        );
      }
    );
  });
});

// delete an attachment
app.delete("/api/attachments/:attachmentId", (req, res) => {
  const { attachmentId } = req.params;
  db.get(
    "SELECT * FROM attachments WHERE id = ?",
    [attachmentId],
    (selectErr, row) => {
      if (selectErr) {
        return res.status(500).json({ error: selectErr.message });
      }
      if (!row) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      db.run("DELETE FROM attachments WHERE id = ?", [attachmentId], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (row.type === "file" && row.path) {
          fs.unlink(row.path, (unlinkErr) => {
            if (unlinkErr && unlinkErr.code !== "ENOENT") {
              console.error(`Failed to remove file ${row.path}`, unlinkErr);
            }
          });
        }

        res.json({ message: "Attachment deleted" });
      });
    }
  );
});

app.listen(5050, () => console.log("Backend running on http://localhost:5050"));
