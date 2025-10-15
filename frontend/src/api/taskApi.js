import axios from "axios";

export const API_URL = "http://localhost:5050/api";
export const API_ORIGIN = API_URL.replace(/\/api$/, "");

export const getTasks = async () => (await axios.get(`${API_URL}/tasks`)).data;

export const createTask = async (task) =>
  (await axios.post(`${API_URL}/tasks`, task)).data;

export const updateTask = async (id, data) =>
  (await axios.put(`${API_URL}/tasks/${id}`, data)).data;

export const deleteTask = async (id) =>
  (await axios.delete(`${API_URL}/tasks/${id}`)).data;

export const uploadAttachment = async (taskId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.post(
    `${API_URL}/tasks/${taskId}/attachments/upload`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return response.data;
};

export const createLinkAttachment = async (taskId, data) =>
  (await axios.post(`${API_URL}/tasks/${taskId}/attachments/link`, data)).data;

export const deleteAttachment = async (attachmentId) =>
  (await axios.delete(`${API_URL}/attachments/${attachmentId}`)).data;

export const createTag = async (taskId, data) =>
  (await axios.post(`${API_URL}/tasks/${taskId}/tags`, data)).data;

export const updateTag = async (tagId, data) =>
  (await axios.put(`${API_URL}/tags/${tagId}`, data)).data;

export const deleteTag = async (tagId) =>
  (await axios.delete(`${API_URL}/tags/${tagId}`)).data;
