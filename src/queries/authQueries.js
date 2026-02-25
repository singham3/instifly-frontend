import { useMutation } from "@tanstack/react-query";
import { loginUser } from "../services/authService";

export function useLogin() {
  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
    },
  });
}