export type Slot = {
  id: string;
  courtId: string;
  date: string;
  startAt: string;
  endAt: string;
  price: number;
  isBooked: boolean;
  bookingId?: string | null;
  isMine?: boolean;
  note?: string;
};
