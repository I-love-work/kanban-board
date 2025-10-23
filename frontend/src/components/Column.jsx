import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import Card from "./Card";

export default function Column({
  droppableId,
  column,
  onDelete,
  onTitleUpdate,
  onDescriptionUpdate,
  onColorUpdate,
  onAttachmentUpload,
  onAttachmentLink,
  onAttachmentDelete,
  onTagCreate,
  onTagUpdate,
  onTagDelete,
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        padding: 12,
        width: 260,
        minHeight: 420,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <h3 style={{ textAlign: "center", marginTop: 0 }}>{column.name}</h3>
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: 320,
              padding: 4,
              borderRadius: 6,
              background: snapshot.isDraggingOver ? "#f0f7ff" : "transparent",
              transition: "background 0.2s ease",
            }}
          >
            {column.tasks.map((task, index) => (
              <Card
                key={task.id}
                task={task}
                index={index}
                onDelete={() => onDelete(droppableId, task.id)}
                onTitleEdit={(title) => onTitleUpdate(droppableId, task.id, title)}
                onDescriptionEdit={(description) =>
                  onDescriptionUpdate(droppableId, task.id, description)
                }
                onColorChange={(color) =>
                  onColorUpdate(droppableId, task.id, color)
                }
                onAttachmentUpload={(files) =>
                  onAttachmentUpload(droppableId, task.id, files)
                }
                onAttachmentLink={(data) =>
                  onAttachmentLink(droppableId, task.id, data)
                }
                onAttachmentDelete={(attachment) =>
                  onAttachmentDelete(droppableId, task.id, attachment)
                }
                onTagCreate={(tagData) =>
                  onTagCreate(droppableId, task.id, tagData)
                }
                onTagUpdate={(tagId, tagData) =>
                  onTagUpdate(droppableId, task.id, tagId, tagData)
                }
                onTagDelete={(tagId) => onTagDelete(droppableId, task.id, tagId)}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
