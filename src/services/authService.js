import api from "../api/axiosClient";

export async function loginUser(data) {
  const res = await api.post("/token/", data);
  return res.data;
}