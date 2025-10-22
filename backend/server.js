const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");

const app = express();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const TOKEN_EXPIRY = process.env.JWT_EXPIRY || "7d";

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

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const sanitizeUser = (userRow) =>
  userRow
    ? {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name || "",
        createdAt: userRow.created_at || userRow.createdAt || null,
      }
    : null;

const generateToken = (userRow) =>
  jwt.sign({ id: userRow.id, email: userRow.email }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userRow = await dbGet(
      "SELECT id, email, name, created_at FROM users WHERE id = ?",
      [payload.id]
    );

    if (!userRow) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = sanitizeUser(userRow);
    next();
  } catch (err) {
    next(err);
  }
};

const ensureTaskOwnership = async (taskId, userId) =>
  dbGet("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [taskId, userId]);

const ensureBoardOwnership = async (boardId, userId) =>
  dbGet("SELECT * FROM boards WHERE id = ? AND user_id = ?", [boardId, userId]);

const formatBoard = (row) =>
  row
    ? {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        createdAt: row.created_at || row.createdAt || null,
      }
    : null;

const ensureDefaultBoardForUser = async (userId) => {
  let boardRow = await dbGet(
    `
      SELECT id, user_id, name, created_at
      FROM boards
      WHERE user_id = ?
      ORDER BY datetime(created_at) ASC
      LIMIT 1
    `,
    [userId]
  );

  if (!boardRow) {
    const boardId = uuidv4();
    await dbRun(
      "INSERT INTO boards (id, user_id, name) VALUES (?, ?, ?)",
      [boardId, userId, "My Board"]
    );
    boardRow = await dbGet(
      "SELECT id, user_id, name, created_at FROM boards WHERE id = ?",
      [boardId]
    );
  }

  await dbRun(
    `
      UPDATE tasks
      SET board_id = ?
      WHERE user_id = ?
        AND (board_id IS NULL OR board_id = '')
    `,
    [boardRow.id, userId]
  );

  return boardRow;
};

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
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

const formatTag = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    taskId: row.task_id,
    label: row.label,
    color: row.color,
    createdAt: row.created_at,
  };
};

const mergeTaskRelations = (tasks, attachments, tags, req) => {
  const attachmentMap = attachments.reduce((acc, attachment) => {
    const list = acc.get(attachment.task_id) || [];
    list.push(formatAttachment(attachment, req));
    acc.set(attachment.task_id, list);
    return acc;
  }, new Map());

  const tagMap = tags.reduce((acc, tag) => {
    const list = acc.get(tag.task_id) || [];
    list.push(formatTag(tag));
    acc.set(tag.task_id, list);
    return acc;
  }, new Map());

  return tasks.map((task) => ({
    id: task.id,
    userId: task.user_id,
    boardId: task.board_id,
    title: task.title,
    status: task.status,
    description: task.description || "",
    attachments: attachmentMap.get(task.id) || [],
    tags: tagMap.get(task.id) || [],
  }));
};

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const emailRaw = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";
    const name =
      typeof req.body.name === "string" ? req.body.name.trim() : "";

    if (!emailRaw) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const existingUser = await dbGet(
      "SELECT id FROM users WHERE email = ?",
      [emailRaw]
    );
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await dbRun(
      "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
      [userId, emailRaw, passwordHash, name || null]
    );

    const userRow = await dbGet(
      "SELECT id, email, name, created_at FROM users WHERE id = ?",
      [userId]
    );

    await ensureDefaultBoardForUser(userId);

    const token = generateToken(userRow);
    res.status(201).json({ user: sanitizeUser(userRow), token });
  } catch (err) {
    if (err?.code === "SQLITE_CONSTRAINT") {
      return res.status(409).json({ error: "Email already registered" });
    }
    next(err);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const emailRaw = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!emailRaw || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const userRow = await dbGet(
      "SELECT id, email, name, password_hash, created_at FROM users WHERE email = ?",
      [emailRaw]
    );

    if (!userRow) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(userRow);
    res.json({ user: sanitizeUser(userRow), token });
  } catch (err) {
    next(err);
  }
});

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/boards", authenticate, async (req, res, next) => {
  try {
    await ensureDefaultBoardForUser(req.user.id);
    const boards = await dbAll(
      `
        SELECT b.id,
               b.user_id,
               b.name,
               b.created_at,
               COALESCE(tc.total, 0) AS task_count
        FROM boards b
        LEFT JOIN (
          SELECT board_id, COUNT(*) AS total
          FROM tasks
          WHERE user_id = ?
          GROUP BY board_id
        ) tc ON tc.board_id = b.id
        WHERE b.user_id = ?
        ORDER BY datetime(b.created_at) ASC
      `,
      [req.user.id, req.user.id]
    );
    res.json(
      boards.map((row) => ({
        ...formatBoard(row),
        taskCount: row.task_count || 0,
      }))
    );
  } catch (err) {
    next(err);
  }
});

