import React, { useEffect, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";
import { getTasks, updateTask, createTask } from "../api/taskApi";

export default function Board({ columns, setColumns }) {
  const [newTaskTitle, setNewTaskTitle] = useState("");

  useEffect(() => {
    async function fetchTasks() {
      try {
        const data = await getTasks();
        const grouped = {
          todo: {
            id: "todo",
            name: "To Do",
            tasks: data.filter((t) => t.status === "todo"),
          },
          inprogress: {
            id: "inprogress",
            name: "In Progress",
            tasks: data.filter((t) => t.status === "inprogress"),
          },
          done: {
            id: "done",
            name: "Done",
            tasks: data.filter((t) => t.status === "done"),
          },
        };
        setColumns(grouped);
      } catch (err) {
        console.error("Failed to load tasks:", err);
      }
    }

    fetchTasks();
  }, [setColumns]);

  const handleAddTask = async () => {
    const title = newTaskTitle.trim();
    if (!title) return;

    try {
      const newTask = await createTask({ title, status: "todo" });
      setColumns((prev) => ({
        ...prev,
        todo: {
          ...prev.todo,
          tasks: [...prev.todo.tasks, newTask],
        },
      }));
      setNewTaskTitle("");
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceCol = columns[source.droppableId];
    const destCol = columns[destination.droppableId];
    const sourceTasks = Array.from(sourceCol.tasks);
    const [moved] = sourceTasks.splice(source.index, 1);

    if (source.droppableId === destination.droppableId) {
      sourceTasks.splice(destination.index, 0, moved);
      setColumns({
        ...columns,
        [source.droppableId]: { ...sourceCol, tasks: sourceTasks },
      });
    } else {
      const destTasks = Array.from(destCol.tasks);
      destTasks.splice(destination.index, 0, moved);
      setColumns({
        ...columns,
        [source.droppableId]: { ...sourceCol, tasks: sourceTasks },
        [destination.droppableId]: { ...destCol, tasks: destTasks },
      });

      try {
        await updateTask(moved.id, { status: destination.droppableId });
      } catch (err) {
        console.error("Failed to update task:", err);
      }
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          marginTop: 20,
        }}
      >
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Enter new task..."
          style={{
            width: "300px",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />
        <button
          onClick={handleAddTask}
          style={{
            padding: "8px 14px",
            border: "none",
            borderRadius: "6px",
            backgroundColor: "#1976d2",
            color: "white",
            cursor: "pointer",
          }}
        >
          Add Task
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            alignItems: "flex-start",
            marginTop: 24,
            padding: 8,
          }}
        >
          {Object.entries(columns).map(([id, column]) => (
            <Column key={id} droppableId={id} column={column} />
          ))}
        </div>
      </DragDropContext>
    </>
  );
}
