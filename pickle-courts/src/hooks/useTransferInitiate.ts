// src/hooks/useTransferInitiate.ts
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";

export type TransferInitiateVars = {
  bookingId: string;
  amount: number;
};

export type TransferInitiateResp = {
  id: string; // memoCode (map như backend trả)
  amount: number;
  memoCode?: string;
  bank?: { name: string; accountNumber: string; accountName: string };
  vietqr?: { url?: string };
};

export function useTransferInitiate() {
  return useMutation<TransferInitiateResp, any, TransferInitiateVars>({
    mutationFn: async (vars) => {
      const { data } = await api.post("/payments/transfer/initiate", vars);
      return data as TransferInitiateResp;
    },
  });
}
