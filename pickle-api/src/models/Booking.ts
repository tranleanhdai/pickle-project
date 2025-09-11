import { Schema, model } from "mongoose";

const bookingSchema = new Schema({
  courtId: { type: String, required: true },
  date:    { type: String, required: true },      // YYYY-MM-DD
  startAt: { type: String, required: true },      // "08:00"
  endAt:   { type: String, required: true },      // "09:00"
  price:   { type: Number, required: true },
  userId:  { type: String },
  note:    { type: String, default: "" },         // <--- NEW
}, { timestamps: true });

// 1 timeslot chỉ được đặt 1 lần
bookingSchema.index({ courtId: 1, date: 1, startAt: 1, endAt: 1 }, { unique: true });

export const Booking = model("Booking", bookingSchema);
export default Booking;
