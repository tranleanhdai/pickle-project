// src/hooks/useMyBookings.ts
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "../api/client";
import { useMemo } from "react";

/* ======================= Types ======================= */
export type PaymentMethod = "prepay_transfer" | "pay_later";
export type PaymentStatus =
  | "pending"
  | "awaiting_transfer"
  | "verifying"
  | "paid"
  | "failed"
  | "expired";

export type Booking = {
  id: string;
  userId?: string;
  courtId: string;
  courtName?: string;        // server trả kèm trong /bookings/me
  venueName?: string;        // optional (nếu backend trả)
  date: string;              // YYYY-MM-DD
  startAt: string;           // "HH:mm"
  endAt: string;             // "HH:mm"
  price: number;
  note?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  holdUntil?: string | Date | null;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
};

/* ======================= Fetcher ======================= */
async function fetchMyBookings(): Promise<Booking[]> {
  const r = await api.get("/bookings/me"); // <— dùng /me
  const raw = Array.isArray(r.data) ? r.data : r.data?.items ?? [];
  return (raw as any[]).map((b) => ({
    id: String(b.id ?? b._id ?? ""),
    userId: b.userId ? String(b.userId) : undefined,
    courtId: String(b.courtId ?? ""),
    courtName: b.courtName,
    venueName: b.venueName,
    date: String(b.date ?? ""),
    startAt: String(b.startAt ?? ""),
    endAt: String(b.endAt ?? ""),
    price: Number(b.price ?? 0),
    note: typeof b.note === "string" ? b.note : "",
    paymentMethod: (b.paymentMethod ?? "pay_later") as PaymentMethod,
    paymentStatus: (b.paymentStatus ?? "pending") as PaymentStatus,
    holdUntil: b.holdUntil ?? null,
    createdAt: b.createdAt ? String(b.createdAt) : undefined,
    updatedAt: b.updatedAt ? String(b.updatedAt) : undefined,
    ...b,
  }));
}

/* ======================= Hook ======================= */
export function useMyBookings() {
  return useQuery<Booking[], Error>({
    queryKey: ["my-bookings"],
    queryFn: fetchMyBookings,
    staleTime: 30_000,
    retry: 1,
    // v5: thay keepPreviousData bằng placeholderData
    placeholderData: keepPreviousData,
  });
}

/* ======================= UI helpers ======================= */
export function bookingDisplayName(b: Booking): string {
  return b.courtName || "—";
}

export function bookingDisplayDate(b: Booking): string {
  return b.date ? dayjs(b.date).format("DD/MM/YYYY") : "—";
}

export function bookingTimeRange(b: Booking): string {
  if (b.startAt && b.endAt) return `${b.startAt} - ${b.endAt}`;
  return b.startAt || "—";
}

/** so sánh theo thời điểm BẮT ĐẦU (dùng cho sort list) */
export function compareByDateStartAsc(a: Booking, b: Booking) {
  const ta = dayjs(`${a.date} ${a.startAt}`, "YYYY-MM-DD HH:mm").valueOf();
  const tb = dayjs(`${b.date} ${b.startAt}`, "YYYY-MM-DD HH:mm").valueOf();
  return ta - tb;
}
export function compareByDateStartDesc(a: Booking, b: Booking) {
  const ta = dayjs(`${a.date} ${a.startAt}`, "YYYY-MM-DD HH:mm").valueOf();
  const tb = dayjs(`${b.date} ${b.startAt}`, "YYYY-MM-DD HH:mm").valueOf();
  return tb - ta;
}

/** Chia Sắp tới / Đã qua theo thời điểm KẾT THÚC (endAt) */
export function partitionUpcomingPast(items: Booking[]) {
  const now = dayjs();
  const upcoming: Booking[] = [];
  const past: Booking[] = [];

  for (const b of items) {
    const end = dayjs(`${b.date} ${b.endAt}`, "YYYY-MM-DD HH:mm");
    (end.isAfter(now) ? upcoming : past).push(b);
  }
  return { upcoming, past };
}

/** Lấy N booking gần nhất (sort theo start desc) */
export function useRecentBookings(limit = 3) {
  const q = useMyBookings();
  const data = useMemo(() => {
    const items = q.data ?? [];
    return items.slice().sort(compareByDateStartDesc).slice(0, limit);
  }, [q.data, limit]);

  return {
    data,
    isLoading: q.isLoading,
    isRefetching: q.isRefetching,
    refetch: q.refetch,
    error: q.error,
  };
}
