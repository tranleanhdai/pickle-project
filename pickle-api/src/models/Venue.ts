import { Schema, model } from "mongoose";

const venueSchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
  },
  { timestamps: true }
);

export const Venue = model("Venue", venueSchema);
