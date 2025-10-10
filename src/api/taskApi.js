import axios from "axios";
const API_URL = "http://localhost:5050/api";

export const getTasks = async () => (await axios.get(`${API_URL}/tasks`)).data;
export const createTask = async (task) =>
  (await axios.post(`${API_URL}/tasks`, task)).data;
export const updateTask = async (id, data) =>
  (await axios.put(`${API_URL}/tasks/${id}`, data)).data;
export const deleteTask = async (id) =>
  (await axios.delete(`${API_URL}/tasks/${id}`)).data;
