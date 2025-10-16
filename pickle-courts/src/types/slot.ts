// src/types/slot.ts
export type PaymentMethod = "pay_later" | "prepay_transfer";
export type PaymentStatus =
  | "pending"
  | "awaiting_transfer"
  | "verifying"
  | "paid"
  | "failed";

export type Slot = {
  id?: string;
  courtId: string;
  date: string;
  startAt: string;
  endAt: string;
  price: number | null;

  // trạng thái chiếm slot
  isBooked: boolean;
  isMine: boolean;
  bookingId: string | null;

  // thông tin để hiển thị nhãn (có thể không có => optional)
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  holdUntil?: string | null; // ISO string
  note?: string;
};

