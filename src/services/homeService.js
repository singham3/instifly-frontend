import api from "../api/axiosClient";

export async function getWelcomeMessage() {
  const res = await api.get("/"); // example: /api/
  console.log("Welcome message response:", res.data);
  return res.data;
}