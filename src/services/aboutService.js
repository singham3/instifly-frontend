import api from "../api/axiosClient";

export async function getAboutMessage() {
  const res = await api.get("/about"); // example: /api/
  return res.data;
}