import client, { API_ORIGIN, API_URL } from "./client";

export { API_URL, API_ORIGIN };

export const getTasks = async (boardId) =>
  (
    await client.get("/tasks", {
      params: { boardId },
    })
  ).data;

export const createTask = async (boardId, task) =>
  (
    await client.post("/tasks", {
      ...task,
      boardId,
    })
  ).data;

export const updateTask = async (id, data) =>
  (await client.put(`/tasks/${id}`, data)).data;

export const deleteTask = async (id) =>
  (await client.delete(`/tasks/${id}`)).data;

export const uploadAttachment = async (taskId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await client.post(
    `/tasks/${taskId}/attachments/upload`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return response.data;
};

export const createLinkAttachment = async (taskId, data) =>
  (await client.post(`/tasks/${taskId}/attachments/link`, data)).data;

export const deleteAttachment = async (attachmentId) =>
  (await client.delete(`/attachments/${attachmentId}`)).data;

export const createTag = async (taskId, data) =>
  (await client.post(`/tasks/${taskId}/tags`, data)).data;

export const updateTag = async (tagId, data) =>
  (await client.put(`/tags/${tagId}`, data)).data;

export const deleteTag = async (tagId) =>
  (await client.delete(`/tags/${tagId}`)).data;
