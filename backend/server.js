const express = require("express");
const cors = require("cors");
const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

let tasks = [
  { id: "1", title: "Learn React", status: "todo" },
  { id: "2", title: "Build Kanban Board", status: "inprogress" },
  { id: "3", title: "Setup Project Structure", status: "done" },
];

app.get("/api/tasks", (req, res) => res.json(tasks));

app.put("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const updated = req.body;
  tasks = tasks.map((t) => (t.id === id ? { ...t, ...updated } : t));
  res.json({ message: "Task updated", tasks });
});

app.listen(5050, () => console.log("Backend running on http://localhost:5000"));
