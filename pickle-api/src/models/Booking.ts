// src/models/Booking.ts
import mongoose, { Schema, model, Types } from "mongoose";

const transferSchema = new Schema(
  {
    amountExpected: { type: Number, min: 0 },
    memoCode: { type: String, index: true, sparse: true },
    proofUrl: { type: String },
    bankRef: { type: String },
    verifiedBy: { type: Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
  },
  { _id: false }
);

const auditSchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    action: {
      type: String,
      enum: [
        "create",
        "update_note",
        "cancel",
        "expire",
        "payment_initiated",
        "payment_confirmed",
        "payment_failed",
      ],
      required: true,
    },
    by: { type: Types.ObjectId, ref: "User" },
    meta: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const bookingSchema = new Schema(
  {
    courtId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    startAt: { type: String, required: true, index: true }, // "08:00"
    endAt: { type: String, required: true, index: true }, // "09:00"
    price: { type: Number, required: true, min: 0 },

    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    note: { type: String, default: "" },

    paymentMethod: {
      type: String,
      enum: ["prepay_transfer", "pay_later"],
      required: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "awaiting_transfer", "verifying", "paid", "failed", "expired"],
      default: "pending",
      index: true,
    },

    // THÊM: để routes/booking.ts có thể lưu nếu cung cấp
    paymentId: { type: String, index: true, sparse: true },

    transfer: { type: transferSchema, default: undefined },
    holdUntil: { type: Date, index: true },

    // THÊM: chống tạo trùng request
    idempotencyKey: { type: String, index: true, sparse: true },

    // THÊM: audit log phục vụ debug
    audit: { type: [auditSchema], default: [] },
  },
  { timestamps: true }
);

/**
 * ⚠️ BỎ UNIQUE CỨNG:
 *   bookingSchema.index({ courtId, date, startAt, endAt }, { unique: true })
 * Vì nó khiến prepay/hold & pay_later “đè nhau”.
 * Thay bằng index hỗ trợ truy vấn blocker đúng luật.
 */

// Hỗ trợ tìm blocker nhanh theo luật:
// (courtId,date,startAt,endAt,paymentMethod,paymentStatus,holdUntil)
bookingSchema.index({
  courtId: 1,
  date: 1,
  startAt: 1,
  endAt: 1,
  paymentMethod: 1,
  paymentStatus: 1,
  holdUntil: 1,
});

// Một số index phụ trợ sẵn có
bookingSchema.index({ userId: 1, date: -1 });
bookingSchema.index({ courtId: 1, date: -1 });
bookingSchema.index({ paymentStatus: 1, date: -1 });

// Helper nhỏ cho audit
bookingSchema.methods.addAudit = function (
  action: string,
  by?: Types.ObjectId,
  meta?: Record<string, any>
) {
  this.audit.push({ at: new Date(), action, by, meta });
};

// Helper lấy theo id, ném lỗi chuẩn
bookingSchema.statics.getByIdOrThrow = async function (id: string | Types.ObjectId) {
  const _id = typeof id === "string" ? new Types.ObjectId(id) : id;
  const doc = await this.findById(_id);
  if (!doc) throw new Error("booking_not_found");
  return doc;
};

// toJSON đẹp
bookingSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id?.toString?.();
    delete ret._id;
    return ret;
  },
});

export const Booking = (mongoose.models.Booking as any) || model("Booking", bookingSchema);
export default Booking;
