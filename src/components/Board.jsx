import React from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";

export default function Board({ columns, setColumns }) {
  const onDragEnd = (result) => {
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
        {Object.values(columns).map((column) => (
          <Column key={column.id} droppableId={column.id} column={column} />
        ))}
      </div>
    </DragDropContext>
  );
}
