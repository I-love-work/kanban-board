import client from "./client";

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await client.post("/profile/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const updateProfile = async (payload) => {
  const response = await client.patch("/profile", payload);
  return response.data;
};