app.post("/api/boards", authenticate, async (req, res, next) => {
  try {
    const rawName =
      typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!rawName) {
      return res.status(400).json({ error: "Name is required" });
    }
    const boardId = uuidv4();
    await dbRun(
      "INSERT INTO boards (id, user_id, name) VALUES (?, ?, ?)",
      [boardId, req.user.id, rawName]
    );
    const boardRow = await dbGet(
      "SELECT id, user_id, name, created_at FROM boards WHERE id = ?",
      [boardId]
    );
    res.status(201).json(formatBoard(boardRow));
  } catch (err) {
    if (err?.code === "SQLITE_CONSTRAINT") {
      return res.status(400).json({ error: "Unable to create board" });
    }
    next(err);
  }
});

app.get("/api/boards/:boardId", authenticate, async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const boardRow = await ensureBoardOwnership(boardId, req.user.id);
    if (!boardRow) {
      return res.status(404).json({ error: "Board not found" });
    }
    res.json(formatBoard(boardRow));
  } catch (err) {
    next(err);
  }
});

// get all tasks
app.get("/api/tasks", authenticate, async (req, res, next) => {
  try {
    await ensureDefaultBoardForUser(req.user.id);
    const boardId =
      typeof req.query.boardId === "string" ? req.query.boardId.trim() : "";
    if (!boardId) {
      return res.status(400).json({ error: "boardId is required" });
    }
    const boardRow = await ensureBoardOwnership(boardId, req.user.id);
    if (!boardRow) {
      return res.status(404).json({ error: "Board not found" });
    }
    const tasks = await dbAll(
      `
        SELECT *
        FROM tasks
        WHERE user_id = ? AND board_id = ?
        ORDER BY rowid ASC
      `,
      [req.user.id, boardId]
    );
    const attachments = await dbAll(
      `
      SELECT a.*
      FROM attachments a
      INNER JOIN tasks t ON a.task_id = t.id
      WHERE t.user_id = ? AND t.board_id = ?
    `,
      [req.user.id, boardId]
    );
    const tags = await dbAll(
      `
      SELECT tg.*
      FROM tags tg
      INNER JOIN tasks t ON tg.task_id = t.id
      WHERE t.user_id = ? AND t.board_id = ?
    `,
      [req.user.id, boardId]
    );
    res.json(mergeTaskRelations(tasks, attachments, tags, req));
  } catch (err) {
    next(err);
  }
});

// create a new task
app.post("/api/tasks", authenticate, async (req, res, next) => {
  try {
    const { title, status, description, boardId } = req.body || {};
    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    if (!trimmedTitle) {
      return res.status(400).json({ error: "Title is required" });
    }
    const normalizedBoardId =
      typeof boardId === "string" && boardId.trim() ? boardId.trim() : "";
    if (!normalizedBoardId) {
      return res.status(400).json({ error: "boardId is required" });
    }
    const boardRow = await ensureBoardOwnership(
      normalizedBoardId,
      req.user.id
    );
    if (!boardRow) {
      return res.status(404).json({ error: "Board not found" });
    }
    const normalizedStatus =
      typeof status === "string" && status.trim() ? status.trim() : "todo";
    const descriptionText =
      typeof description === "string" ? description : "";
    const id = uuidv4();
    await dbRun(
      `
        INSERT INTO tasks (id, user_id, board_id, title, description, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        req.user.id,
        normalizedBoardId,
        trimmedTitle,
        descriptionText,
        normalizedStatus,
      ]
    );
    res.status(201).json({
      id,
      boardId: normalizedBoardId,
      title: trimmedTitle,
      description: descriptionText,
      status: normalizedStatus,
      attachments: [],
      tags: [],
    });
  } catch (err) {
    next(err);
  }
});

// update a task
app.put("/api/tasks/:id", authenticate, async (req, res, next) => {
  const { id } = req.params;
  const { title, status, description, boardId } = req.body || {};

  const updates = [];
  const values = [];
  let validatedBoardId = null;

  if (title !== undefined) {
    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    if (!trimmedTitle) {
      return res.status(400).json({ error: "Title cannot be empty" });
    }
    updates.push("title = ?");
    values.push(trimmedTitle);
  }

  if (description !== undefined) {
    const descriptionText =
      typeof description === "string" ? description : "";
    updates.push("description = ?");
    values.push(descriptionText);
  }

  if (status !== undefined) {
    const normalizedStatus =
      typeof status === "string" && status.trim() ? status.trim() : "";
    if (!normalizedStatus) {
      return res.status(400).json({ error: "Status cannot be empty" });
    }
    updates.push("status = ?");
    values.push(normalizedStatus);
  }

  if (boardId !== undefined) {
    const normalizedBoardId =
      typeof boardId === "string" && boardId.trim() ? boardId.trim() : "";
    if (!normalizedBoardId) {
      return res.status(400).json({ error: "boardId cannot be empty" });
    }
    const boardRow = await ensureBoardOwnership(
      normalizedBoardId,
      req.user.id
    );
    if (!boardRow) {
      return res.status(404).json({ error: "Board not found" });
    }
    validatedBoardId = normalizedBoardId;
    updates.push("board_id = ?");
    values.push(normalizedBoardId);
  }

  if (!updates.length) {
    return res.status(400).json({ error: "No fields provided to update" });
  }

  values.push(id, req.user.id);

  try {
    const result = await dbRun(
      `UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      values
    );

    if (!result.changes) {
      return res.status(404).json({ error: "Task not found" });
    }

    const taskRow = await dbGet(
      "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    const attachmentRows = await dbAll(
      "SELECT * FROM attachments WHERE task_id = ?",
      [id]
    );
    const tagRows = await dbAll("SELECT * FROM tags WHERE task_id = ?", [id]);

    res.json({
      id: taskRow.id,
      userId: taskRow.user_id,
      boardId: taskRow.board_id || validatedBoardId,
      title: taskRow.title,
      description: taskRow.description || "",
      status: taskRow.status,
      attachments: attachmentRows.map((row) => formatAttachment(row, req)),
      tags: tagRows.map((row) => formatTag(row)),
    });
  } catch (err) {
    next(err);
  }
});

