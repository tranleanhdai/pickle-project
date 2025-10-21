// pickle-courts/src/api/client.ts
import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef<any>();

// KHÔNG tự động lấy IP. Dev sửa FALLBACK/DEV_HOST theo mạng LAN.
const FALLBACK = "http://192.168.1.93:3000";           // 👈 sửa IP LAN của bạn nếu cần
const DEV_HOST = process.env.EXPO_PUBLIC_DEV_HOST;    // ví dụ: 192.168.1.4

const ROOT = __DEV__
  ? ((DEV_HOST ? `http://${DEV_HOST}:3000` : FALLBACK).replace(/\/+$/, ""))
  : (process.env.EXPO_PUBLIC_API_URL as string).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: `${ROOT}/api`,
  timeout: 10000,
});

console.log("API_ROOT =", ROOT);
console.log("api baseURL =", api.getUri());

// attach token
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    const headers = (config.headers ?? new AxiosHeaders()) as AxiosHeaders;
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

// 401 -> logout
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error?.response?.status === 401) {
      await AsyncStorage.removeItem("token");
      if (navigationRef.isReady()) navigationRef.navigate("Login");
    }
    return Promise.reject(error);
  }
);
