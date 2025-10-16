import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBooking } from "../api/booking";

export type CreateBookingBody = {
  courtId: string;
  date: string;
  startAt: string;
  endAt: string;
  price: number;
  note?: string;
  paymentMethod: "prepay_transfer" | "pay_later";
  paymentId?: string; // 👈 để liên kết payment
};

export type BookingResponse = any;

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation<BookingResponse, any, CreateBookingBody>({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}
