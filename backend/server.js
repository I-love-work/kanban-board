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

// let tasks = [
//   { id: "1", title: "Learn React", status: "todo" },
//   { id: "2", title: "Build Kanban Board", status: "inprogress" },
//   { id: "3", title: "Setup Project Structure", status: "done" },
// ];

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

app.listen(5050, () => console.log("Backend running on http://localhost:5000"));
