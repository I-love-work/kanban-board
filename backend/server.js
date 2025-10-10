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
  const { title, status } = req.body;
  const id = uuidv4();
  db.run(
    "INSERT INTO tasks (id, title, status) VALUES (?, ?, ?)",
    [id, title, status || "todo"],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id, title, status: status || "todo" });
    }
  );
});

// update a task
app.put("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const { title, status } = req.body;
  db.run(
    "UPDATE tasks SET title = ?, status = ? WHERE id = ?",
    [title, status, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Task updated" });
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

app.listen(5050, () => console.log("Backend running on http://localhost:5000"));
