import React, { useEffect, useRef, useState } from "react";
import { Draggable } from "@hello-pangea/dnd";

const formatFileSize = (size) => {
  if (!size || size <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`;
};

const resolveAttachmentUrl = (attachment) => attachment?.url || "#";

export default function Card({
  task,
  index,
  onDelete,
  onTitleEdit,
  onDescriptionEdit,
  onAttachmentUpload,
  onAttachmentLink,
  onAttachmentDelete,
}) {
  const [editingField, setEditingField] = useState(null);
  const [titleValue, setTitleValue] = useState(task.title);
  const [descriptionValue, setDescriptionValue] = useState(
    task.description || ""
  );
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [isDropActive, setIsDropActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [pendingAttachmentId, setPendingAttachmentId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setTitleValue(task.title);
  }, [task.title]);

  useEffect(() => {
    setDescriptionValue(task.description || "");
  }, [task.description]);

  const attachments = Array.isArray(task.attachments) ? task.attachments : [];

  const isEditing = editingField !== null;
  const disableDrag =
    isEditing ||
    isAddingLink ||
    isUploading ||
    isSavingLink ||
    isDropActive ||
    pendingAttachmentId;

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

  const handleFileSelection = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setIsUploading(true);
    try {
      await onAttachmentUpload(files);
    } catch (err) {
      console.error("Failed to upload attachment:", err);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleLinkSubmit = async (event) => {
    event.preventDefault();
    const url = linkUrl.trim();
    if (!url) return;

    setIsSavingLink(true);
    try {
      await onAttachmentLink({
        url,
        name: linkName.trim() || undefined,
      });
      setLinkUrl("");
      setLinkName("");
      setIsAddingLink(false);
    } catch (err) {
      console.error("Failed to add link attachment:", err);
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleAttachmentRemove = async (attachment) => {
    setPendingAttachmentId(attachment.id);
    try {
      await onAttachmentDelete(attachment);
    } catch (err) {
      console.error("Failed to delete attachment:", err);
    } finally {
      setPendingAttachmentId(null);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDropActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsDropActive(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDropActive(false);

    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length) {
      setIsUploading(true);
      try {
        await onAttachmentUpload(files);
      } catch (err) {
        console.error("Failed to upload attachment:", err);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    const droppedUrl =
      event.dataTransfer?.getData("text/uri-list") ||
      event.dataTransfer?.getData("text/plain") ||
      "";
    const normalizedUrl = droppedUrl.trim();
    if (normalizedUrl) {
      setIsSavingLink(true);
      try {
        await onAttachmentLink({ url: normalizedUrl, name: normalizedUrl });
      } catch (err) {
        console.error("Failed to attach link:", err);
      } finally {
        setIsSavingLink(false);
      }
    }
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...(!disableDrag ? provided.draggableProps : {})}
          {...(!disableDrag ? provided.dragHandleProps : {})}
          style={{
            position: "relative",
            background: snapshot.isDragging
              ? "#e8f4ff"
              : isDropActive
              ? "#fffde7"
              : "#e3f2fd",
            borderRadius: 6,
            padding: 10,
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            userSelect: "none",
            opacity: disableDrag && snapshot.isDragging ? 0.7 : 1,
            ...provided.draggableProps.style,
          }}
        >
          {!disableDrag && (
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
                  : "Double-click to add a description..."}
              </div>
            )}
          </div>

          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              marginTop: 12,
              padding: 8,
              borderRadius: 6,
              border: isDropActive
                ? "2px dashed #1976d2"
                : "1px dashed #90caf9",
              background: isDropActive
                ? "rgba(25,118,210,0.08)"
                : "rgba(144,202,249,0.25)",
              transition: "background 0.2s ease, border 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                Attachments (drag files or links)
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    border: "1px solid #1976d2",
                    background: "#1976d2",
                    color: "#fff",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingLink(true);
                    setEditingField(null);
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    border: "1px solid #1976d2",
                    background: "#fff",
                    color: "#1976d2",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Add Link
                </button>
              </div>
            </div>

            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileSelection}
              style={{ display: "none" }}
            />

            {isAddingLink && (
              <form
                onSubmit={handleLinkSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <input
                  autoFocus
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="Paste link URL..."
                  style={{
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid #90caf9",
                  }}
                />
                <input
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="Display name (optional)"
                  style={{
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid #cfd8dc",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingLink(false);
                      setLinkUrl("");
                      setLinkName("");
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: "1px solid #cfd8dc",
                      background: "#fff",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingLink}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: "none",
                      background: "#1976d2",
                      color: "#fff",
                      fontSize: 12,
                      cursor: "pointer",
                      opacity: isSavingLink ? 0.7 : 1,
                    }}
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {attachments.length === 0 && !isAddingLink ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "#607d8b",
                    textAlign: "center",
                  }}
                >
                  Drag files, screenshots, or paste cloud links here
                </div>
              ) : (
                attachments.map((attachment) => {
                  const isImage =
                    attachment.type === "file" &&
                    attachment.mimeType &&
                    attachment.mimeType.startsWith("image/");
                  return (
                    <div
                      key={attachment.id}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                        borderRadius: 6,
                        border: "1px solid rgba(25,118,210,0.2)",
                        background: "#fff",
                        padding: 6,
                      }}
                    >
                      <div style={{ width: 48, flexShrink: 0 }}>
                        {isImage ? (
                          <img
                            src={resolveAttachmentUrl(attachment)}
                            alt={attachment.name}
                            style={{
                              width: 48,
                              height: 48,
                              objectFit: "cover",
                              borderRadius: 4,
                              border: "1px solid #e0e0e0",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 4,
                              background: "#e3f2fd",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 20,
                            }}
                          >
                            {attachment.type === "link" ? "🔗" : "📎"}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <a
                          href={resolveAttachmentUrl(attachment)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "block",
                            fontWeight: 500,
                            color: "#0d47a1",
                            textDecoration: "none",
                            wordBreak: "break-word",
                            marginBottom: 4,
                          }}
                        >
                          {attachment.name}
                        </a>
                        <div style={{ fontSize: 11, color: "#78909c" }}>
                          {attachment.type === "file"
                            ? `${attachment.mimeType || ""} ${
                                attachment.size
                                  ? `• ${formatFileSize(attachment.size)}`
                                  : ""
                              }`
                            : attachment.url}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAttachmentRemove(attachment)}
                        disabled={pendingAttachmentId === attachment.id}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          border: "none",
                          background: "#ef5350",
                          color: "#fff",
                          fontSize: 12,
                          cursor: "pointer",
                          opacity:
                            pendingAttachmentId === attachment.id ? 0.6 : 1,
                        }}
                      >
                        delete
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
