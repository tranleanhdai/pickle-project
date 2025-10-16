// src/hooks/useRegister.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";

type Body = { username: string; email: string; password: string };
type Resp = { token: string; user: any };

export function useRegister() {
  const qc = useQueryClient();

  return useMutation<Resp, any, Body>({
    mutationFn: async (body) => {
      const res = await api.post("/auth/register", body); // đổi endpoint
      return res.data;
    },
    onSuccess: async (data) => {
      if (data?.token) {
        await AsyncStorage.setItem("token", data.token);
        qc.invalidateQueries({ queryKey: ["me"] });
        qc.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "availability",
        });
      }
    },
  });
}
