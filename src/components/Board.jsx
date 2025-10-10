import React, { useEffect } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";
import { getTasks, updateTask } from "../api/taskApi";

export default function Board({ columns, setColumns }) {
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
  );
}
