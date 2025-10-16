import React, { useCallback, useEffect, useState } from "react";
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

export default function Board({ columns, setColumns, onAuthError }) {
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const handleApiError = useCallback(
    (err, context) => {
      console.error(context, err);
      if (err?.response?.status === 401 && typeof onAuthError === "function") {
        onAuthError();
      }
    },
    [onAuthError]
  );

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
        const normalizeTask = (task) => ({
          ...task,
          description: task.description || "",
          attachments: Array.isArray(task.attachments) ? task.attachments : [],
          tags: Array.isArray(task.tags) ? task.tags : [],
        });
        const grouped = {
          todo: {
            id: "todo",
            name: "To Do",
            tasks: data
              .filter((t) => t.status === "todo")
              .map(normalizeTask),
          },
          inprogress: {
            id: "inprogress",
            name: "In Progress",
            tasks: data
              .filter((t) => t.status === "inprogress")
              .map(normalizeTask),
          },
          done: {
            id: "done",
            name: "Done",
            tasks: data
              .filter((t) => t.status === "done")
              .map(normalizeTask),
          },
        };
        setColumns(grouped);
      } catch (err) {
        handleApiError(err, "Failed to load tasks");
      }
    }
    fetchTasks();
  }, [setColumns, handleApiError]);

  // Add new task to "To Do" column
  const handleAddTask = async () => {
    const title = newTaskTitle.trim();
    if (!title) return;

    try {
      const newTask = await createTask({
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
