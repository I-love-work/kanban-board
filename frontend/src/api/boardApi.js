import client from "./client";

export const getBoards = async () => (await client.get("/boards")).data;

export const createBoard = async (payload) =>
  (await client.post("/boards", payload)).data;

export const getBoard = async (boardId) =>
  (await client.get(`/boards/${boardId}`)).data;
