import axios from "axios";
import Constants from "expo-constants";

const c: any = Constants;
const API_URL =
  c.expoConfig?.extra?.apiUrl ??
  c.manifest?.extra?.apiUrl ??
  "http://192.168.1.174:3000"; // fallback cuối

console.log("API_URL USES =>", API_URL);

export const api = axios.create({
  baseURL: API_URL + "/api",
  timeout: 10000,
});

// log lỗi để bắt nhanh
api.interceptors.response.use(
  (r) => r,
  (err) => {
    console.log("API ERROR =>", JSON.stringify({
      url: err.config?.baseURL + err.config?.url,
      message: err.message,
      code: err.code,
      response: err.response?.status,
      data: err.response?.data,
    }, null, 2));
    return Promise.reject(err);
  }
);
