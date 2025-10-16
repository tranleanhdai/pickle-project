import { Schema, model, Types } from "mongoose";

export interface CourtDoc {
  venueId: Types.ObjectId;
  name: string;
  coverUrl?: string | null;
  pricePerHour?: number;
  description?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const courtSchema = new Schema<CourtDoc>(
  {
    // ⬇⬇⬇ SỬA Ở ĐÂY: dùng Schema.Types.ObjectId thay vì Types.ObjectId
    venueId: { type: Schema.Types.ObjectId, ref: "Venue", required: true, index: true },
    name: { type: String, required: true, trim: true },
    coverUrl: { type: String, default: null },

    pricePerHour: { type: Number, default: 0 },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// courtSchema.index({ venueId: 1, name: 1 }, { unique: true }); // (tuỳ chọn)

courtSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id?.toString?.();
    delete ret._id;
  },
});

export const Court = model<CourtDoc>("Court", courtSchema);
export default Court;
