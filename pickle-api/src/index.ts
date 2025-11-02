// src/index.ts
import express, { Request, Response } from "express";
import cors from "cors";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Venue } from "./models/Venue";
import { Court } from "./models/Court";
import { Booking } from "./models/Booking";

import bookingsRouter from "./routes/booking";
import availabilityRouter from "./routes/availability";
import authRouter from "./routes/auth";
import paymentsRouter from "./routes/payments";
import postsRouter from "./routes/posts";
import uploadRouter from "./routes/upload";
import courtsRouter from "./routes/courts";
import venuesRouter from "./routes/venues";
import adminSummaryRoutes from "./routes/admin.summary";
import path from "path";

async function main() {
  await connectDB();

  const app = express();

  app.use("/api", adminSummaryRoutes);
  // CORS + body limit
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // STATIC reset page
  const PUBLIC_DIR = path.join(__dirname, "../public");
  console.log("Serving static from:", PUBLIC_DIR);
  app.use(express.static(PUBLIC_DIR));

  // Routers
  app.use("/api/posts", postsRouter);
  app.use("/api/upload", uploadRouter);
  app.use("/api/courts", courtsRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/availability", availabilityRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/venues", venuesRouter);

  app.get(["/reset", "/reset.html"], (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "reset.html"));
  });

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.get("/api/courts-by-venue", async (req: Request, res: Response) => {
    const { venueId } = req.query;
    if (!venueId || typeof venueId !== "string") {
      return res.status(400).json({ error: "Missing venueId" });
    }
    if (!Types.ObjectId.isValid(venueId)) {
      return res.status(400).json({ error: "Invalid venueId" });
    }
    const courts = await Court.find({ venueId }).sort({ createdAt: 1 });
    res.json(
      courts.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        venueId: c.venueId.toString(),
        coverUrl: (c as any).coverUrl ?? null,
      }))
    );
  });

  // Cron expire pay_later
  setInterval(async () => {
    try {
      await Booking.updateMany(
        {
          paymentMethod: "pay_later",
          paymentStatus: "pending",
          holdUntil: { $lte: new Date() },
        },
        {
          $set: { paymentStatus: "expired" },
          $push: { audit: { action: "expire", at: new Date() } },
        }
      );
    } catch (e) {
      console.error("Expire job error", e);
    }
  }, 60_000);

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

main().catch((e) => {
  console.error("Failed to start server", e);
  process.exit(1);
});
