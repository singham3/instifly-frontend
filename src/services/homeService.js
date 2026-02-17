import api from "../api/axiosClient";

export async function getWelcomeMessage() {
  const res = await api.get("/"); // example: /api/
  return res.data;
}