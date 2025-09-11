import { Schema, model, Types } from "mongoose";

const timeslotSchema = new Schema(
  {
    courtId: { type: Types.ObjectId, ref: "Court", required: true, index: true },
    date: { type: String, required: true, index: true }, // yyyy-mm-dd
    startAt: { type: String, required: true },          // HH:mm
    endAt: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

// Không cho trùng timeslot
timeslotSchema.index({ courtId: 1, date: 1, startAt: 1, endAt: 1 }, { unique: true });

export const Timeslot = model("Timeslot", timeslotSchema);
