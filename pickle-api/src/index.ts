// src/index.ts
import express, { Request, Response } from "express";
import cors from "cors";
import { Types } from "mongoose";

import { connectDB } from "./db";
import { Venue } from "./models/Venue";
import { Court } from "./models/Court";
import { bookingsRouter } from "./routes/booking";
import availabilityRouter from "./routes/availability";

const app = express();
app.use(cors());
app.use(express.json());

// Mount routers
app.use("/api", bookingsRouter);
app.use("/api", availabilityRouter);

// --- health ---
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- VENUES ---
app.get("/api/venues", async (_req: Request, res: Response) => {
  const venues = await Venue.find().sort({ createdAt: -1 });
  res.json(
    venues.map((v) => ({
      id: v._id.toString(),
      name: v.name,
      address: v.address,
    }))
  );
});

// --- COURTS ---
app.get("/api/courts", async (req: Request, res: Response) => {
  const { venueId } = req.query;
  if (!venueId || typeof venueId !== "string") {
    return res.status(400).json({ error: "Missing venueId" });
  }
  if (!Types.ObjectId.isValid(venueId)) {
    return res.status(400).json({ error: "Invalid venueId" });
  }

  const courts = await Court.find({ venueId: new Types.ObjectId(venueId) }).sort({ createdAt: 1 });
  res.json(
    courts.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      venueId: c.venueId.toString(),
    }))
  );
});

// --- start server ---
async function main() {
  await connectDB();
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API listening on http://0.0.0.0:${PORT}`);
  });
}
main().catch((e) => {
  console.error("Failed to start server", e);
  process.exit(1);
});
