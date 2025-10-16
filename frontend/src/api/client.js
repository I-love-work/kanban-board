import axios from "axios";

export const API_URL = "http://localhost:5050/api";
export const API_ORIGIN = API_URL.replace(/\/api$/, "");
export const TOKEN_STORAGE_KEY = "kanban_auth_token";

export const getStoredToken = () => {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to read auth token from storage", err);
    return null;
  }
};

export const setStoredToken = (token) => {
  try {
    if (typeof window === "undefined") return;
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (err) {
    console.error("Failed to persist auth token", err);
  }
};

export const clearStoredToken = () => setStoredToken(null);

const client = axios.create({
  baseURL: API_URL,
});

client.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default client;
