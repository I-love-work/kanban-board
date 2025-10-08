import React from "react";
import { Draggable } from "@hello-pangea/dnd";

export default function Card({ task, index }) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            background: snapshot.isDragging ? "#e8f4ff" : "#e3f2fd",
            borderRadius: 6,
            padding: 10,
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            userSelect: "none",
            ...provided.draggableProps.style,
          }}
        >
          {task.title}
        </div>
      )}
    </Draggable>
  );
}
