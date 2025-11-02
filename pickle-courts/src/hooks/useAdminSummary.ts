// src/hooks/useAdminSummary.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export type AdminSummaryParams = {
  venueId?: string;
  courtId?: string;
  mode?: "past" | "day";
  date?: string;          // YYYY-MM-DD (khi mode=day)
};

export type AdminSummary = { count: number; revenue: number };

export function useAdminSummary(params: AdminSummaryParams) {
  return useQuery<AdminSummary>({
    queryKey: ["admin-summary", params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.venueId) qs.set("venueId", params.venueId);
      if (params.courtId) qs.set("courtId", params.courtId);
      if (params.mode) qs.set("mode", params.mode);
      if (params.date) qs.set("date", params.date);
      const { data } = await api.get(`/admin/bookings/summary?${qs.toString()}`);
      return (data ?? { count: 0, revenue: 0 }) as AdminSummary;
    },
    staleTime: 30_000,
  });
}
