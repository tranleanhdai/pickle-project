// src/models/PasswordReset.ts
import { Schema, model } from "mongoose";

const passwordResetSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const PasswordReset = model("PasswordReset", passwordResetSchema);
