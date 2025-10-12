import React, { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";

export default function Card({ task, index, onDelete, onRename }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(task.title);

  const commitRename = async () => {
    const title = value.trim();
    if (title && title !== task.title) {
      await onRename(title);
    }
    setIsEditing(false);
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          // Force disable dragging when editing
          {...(!isEditing ? provided.draggableProps : {})}
          {...(!isEditing ? provided.dragHandleProps : {})}
          style={{
            position: "relative",
            background: snapshot.isDragging ? "#e8f4ff" : "#e3f2fd",
            borderRadius: 6,
            padding: 10,
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            userSelect: "none",
            ...provided.draggableProps.style,
          }}
          onDoubleClick={() => {
            setValue(task.title);
            setIsEditing(true);
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete task"
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 22,
              height: 22,
              border: "none",
              borderRadius: 4,
              background: "#ef5350",
              color: "#fff",
              cursor: "pointer",
              lineHeight: "22px",
              textAlign: "center",
              fontSize: 12,
            }}
          >
            ×
          </button>

          {isEditing ? (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setIsEditing(false);
              }}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid #90caf9",
                outline: "none",
              }}
            />
          ) : (
            <div>{task.title}</div>
          )}
        </div>
      )}
    </Draggable>
  );
}
