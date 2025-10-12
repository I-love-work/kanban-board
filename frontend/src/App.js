import React, { useState } from "react";
import Board from "./components/Board";

const initialColumns = {
  todo: {
    id: "todo",
    name: "To Do",
    tasks: [],
  },
  inprogress: {
    id: "inprogress",
    name: "In Progress",
    tasks: [],
  },
  done: {
    id: "done",
    name: "Done",
    tasks: [],
  },
};

export default function App() {
  const [columns, setColumns] = useState(initialColumns);

  return (
    <div style={{ padding: 20, background: "#f5f5f5", minHeight: "100vh" }}>
      <h2 style={{ textAlign: "center", margin: 0 }}>🗂️ Simple Kanban Board</h2>
      <Board columns={columns} setColumns={setColumns} />
    </div>
  );
}
