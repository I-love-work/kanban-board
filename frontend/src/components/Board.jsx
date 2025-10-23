import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import Column from "./Column";
import {
  getTasks,
  updateTask,
  createTask,
  deleteTask,
  uploadAttachment,
  deleteAttachment as removeAttachmentApi,
  createLinkAttachment,
  createTag as createTagApi,
  updateTag as updateTagApi,
  deleteTag as removeTagApi,
} from "../api/taskApi";
import { updateBoard as updateBoardApi } from "../api/boardApi";

const DESCRIPTION_PLACEHOLDER = "Double-click to add a description.";
const LEGACY_DEFAULT_BOARD_DESCRIPTION =
  "Drag tasks between columns to keep work moving.";

export default function Board({
  boardId,
  boardName,
  boardDescription,
  onAuthError,
  onTaskCountChange,
  onBoardDetailsChange,
}) {
  const [columns, setColumns] = useState(() => createInitialColumns());
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const normalizedBoardDescription = useMemo(() => {
    const raw = boardDescription || "";
    if (raw.trim() === LEGACY_DEFAULT_BOARD_DESCRIPTION) {
      return "";
    }
    return raw;
  }, [boardDescription]);
  const [descriptionDraft, setDescriptionDraft] = useState(
    normalizedBoardDescription
  );
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState("");
  const descriptionInputRef = useRef(null);
  const skipNextBlurRef = useRef(false);

  useEffect(() => {
    if (!isEditingDescription) {
      setDescriptionDraft(normalizedBoardDescription);
    }
  }, [isEditingDescription, normalizedBoardDescription]);

  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      const input = descriptionInputRef.current;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, [isEditingDescription]);

  const handleApiError = useCallback(
    (err, context) => {
      console.error(context, err);
      if (err?.response?.status === 401 && typeof onAuthError === "function") {
        onAuthError();
      }
    },
    [onAuthError]
  );

  const saveBoardDescription = useCallback(async () => {
    if (!boardId) {
      setIsEditingDescription(false);
      return;
    }
    const normalizedDraft = descriptionDraft.trim();
    const currentNormalized = normalizedBoardDescription.trim();
    if (currentNormalized === normalizedDraft) {
      setIsEditingDescription(false);
      setDescriptionError("");
      return;
    }
    setIsSavingDescription(true);
    setDescriptionError("");
    try {
      const updated = await updateBoardApi(boardId, {
        description: normalizedDraft,
      });
      const sanitizedDescription =
        (updated.description || "").trim() === LEGACY_DEFAULT_BOARD_DESCRIPTION
          ? ""
          : updated.description || "";
      if (typeof onBoardDetailsChange === "function") {
        onBoardDetailsChange(boardId, {
          description: sanitizedDescription,
        });
      }
      setDescriptionDraft(sanitizedDescription);
      setIsEditingDescription(false);
      skipNextBlurRef.current = false;
    } catch (err) {
      handleApiError(err, "Failed to update board description");
      setDescriptionError("Failed to update board description. Please try again.");
      setTimeout(() => {
        if (descriptionInputRef.current) {
          descriptionInputRef.current.focus();
        }
      }, 0);
    } finally {
      setIsSavingDescription(false);
    }
  }, [
    boardId,
    descriptionDraft,
    handleApiError,
    normalizedBoardDescription,
    onBoardDetailsChange,
  ]);

  const cancelDescriptionEdit = useCallback(() => {
    skipNextBlurRef.current = true;
    setDescriptionDraft(normalizedBoardDescription);
    setDescriptionError("");
    setIsEditingDescription(false);
  }, [normalizedBoardDescription]);

  const handleDescriptionDoubleClick = useCallback(() => {
    if (!boardId || isSavingDescription) {
      return;
    }
    skipNextBlurRef.current = false;
    setDescriptionError("");
    setIsEditingDescription(true);
  }, [boardId, isSavingDescription]);

  const handleDescriptionChange = useCallback((event) => {
    setDescriptionDraft(event.target.value);
  }, []);

  const handleDescriptionKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelDescriptionEdit();
        return;
      }
      if (
        event.key === "Enter" &&
        (event.metaKey || event.ctrlKey) &&
        !isSavingDescription
      ) {
        event.preventDefault();
        skipNextBlurRef.current = true;
        saveBoardDescription();
      }
    },
    [cancelDescriptionEdit, isSavingDescription, saveBoardDescription]
  );

  const handleDescriptionBlur = useCallback(() => {
    if (skipNextBlurRef.current) {
      skipNextBlurRef.current = false;
      return;
    }
    if (!isSavingDescription) {
      saveBoardDescription();
    }
  }, [isSavingDescription, saveBoardDescription]);

  const hasCustomDescription = Boolean(normalizedBoardDescription.trim());
  const displayDescription = hasCustomDescription
    ? normalizedBoardDescription
    : DESCRIPTION_PLACEHOLDER;

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
    let cancelled = false;

    const loadTasks = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        if (!boardId) {
          setColumns(createInitialColumns());
          return;
        }
        const data = await getTasks(boardId);
        if (cancelled) {
          return;
        }
        const normalizeTask = (task) => ({
          ...task,
          description: task.description || "",
          attachments: Array.isArray(task.attachments)
            ? task.attachments
            : [],
          tags: Array.isArray(task.tags) ? task.tags : [],
        });
        const grouped = createInitialColumns();
        data.forEach((task) => {
          const key = grouped[task.status] ? task.status : "todo";
          const updatedTasks = [
            ...grouped[key].tasks,
            normalizeTask(task),
          ];
          grouped[key] = { ...grouped[key], tasks: updatedTasks };
        });
        setColumns(grouped);
      } catch (err) {
        if (!cancelled) {
          setLoadError("Failed to load tasks for this board.");
        }
        handleApiError(err, "Failed to load tasks");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    setColumns(createInitialColumns());
    loadTasks();

    return () => {
      cancelled = true;
    };
  }, [boardId, handleApiError]);

  useEffect(() => {
    if (typeof onTaskCountChange !== "function" || !boardId) {
      return;
    }
    const total = Object.values(columns).reduce(
      (sum, column) => sum + column.tasks.length,
      0
    );
    onTaskCountChange(boardId, total);
  }, [boardId, columns, onTaskCountChange]);

  // Add new task to "To Do" column
  const handleAddTask = async () => {
    const title = newTaskTitle.trim();
    if (!title || !boardId) return;

    try {
      const newTask = await createTask(boardId, {
        title,
        description: "",
        status: "todo",
      });
      setColumns((prev) => ({
        ...prev,
        todo: {
          ...prev.todo,
          tasks: [
            ...prev.todo.tasks,
            {
              ...newTask,
              description: newTask.description || "",
              attachments: newTask.attachments || [],
              tags: newTask.tags || [],
            },
          ],
        },
      }));
      setNewTaskTitle("");
    } catch (err) {
      handleApiError(err, "Failed to create task");
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
      handleApiError(err, "Failed to delete task");
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
      handleApiError(err, "Failed to rename task");
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
      handleApiError(err, "Failed to update task description");
    }
  };

  const appendAttachmentToTask = (columnId, taskId, attachment) => {
    updateLocalTask(columnId, taskId, (task) => ({
      ...task,
      attachments: [...(task.attachments || []), attachment],
    }));
  };

  const removeAttachmentFromTask = (columnId, taskId, attachmentId) => {
    updateLocalTask(columnId, taskId, (task) => ({
      ...task,
      attachments: (task.attachments || []).filter(
        (att) => att.id !== attachmentId
      ),
    }));
  };

  const handleAttachmentUpload = async (columnId, taskId, files) => {
    const fileList = Array.isArray(files) ? files : [files];
    for (const file of fileList) {
      try {
        const attachment = await uploadAttachment(taskId, file);
        appendAttachmentToTask(columnId, taskId, attachment);
      } catch (err) {
        handleApiError(err, "Failed to upload attachment");
      }
    }
  };

  const handleAttachmentLink = async (columnId, taskId, linkData) => {
    try {
      const attachment = await createLinkAttachment(taskId, linkData);
      appendAttachmentToTask(columnId, taskId, attachment);
    } catch (err) {
      handleApiError(err, "Failed to add link attachment");
    }
  };

  const handleAttachmentDelete = async (columnId, taskId, attachment) => {
    try {
      await removeAttachmentApi(attachment.id);
      removeAttachmentFromTask(columnId, taskId, attachment.id);
    } catch (err) {
      handleApiError(err, "Failed to delete attachment");
    }
  };

  const appendTagToTask = (columnId, taskId, tag) => {
    updateLocalTask(columnId, taskId, (task) => ({
      ...task,
      tags: [...(task.tags || []), tag],
    }));
  };

  const updateTagOnTask = (columnId, taskId, tag) => {
    updateLocalTask(columnId, taskId, (task) => ({
      ...task,
      tags: (task.tags || []).map((existing) =>
        existing.id === tag.id ? tag : existing
      ),
    }));
  };

  const removeTagFromTask = (columnId, taskId, tagId) => {
    updateLocalTask(columnId, taskId, (task) => ({
      ...task,
      tags: (task.tags || []).filter((existing) => existing.id !== tagId),
    }));
  };

  const handleTagCreate = async (columnId, taskId, tagData) => {
    try {
      const created = await createTagApi(taskId, tagData);
      appendTagToTask(columnId, taskId, created);
    } catch (err) {
      handleApiError(err, "Failed to create tag");
      throw err;
    }
  };

  const handleTagUpdate = async (columnId, taskId, tagId, tagData) => {
    try {
      const updated = await updateTagApi(tagId, tagData);
      updateTagOnTask(columnId, taskId, updated);
    } catch (err) {
      handleApiError(err, "Failed to update tag");
      throw err;
    }
  };

  const handleTagDelete = async (columnId, taskId, tagId) => {
    try {
      await removeTagApi(tagId);
      removeTagFromTask(columnId, taskId, tagId);
    } catch (err) {
      handleApiError(err, "Failed to delete tag");
      throw err;
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
        attachments: Array.isArray(moved.attachments)
          ? moved.attachments
          : [],
        tags: Array.isArray(moved.tags) ? moved.tags : [],
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
        handleApiError(err, "Failed to update task");
      }
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 12,
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 4px 0" }}>
            {boardName || "Untitled board"}
          </h2>
          {isEditingDescription ? (
            <div style={{ width: "min(440px, 100%)" }}>
              <textarea
                ref={descriptionInputRef}
                value={descriptionDraft}
                onChange={handleDescriptionChange}
                onBlur={handleDescriptionBlur}
                onKeyDown={handleDescriptionKeyDown}
                disabled={isSavingDescription}
                placeholder="Describe this board..."
                style={{
                  width: "100%",
                  minHeight: 72,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                  lineHeight: 1.45,
                  color: "#374151",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 4,
                }}
              >
                <span style={{ color: "#9ca3af", fontSize: 12 }}>
                  Press Esc to cancel, Ctrl/Cmd+Enter to save
                </span>
                {isSavingDescription && (
                  <span style={{ color: "#6b7280", fontSize: 12 }}>
                    Saving...
                  </span>
                )}
              </div>
              {descriptionError && (
                <p
                  style={{
                    margin: "4px 0 0 0",
                    color: "#dc2626",
                    fontSize: 12,
                  }}
                >
                  {descriptionError}
                </p>
              )}
            </div>
          ) : (
            <>
              <p
                onDoubleClick={handleDescriptionDoubleClick}
                style={{
                  margin: 0,
                  color: "#6b7280",
                  fontSize: 14,
                  cursor: boardId ? "text" : "default",
                  fontStyle: hasCustomDescription ? "normal" : "italic",
                  userSelect: "text",
                }}
              >
                {displayDescription}
              </p>
              {descriptionError && (
                <p
                  style={{
                    margin: "4px 0 0 0",
                    color: "#dc2626",
                    fontSize: 12,
                  }}
                >
                  {descriptionError}
                </p>
              )}
            </>
          )}
        </div>
      </div>

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
          disabled={isLoading}
          style={{
            width: "300px",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? "not-allowed" : "text",
          }}
        />
        <button
          onClick={handleAddTask}
          disabled={!newTaskTitle.trim() || !boardId || isLoading}
          style={{
            padding: "8px 14px",
            border: "none",
            borderRadius: "6px",
            backgroundColor: "#1976d2",
            color: "white",
            cursor:
              !newTaskTitle.trim() || !boardId || isLoading
                ? "not-allowed"
                : "pointer",
            opacity:
              !newTaskTitle.trim() || !boardId || isLoading ? 0.6 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          Add Task
        </button>
      </div>

      {loadError ? (
        <div
          style={{
            maxWidth: 480,
            margin: "20px auto 0",
            background: "#fee2e2",
            color: "#b91c1c",
            padding: "12px 16px",
            borderRadius: 8,
            border: "1px solid #fecaca",
            textAlign: "center",
          }}
        >
          {loadError}
        </div>
      ) : null}

      {isLoading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 18,
            color: "#6b7280",
            fontSize: 15,
          }}
        >
          Loading tasks...
        </div>
      ) : null}

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
              onAttachmentUpload={handleAttachmentUpload}
              onAttachmentLink={handleAttachmentLink}
              onAttachmentDelete={handleAttachmentDelete}
              onTagCreate={handleTagCreate}
              onTagUpdate={handleTagUpdate}
              onTagDelete={handleTagDelete}
            />
          ))}
        </div>
      </DragDropContext>
    </>
  );
}

const createInitialColumns = () => ({
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
});
