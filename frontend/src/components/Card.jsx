import React, { useEffect, useState } from "react";
import { Draggable } from "@hello-pangea/dnd";

export default function Card({
  task,
  index,
  onDelete,
  onTitleEdit,
  onDescriptionEdit,
}) {
  const [editingField, setEditingField] = useState(null);
  const [titleValue, setTitleValue] = useState(task.title);
  const [descriptionValue, setDescriptionValue] = useState(
    task.description || ""
  );

  useEffect(() => {
    setTitleValue(task.title);
  }, [task.title]);

  useEffect(() => {
    setDescriptionValue(task.description || "");
  }, [task.description]);

  const isEditing = editingField !== null;

  const commitTitle = async () => {
    const nextTitle = titleValue.trim();
    if (!nextTitle) {
      setTitleValue(task.title);
    } else if (nextTitle !== task.title) {
      await onTitleEdit(nextTitle);
    }
    setEditingField(null);
  };

  const commitDescription = async () => {
    const nextDescription = descriptionValue;
    if (nextDescription !== (task.description || "")) {
      await onDescriptionEdit(nextDescription);
    }
    setEditingField(null);
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
        >
          {!isEditing && (
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
          )}

          <div
            onDoubleClick={() => {
              setTitleValue(task.title);
              setEditingField("title");
            }}
          >
            {editingField === "title" ? (
              <input
                autoFocus
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTitle();
                  if (e.key === "Escape") {
                    setTitleValue(task.title);
                    setEditingField(null);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 4,
                  border: "1px solid #90caf9",
                  outline: "none",
                  fontWeight: 600,
                }}
              />
            ) : (
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                {task.title}
              </div>
            )}
          </div>

          <div
            onDoubleClick={() => {
              setDescriptionValue(task.description || "");
              setEditingField("description");
            }}
          >
            {editingField === "description" ? (
              <textarea
                autoFocus
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                onBlur={commitDescription}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    commitDescription();
                  }
                  if (e.key === "Escape") {
                    setDescriptionValue(task.description || "");
                    setEditingField(null);
                  }
                }}
                rows={3}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: 4,
                  border: "1px solid #90caf9",
                  outline: "none",
                  resize: "vertical",
                  fontSize: 14,
                  lineHeight: 1.4,
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: task.description ? "#1a237e" : "#546e7a",
                  whiteSpace: "pre-wrap",
                }}
              >
                {task.description
                  ? task.description
                  : "Double click to edit description…"}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
