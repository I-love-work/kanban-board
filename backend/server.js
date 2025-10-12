const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");
const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

// get all tasks
app.get("/api/tasks", (req, res) => {
  db.all("SELECT * FROM tasks", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// create a new task
app.post("/api/tasks", (req, res) => {
  const { title, status, description } = req.body;
  const id = uuidv4();
  db.run(
    "INSERT INTO tasks (id, title, description, status) VALUES (?, ?, ?, ?)",
    [id, title, description || "", status || "todo"],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res
        .status(201)
        .json({ id, title, description: description || "", status: status || "todo" });
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

  db.run(
    `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`,
    values,
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM tasks WHERE id = ?", [id], (selectErr, row) => {
        if (selectErr) {
          return res.status(500).json({ error: selectErr.message });
        }
        res.json(row);
      });
    }
  );
});

// delete a task
app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM tasks WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Task deleted" });
  });
});

app.listen(5050, () => console.log("Backend running on http://localhost:5050"));
