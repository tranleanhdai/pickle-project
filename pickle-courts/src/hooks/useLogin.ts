// src/hooks/useLogin.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";

type Body = { username: string; password: string };
type Resp = { token: string; user: any };

export function useLogin() {
  const qc = useQueryClient();

  return useMutation<Resp, any, Body>({
    mutationFn: async (body) => {
      const res = await api.post("/login", body);
      return res.data;
    },
    onSuccess: async (data) => {
      if (data?.token) {
        await AsyncStorage.setItem("token", data.token);

        // 🔁 Làm mới data phụ thuộc token
        qc.invalidateQueries({ queryKey: ["me"] });
        // Invalidate mọi query availability (nếu key bạn đang dùng là ["availability", courtId, date])
        qc.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "availability",
        });
      }
    },
  });
}
