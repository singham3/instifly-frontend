import { useQuery } from "@tanstack/react-query";
import { getAboutMessage } from "../services/aboutService";

export function useAboutMessage() {
  
  return useQuery({
    queryKey: ["about"],
    queryFn: getAboutMessage,
    staleTime: 60 * 1000,
    retry: 1,
  });
}