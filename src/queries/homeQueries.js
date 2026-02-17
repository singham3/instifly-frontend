import { useQuery } from "@tanstack/react-query";
import { getWelcomeMessage } from "../services/homeService";

export function useWelcomeMessage() {
  
  return useQuery({
    queryKey: ["welcome"],
    queryFn: getWelcomeMessage,
    staleTime: 60 * 1000,
    retry: 1,
  });
}