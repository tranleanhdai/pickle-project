import { Schema, model, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  username: string;
  email: string;
  role: "admin" | "user" | "staff";
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  setPassword(password: string): Promise<void>;
  validatePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    role:     { type: String, enum: ["admin","user","staff"], default: "user" },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

UserSchema.methods.setPassword = async function (password: string) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(String(password), salt);
};

UserSchema.methods.validatePassword = async function (password: string) {
  const hash = this.passwordHash;
  if (!hash || typeof hash !== "string") return false; // tránh ném lỗi cho user cũ
  try {
    return await bcrypt.compare(String(password), hash);
  } catch {
    return false;
  }
};

export const User = model<IUser>("User", UserSchema);
