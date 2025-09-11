import { api } from "./client";

export async function createBooking(payload:{
  courtId: string; date: string; startAt: string; endAt: string; price: number; userId?: string; note?: string;
}) {
  const { data } = await api.post("/bookings", payload);
  return data;
}

export async function cancelBooking(id: string) {
  const { data } = await api.delete(`/bookings/${id}`);
  return data;
}

export async function updateBookingNote(id: string, note: string) {
  const { data } = await api.patch(`/bookings/${id}`, { note });
  return data;
}
