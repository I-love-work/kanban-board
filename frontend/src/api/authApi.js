import client, { clearStoredToken, setStoredToken } from "./client";

export const register = async (payload) => {
  const response = await client.post("/auth/register", payload);
  return response.data;
};

export const login = async (payload) => {
  const response = await client.post("/auth/login", payload);
  return response.data;
};

export const fetchCurrentUser = async () => {
  const response = await client.get("/auth/me");
  return response.data;
};

export const persistAuth = (token) => {
  setStoredToken(token);
};

export const clearAuth = () => {
  clearStoredToken();
};
