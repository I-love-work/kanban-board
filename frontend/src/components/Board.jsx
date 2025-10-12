import React, { useEffect, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";
import { getTasks, updateTask, createTask, deleteTask } from "../api/taskApi";

export default function Board({ columns, setColumns }) {
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const updateLocalTask = (columnId, taskId, updater) => {
    let updatedTask;
    setColumns((prev) => {
      const column = prev[columnId];
      if (!column) return prev;
      const tasks = column.tasks.map((task) => {
        if (task.id !== taskId) return task;
        updatedTask = updater(task);
        return updatedTask;
      });
      if (!updatedTask) return prev;
      return { ...prev, [columnId]: { ...column, tasks } };
    });
    return updatedTask;
  };

  useEffect(() => {
    async function fetchTasks() {
      try {
        const data = await getTasks();
        const grouped = {
          todo: {
            id: "todo",
            name: "To Do",
            tasks: data
              .filter((t) => t.status === "todo")
              .map((task) => ({ ...task, description: task.description || "" })),
          },
          inprogress: {
            id: "inprogress",
            name: "In Progress",
            tasks: data
              .filter((t) => t.status === "inprogress")
              .map((task) => ({ ...task, description: task.description || "" })),
          },
          done: {
            id: "done",
            name: "Done",
            tasks: data
              .filter((t) => t.status === "done")
              .map((task) => ({ ...task, description: task.description || "" })),
          },
        };
        setColumns(grouped);
      } catch (err) {
        console.error("Failed to load tasks:", err);
      }
    }
    fetchTasks();
  }, [setColumns]);

  // Add new task to "To Do" column
  const handleAddTask = async () => {
    const title = newTaskTitle.trim();
    if (!title) return;

    try {
      const newTask = await createTask({ title, description: "", status: "todo" });
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

  const handleDeleteTask = async (columnId, taskId) => {
    // Optimistically update UI
    setColumns((prev) => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        tasks: prev[columnId].tasks.filter((t) => t.id !== taskId),
      },
    }));
    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error("Failed to delete task:", err);
      // TODO: rollback UI update if needed
    }
  };

  const handleTitleUpdate = async (columnId, taskId, newTitle) => {
    const title = newTitle.trim();
    if (!title) return;

    const updatedTask = updateLocalTask(columnId, taskId, (task) => ({
      ...task,
      title,
    }));
    if (!updatedTask) return;
    try {
      await updateTask(taskId, {
        title: updatedTask.title,
        description: updatedTask.description,
        status: columnId,
      });
    } catch (err) {
      console.error("Failed to rename task:", err);
    }
  };

  const handleDescriptionUpdate = async (columnId, taskId, newDescription) => {
    const updatedTask = updateLocalTask(columnId, taskId, (task) => ({
      ...task,
      description: newDescription,
    }));
    if (!updatedTask) return;
    try {
      await updateTask(taskId, {
        title: updatedTask.title,
        description: updatedTask.description,
        status: columnId,
      });
    } catch (err) {
      console.error("Failed to update task description:", err);
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
      const movedWithUpdates = {
        ...moved,
        status: destination.droppableId,
        description: moved.description || "",
      };
      const destTasks = Array.from(destCol.tasks);
      destTasks.splice(destination.index, 0, movedWithUpdates);
      setColumns({
        ...columns,
        [source.droppableId]: { ...sourceCol, tasks: sourceTasks },
        [destination.droppableId]: { ...destCol, tasks: destTasks },
      });

      try {
        await updateTask(moved.id, {
          title: movedWithUpdates.title,
          description: movedWithUpdates.description,
          status: destination.droppableId,
        });
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
            <Column
              key={id}
              droppableId={id}
              column={column}
              onDelete={handleDeleteTask}
              onTitleUpdate={handleTitleUpdate}
              onDescriptionUpdate={handleDescriptionUpdate}
            />
          ))}
        </div>
      </DragDropContext>
    </>
  );
}
