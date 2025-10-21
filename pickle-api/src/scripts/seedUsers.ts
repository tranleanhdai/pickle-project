/* eslint-disable no-console */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs"; // hoặc: import * as bcrypt from "bcryptjs";
import { User } from "../models/User";  // đường dẫn từ scripts -> src/models

async function main() {
  console.log("▶ Starting seed...");
  const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!uri) {
    throw new Error("MONGODB_URI/MONGO_URL is missing in .env (ví dụ: mongodb://localhost:27017/pickleball)");
  }

  await mongoose.connect(uri);
  console.log("✓ Connected to", uri);

  let created = 0;

  const admin = await User.findOne({ username: "admin" });
  if (!admin) {
    await User.create({
      username: "admin",
      passwordHash: bcrypt.hashSync("admin123", 10),
      role: "admin",
    });
    console.log("✅ Seeded admin: admin/admin123");
    created++;
  } else {
  console.log("ℹ️ Admin existed:", admin.id); // ✅ không còn lỗi unknown
}

  const demo = await User.findOne({ username: "demo" });
  if (!demo) {
    await User.create({
      username: "demo",
      passwordHash: bcrypt.hashSync("123", 10),
      role: "user",
    });
    console.log("✅ Seeded user: demo/123");
    created++;
  } else {
  console.log("ℹ️ Demo existed:", demo.id); // ✅
}

  await mongoose.disconnect();
  console.log("✔ Done. Created:", created);
}

main().catch(async (e) => {
  console.error("❌ Seed error:", e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
