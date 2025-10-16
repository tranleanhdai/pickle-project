import { api } from "./client";

/**
 * Tạo booking
 * - opts.idempotencyKey -> gắn vào header "Idempotency-Key"
 */
export async function createBooking(
  payload: {
    courtId: string;
    date: string;
    startAt: string;
    endAt: string;
    price: number;
    note?: string;
    paymentMethod: "prepay_transfer" | "pay_later";
    paymentId?: string; // chỉ khi prepay_transfer đã có mã
  },
  opts?: { idempotencyKey?: string }
) {
  const headers: Record<string, string> = {};
  if (opts?.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  const { data } = await api.post("/bookings", payload, { headers });
  return data;
}

/** Lấy danh sách booking (của user hiện tại nếu không phải admin) */
export async function listMyBookings() {
  const { data } = await api.get("/bookings");
  return Array.isArray(data) ? data : data?.items ?? [];
}

/** Hủy booking */
export async function cancelBooking(id: string) {
  const { data } = await api.delete(`/bookings/${id}`);
  return data;
}

/** Cập nhật ghi chú booking */
export async function updateBookingNote(id: string, note: string) {
  const { data } = await api.patch(`/bookings/${id}`, { note });
  return data;
}
