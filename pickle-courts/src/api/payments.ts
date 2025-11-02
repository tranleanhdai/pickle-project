// src/api/payment.ts
import { api } from "./client";

export const initiateTransfer = (bookingId: string) =>
  api.post("/payments/transfer/initiate", { bookingId }).then((r) => r.data);

export const confirmTransfer = (bookingId: string, proofUrl: string) =>
  api.post("/payments/transfer/confirm", { bookingId, proofUrl }).then((r) => r.data);

export const verifyTransfer = (bookingId: string, success: boolean, bankRef?: string) =>
  api.post("/payments/transfer/verify", { bookingId, success, bankRef }).then((r) => r.data);

// --- NEW: VNPAY ---
export const createVnpayPayment = (bookingId: string, bankCode?: string) =>
  api
    .post("/payments/vnpay/create", { bookingId, bankCode })
    .then((r) => r.data as { url: string; txnRef: string });