// delete a task (and its attachments)
app.delete("/api/tasks/:id", authenticate, async (req, res, next) => {
  const { id } = req.params;
  try {
    const taskRow = await ensureTaskOwnership(id, req.user.id);
    if (!taskRow) {
      return res.status(404).json({ error: "Task not found" });
    }

    const attachmentRows = await dbAll(
      "SELECT * FROM attachments WHERE task_id = ?",
      [id]
    );

    await dbRun("DELETE FROM tasks WHERE id = ? AND user_id = ?", [
      id,
      req.user.id,
    ]);

    attachmentRows
      .filter((attachment) => attachment.type === "file" && attachment.path)
      .forEach((attachment) => {
        fs.unlink(attachment.path, (unlinkErr) => {
          if (unlinkErr && unlinkErr.code !== "ENOENT") {
            console.error(
              `Failed to remove file ${attachment.path}`,
              unlinkErr
            );
          }
        });
      });

    res.json({ message: "Task deleted" });
  } catch (err) {
    next(err);
  }
});

// get attachments for a task
app.get("/api/tasks/:id/attachments", authenticate, async (req, res, next) => {
  const { id } = req.params;
  try {
    const taskRow = await ensureTaskOwnership(id, req.user.id);
    if (!taskRow) {
      return res.status(404).json({ error: "Task not found" });
    }
    const rows = await dbAll(
      "SELECT * FROM attachments WHERE task_id = ? ORDER BY datetime(created_at) DESC",
      [id]
    );
    res.json(rows.map((row) => formatAttachment(row, req)));
  } catch (err) {
    next(err);
  }
});

// upload a file attachment
app.post(
  "/api/tasks/:id/attachments/upload",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    const { id } = req.params;
    try {
      const taskRow = await ensureTaskOwnership(id, req.user.id);
      if (!taskRow) {
        if (req.file?.path) {
          fs.unlink(req.file.path, () => {});
        }
        return res.status(404).json({ error: "Task not found" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const attachmentId = uuidv4();
      const publicPath = `/uploads/${path.basename(req.file.path)}`;

      await dbRun(
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
        ]
      );

      const row = await dbGet("SELECT * FROM attachments WHERE id = ?", [
        attachmentId,
      ]);
      res.status(201).json(formatAttachment(row, req));
    } catch (err) {
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }
      next(err);
    }
  }
);

// add a link attachment
app.post("/api/tasks/:id/attachments/link", authenticate, async (req, res, next) => {
  const { id } = req.params;
  const { url, name } = req.body || {};

  const trimmedUrl = typeof url === "string" ? url.trim() : "";
  if (!trimmedUrl) {
    return res.status(400).json({ error: "URL is required" });
  }
  const displayName =
    typeof name === "string" && name.trim() ? name.trim() : trimmedUrl;

  try {
    const taskRow = await ensureTaskOwnership(id, req.user.id);
    if (!taskRow) {
      return res.status(404).json({ error: "Task not found" });
    }

    const attachmentId = uuidv4();
    await dbRun(
      `
      INSERT INTO attachments (id, task_id, type, name, url, mime_type, size, path)
      VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)
    `,
      [attachmentId, id, "link", displayName, trimmedUrl]
    );

    const row = await dbGet("SELECT * FROM attachments WHERE id = ?", [
      attachmentId,
    ]);
    res.status(201).json(formatAttachment(row, req));
  } catch (err) {
    next(err);
  }
});

