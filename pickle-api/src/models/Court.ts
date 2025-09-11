import { Schema, model, Types } from "mongoose";

const courtSchema = new Schema(
  {
    venueId: { type: Types.ObjectId, ref: "Venue", required: true, index: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const Court = model("Court", courtSchema);
