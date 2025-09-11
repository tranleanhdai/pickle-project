import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBooking, cancelBooking, updateBookingNote } from '../api/booking';
import type { Slot } from '../types/slot';

export function useBookSlot(courtId: string, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ slot, note, userId = 'demo-user' }: { slot: Slot; note?: string; userId?: string }) =>
      createBooking({
        courtId,
        date,
        startAt: slot.startAt,
        endAt: slot.endAt,
        price: slot.price,
        userId,
        note,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability', courtId, date] }),
  });
}

export function useCancelBooking(courtId: string, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => cancelBooking(bookingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability', courtId, date] }),
  });
}

export function useUpdateBookingNote(courtId: string, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, note }: { bookingId: string; note: string }) =>
      updateBookingNote(bookingId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability', courtId, date] }),
  });
}
