import mongoose from "mongoose";
import 'dotenv/config';
export async function connectDB() {
  const uri = process.env.MONGODB_URI ?? process.env.MONGO_URL; // hỗ trợ cả 2
  if (!uri) throw new Error("Missing MONGODB_URI/MONGO_URL in .env");

  await mongoose.connect(uri);
  console.log("MongoDB connected:", uri);
}
