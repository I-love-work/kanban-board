// placeholder for future backend integration
import axios from "axios";

const API_URL = "http://localhost:5000";

export const getTasks = async () => (await axios.get(`${API_URL}/tasks`)).data;
export const createTask = async (task) =>
  (await axios.post(`${API_URL}/tasks`, task)).data;
