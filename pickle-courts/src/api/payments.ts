// src/api/payment.ts
import { api } from "./client";

export const initiateTransfer = (bookingId: string) =>
  api.post("/payments/transfer/initiate", { bookingId }).then((r) => r.data);

// User báo đã chuyển + ảnh biên lai -> chuyển trạng thái 'verifying'
export const confirmTransfer = (bookingId: string, proofUrl: string) =>
  api.post("/payments/transfer/confirm", { bookingId, proofUrl }).then((r) => r.data);

// Admin duyệt kết quả chuyển khoản
export const verifyTransfer = (bookingId: string, success: boolean, bankRef?: string) =>
  api.post("/payments/transfer/verify", { bookingId, success, bankRef }).then((r) => r.data);
