// pickle-courts/src/hooks/useMe.ts
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../api/auth";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,         // getMe phải gọi /auth/me (xem lưu ý dưới)
    staleTime: 60_000,
    retry: 1,
  });
}
