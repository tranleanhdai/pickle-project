import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export type AdminBooking = {
  _id: string;
  courtId: string;
  courtName?: string;        // 👈 thêm field mới (optional)
  date: string;
  startAt: string;
  endAt: string;
  price: number;
  userId: string;
  note?: string;
};

type Filters = { courtId?: string; date?: string };

export function useAdminBookings(filters: Filters) {
  return useQuery({
    queryKey: ["admin-bookings", filters],
    queryFn: async () => {
      const res = await api.get<AdminBooking[]>("/bookings", { params: filters });
      return res.data;
    },
  });
}

export function useAdminDeleteBooking(filters: Filters) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/bookings/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bookings", filters] }),
  });
}

export function useAdminUpdateNote(filters: Filters) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; note: string }) => {
      const { id, note } = payload;
      const res = await api.patch<AdminBooking>(`/bookings/${id}`, { note });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bookings", filters] }),
  });
}
