// src/hooks/useAdminTransfers.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { verifyTransfer } from "../api/payments";

export type AdminTransferItem = {
  _id: string;
  courtId: string;
  courtName?: string;
  userId: string;
  date: string;      // YYYY-MM-DD
  startAt: string;   // HH:mm
  endAt: string;     // HH:mm
  price: number;
  note?: string;
  paymentMethod: "prepay_transfer" | "pay_later";
  paymentStatus: "verifying" | "awaiting_transfer" | "paid" | "failed" | "pending" | "expired";
  transfer?: {
    memoCode?: string;
    proofUrl?: string;
    bankRef?: string;
    amountExpected?: number;
    verifiedBy?: string;
    verifiedAt?: string;
  };
  createdAt: string;
};

const key = ["admin-transfers", "verifying"] as const;

export function useAdminTransfers() {
  return useQuery<AdminTransferItem[]>({
    queryKey: key,
    queryFn: async () => {
      const { data } = await api.get("/bookings", { params: { paymentStatus: "verifying" } });
      // server trả cả list (admin thấy tất cả). Sort theo createdAt mới nhất lên đầu:
      return (data as any[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    refetchInterval: 10_000, // auto refresh 10s/lần
  });
}

export function useVerifyTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { bookingId: string; success: boolean; bankRef?: string }) =>
      verifyTransfer(vars.bookingId, vars.success, vars.bankRef),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
