// src/hooks/useAvailability.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

type AvailSlot = {
  id?: string;
  courtId: string;
  date: string;       // YYYY-MM-DD
  startAt: string;    // ISO or HH:mm (theo backend của bạn)
  endAt: string;
  price?: number;
  isBooked?: boolean;
};

type MyBooking = {
  _id: string;
  courtId: string;
  date: string;       // YYYY-MM-DD
  startAt: string;
  endAt: string;
  note?: string;
};

const k = (x: { courtId: string; date: string; startAt: string; endAt: string }) =>
  `${x.courtId}|${x.date}|${x.startAt.trim()}|${x.endAt.trim()}`;

async function getAvailability(courtId: string, date: string) {
  console.log("[useAvailability] GET /availability", { courtId, date });
  const r = await api.get("/availability", { params: { courtId, date } });
  return r.data as AvailSlot[];
}
async function getMyBookings(courtId: string, date: string) {
  console.log("[useAvailability] GET /bookings", { courtId, date });
  const r = await api.get("/bookings", { params: { courtId, date } });
  return r.data as MyBooking[];
}

/**
 * Trả về { slots, isLoading, error }.
 * - Chỉ fetch khi có đủ courtId & date
 * - /bookings lỗi (401, v.v.) sẽ bị "nuốt" và coi như không có booking của tôi.
 */
export function useAvailability(courtId?: string, date?: string) {
  const enabled = !!courtId && !!date;

  const availQ = useQuery({
    queryKey: ["availability", courtId, date],
    queryFn: () => getAvailability(courtId as string, date as string),
    enabled,
  });

  const mineQ = useQuery({
    queryKey: ["bookings", courtId, date],
    queryFn: () => getMyBookings(courtId as string, date as string),
    enabled,
    // Nếu chưa đăng nhập hoặc API không hỗ trợ filter -> dễ 401/400.
    // Đừng retry/đừng bubble lỗi để không phá UI.
    retry: false,
  });

  const slots = useMemo(() => {
    const avail = availQ.data ?? [];
    const mine = (mineQ.data ?? []).map((b) => ({ ...b, __k: k(b) }));
    const merged = avail.map((s) => {
      const hit = mine.find((m) => m.__k === k(s));
      return {
        ...s,
        bookingId: hit?._id ?? null,
        bookedByMe: !!hit,
        note: hit?.note ?? "",
      };
    });
    // DEBUG: xem 3 phần tử đầu
    if (merged.length) console.log("[useAvailability] merged sample:", merged.slice(0, 3));
    return merged;
  }, [availQ.data, mineQ.data]);

  // Nếu /bookings fail thì chỉ báo lỗi của availability
  const error = availQ.error ?? null;

  return {
    slots,
    isLoading: enabled ? (availQ.isLoading || mineQ.isLoading) : false,
    error,
    refetch: availQ.refetch,
  };
}
