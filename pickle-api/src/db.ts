import mongoose from "mongoose";
import dotenv from "dotenv";

// Đọc file .env
dotenv.config();

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("⚠️ Missing MONGODB_URI in .env");

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri);
  console.log("✅ MongoDB connected:", uri);
}
