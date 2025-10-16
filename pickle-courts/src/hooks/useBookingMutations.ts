// src/hooks/useBookingMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBooking, cancelBooking, updateBookingNote } from "../api/booking";
import type { Slot } from "../types/slot";

const bookingsKey = (courtId: string, date: string) =>
  ["bookings", courtId, date] as const;
const availKey = (courtId: string, date: string) =>
  ["availability", courtId, date] as const;

type BookPayload = {
  slot: Slot;
  note?: string;
  paymentMethod: "prepay_transfer" | "pay_later";
  paymentId?: string;
};

type Ctx = { prev?: any[] };

/* ===================== ĐẶT SÂN ===================== */
export function useBookSlot(courtId: string, date: string) {
  const qc = useQueryClient();

  return useMutation<any, unknown, BookPayload, Ctx>({
    mutationFn: ({ slot, note, paymentMethod, paymentId }) =>
      // gửi Idempotency-Key chống double submit
      createBooking(
        {
          courtId,
          date,
          startAt: slot.startAt,
          endAt: slot.endAt,
          price: slot.price!, // đảm bảo Slot đã có price
          note,
          paymentMethod,
          ...(paymentMethod === "prepay_transfer" ? { paymentId } : {}),
        },
        { idempotencyKey: `bk-${courtId}-${date}-${slot.startAt}-${slot.endAt}` }
      ),

    onMutate: async ({ slot, note, paymentMethod }) => {
      // chỉ optimistic update cho pay_later
      if (paymentMethod !== "pay_later") return;
      await qc.cancelQueries({ queryKey: bookingsKey(courtId, date) });
      const prev = (qc.getQueryData<any[]>(bookingsKey(courtId, date)) ?? []).slice();

      const temp = {
        _id: `temp-${slot.startAt}-${slot.endAt}`,
        courtId,
        date,
        startAt: slot.startAt,
        endAt: slot.endAt,
        price: slot.price,
        note: note ?? "",
        paymentMethod: "pay_later",
        paymentStatus: "pending",
      };

      qc.setQueryData(bookingsKey(courtId, date), [temp, ...prev]);
      return { prev } as Ctx;
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(bookingsKey(courtId, date), ctx.prev);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: bookingsKey(courtId, date) });
      qc.invalidateQueries({ queryKey: availKey(courtId, date) });
      qc.invalidateQueries({ queryKey: ["my-bookings"], exact: false }); // cập nhật list của tôi
    },
  });
}

/* ===================== HỦY ĐẶT ===================== */
export function useCancelBooking(courtId: string, date: string) {
  const qc = useQueryClient();

  return useMutation<any, unknown, string, Ctx>({
    mutationFn: (bookingId) => cancelBooking(bookingId),

    onMutate: async (bookingId) => {
      if (!bookingId || bookingId.startsWith("temp-")) return;
      await qc.cancelQueries({ queryKey: bookingsKey(courtId, date) });
      const prev = (qc.getQueryData<any[]>(bookingsKey(courtId, date)) ?? []).slice();

      qc.setQueryData(
        bookingsKey(courtId, date),
        prev.filter((b) => b._id !== bookingId)
      );
      return { prev } as Ctx;
    },

    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(bookingsKey(courtId, date), ctx.prev);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: bookingsKey(courtId, date) });
      qc.invalidateQueries({ queryKey: availKey(courtId, date) });
      qc.invalidateQueries({ queryKey: ["my-bookings"], exact: false });
    },
  });
}

/* ===================== CẬP NHẬT GHI CHÚ ===================== */
export type UpdateBookingNoteVars = { bookingId: string; note: string };

export function useUpdateBookingNote(courtId: string, date: string) {
  const qc = useQueryClient();

  return useMutation<any, unknown, UpdateBookingNoteVars, Ctx>({
    mutationFn: ({ bookingId, note }) => updateBookingNote(bookingId, note),

    onMutate: async ({ bookingId, note }) => {
      if (!bookingId || bookingId.startsWith("temp-")) return;
      await qc.cancelQueries({ queryKey: bookingsKey(courtId, date) });
      const prev = (qc.getQueryData<any[]>(bookingsKey(courtId, date)) ?? []).slice();

      qc.setQueryData(
        bookingsKey(courtId, date),
        prev.map((b) => (b._id === bookingId ? { ...b, note } : b))
      );
      return { prev } as Ctx;
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(bookingsKey(courtId, date), ctx.prev);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: bookingsKey(courtId, date) });
      qc.invalidateQueries({ queryKey: availKey(courtId, date) });
      qc.invalidateQueries({ queryKey: ["my-bookings"], exact: false });
    },
  });
}