// delete an attachment
app.delete(
  "/api/attachments/:attachmentId",
  authenticate,
  async (req, res, next) => {
    const { attachmentId } = req.params;
    try {
      const row = await dbGet(
        `
        SELECT a.*, t.user_id AS owner_id
        FROM attachments a
        INNER JOIN tasks t ON a.task_id = t.id
        WHERE a.id = ?
      `,
        [attachmentId]
      );

      if (!row || row.owner_id !== req.user.id) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      await dbRun("DELETE FROM attachments WHERE id = ?", [attachmentId]);

      if (row.type === "file" && row.path) {
        fs.unlink(row.path, (unlinkErr) => {
          if (unlinkErr && unlinkErr.code !== "ENOENT") {
            console.error(`Failed to remove file ${row.path}`, unlinkErr);
          }
        });
      }

      res.json({ message: "Attachment deleted" });
    } catch (err) {
      next(err);
    }
  }
);

// get tags for a task
app.get("/api/tasks/:id/tags", authenticate, async (req, res, next) => {
  const { id } = req.params;
  try {
    const taskRow = await ensureTaskOwnership(id, req.user.id);
    if (!taskRow) {
      return res.status(404).json({ error: "Task not found" });
    }
    const rows = await dbAll(
      "SELECT * FROM tags WHERE task_id = ? ORDER BY datetime(created_at) DESC",
      [id]
    );
    res.json(rows.map((row) => formatTag(row)));
  } catch (err) {
    next(err);
  }
});

// create a tag for a task
app.post("/api/tasks/:id/tags", authenticate, async (req, res, next) => {
  const { id } = req.params;
  const { label, color } = req.body || {};

  const trimmedLabel = typeof label === "string" ? label.trim() : "";
  if (!trimmedLabel) {
    return res.status(400).json({ error: "Label is required" });
  }
  const normalizedColor =
    typeof color === "string" && color.trim() ? color.trim() : "#1976d2";

  try {
    const taskRow = await ensureTaskOwnership(id, req.user.id);
    if (!taskRow) {
      return res.status(404).json({ error: "Task not found" });
    }

    const tagId = uuidv4();
    await dbRun(
      `
      INSERT INTO tags (id, task_id, label, color)
      VALUES (?, ?, ?, ?)
    `,
      [tagId, id, trimmedLabel, normalizedColor]
    );
    const row = await dbGet("SELECT * FROM tags WHERE id = ?", [tagId]);
    res.status(201).json(formatTag(row));
  } catch (err) {
    next(err);
  }
});

// update a tag
app.put("/api/tags/:tagId", authenticate, async (req, res, next) => {
  const { tagId } = req.params;
  const { label, color } = req.body || {};

  const updates = [];
  const values = [];

  if (label !== undefined) {
    const trimmedLabel = typeof label === "string" ? label.trim() : "";
    if (!trimmedLabel) {
      return res.status(400).json({ error: "Label cannot be empty" });
    }
    updates.push("label = ?");
    values.push(trimmedLabel);
  }
  if (color !== undefined) {
    const normalizedColor =
      typeof color === "string" && color.trim() ? color.trim() : "#1976d2";
    updates.push("color = ?");
    values.push(normalizedColor);
  }

  if (!updates.length) {
    return res.status(400).json({ error: "No fields provided to update" });
  }

  try {
    const tagRow = await dbGet(
      `
      SELECT tg.*
      FROM tags tg
      INNER JOIN tasks t ON tg.task_id = t.id
      WHERE tg.id = ? AND t.user_id = ?
    `,
      [tagId, req.user.id]
    );

    if (!tagRow) {
      return res.status(404).json({ error: "Tag not found" });
    }

    await dbRun(`UPDATE tags SET ${updates.join(", ")} WHERE id = ?`, [
      ...values,
      tagId,
    ]);

    const updatedRow = await dbGet("SELECT * FROM tags WHERE id = ?", [tagId]);
    res.json(formatTag(updatedRow));
  } catch (err) {
    next(err);
  }
});

// delete a tag
app.delete("/api/tags/:tagId", authenticate, async (req, res, next) => {
  const { tagId } = req.params;
  try {
    const row = await dbGet(
      `
      SELECT tg.*, t.user_id AS owner_id
      FROM tags tg
      INNER JOIN tasks t ON tg.task_id = t.id
      WHERE tg.id = ?
    `,
      [tagId]
    );

    if (!row || row.owner_id !== req.user.id) {
      return res.status(404).json({ error: "Tag not found" });
    }

    await dbRun("DELETE FROM tags WHERE id = ?", [tagId]);
    res.json({ message: "Tag deleted" });
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ error: "Internal server error" });
});

app.listen(5050, () => console.log("Backend running on http://localhost:5050"));
