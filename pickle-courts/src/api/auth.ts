// pickle-courts/src/api/auth.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./client";

export async function login(username: string, password: string) {
  const { data } = await api.post("/auth/login", { username, password });
  // ✅ lưu token để các request sau (getMe, ...) có Authorization
  if (data?.token) {
    await AsyncStorage.setItem("token", data.token);
  }
  return data as {
    token: string;
    user: { id: string; role: string; name: string; email?: string };
  };
}

export async function register(username: string, email: string, password: string) {
  const { data } = await api.post("/auth/register", { username, email, password });
  return data;
}

export async function requestPasswordReset(email: string) {
  const { data } = await api.post("/auth/password/request", { email });
  return data as { ok: true };
}

export async function confirmPasswordReset(token: string, newPassword: string) {
  const { data } = await api.post("/auth/password/confirm", { token, newPassword });
  return data as { ok: true };
}

export async function getMe() {
  // ✅ Sửa endpoint: /auth/me (vì server mount /api/auth)
  const { data } = await api.get("/auth/me");
  return data as {
    id: string;
    role: "admin" | "user" | "staff";
    name?: string;
    username?: string;
    email?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}
