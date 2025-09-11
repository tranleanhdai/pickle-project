import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { Timeslot } from "../models/Timeslot";
import { Booking } from "../models/Booking";

export const bookingsRouter = Router();

/** POST /api/bookings  – tạo booking (có note) */
bookingsRouter.post("/bookings", async (req: Request, res: Response) => {
  try {
    const { courtId, date, startAt, endAt, price, userId, note } = req.body || {};
    if (!courtId || !date || !startAt || !endAt || typeof price !== "number") {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!Types.ObjectId.isValid(courtId)) {
      return res.status(400).json({ error: "Invalid courtId" });
    }

    // timeslot phải tồn tại
    const slot = await Timeslot.findOne({
      courtId: new Types.ObjectId(courtId),
      date,
      startAt,
      endAt,
    });
    if (!slot) return res.status(404).json({ error: "Timeslot not found" });

    // chặn trùng slot
    const exists = await Booking.exists({
      courtId: new Types.ObjectId(courtId),
      date,
      startAt,
      endAt,
    });
    if (exists) return res.status(409).json({ error: "Timeslot already booked" });

    const b = await Booking.create({
      courtId: new Types.ObjectId(courtId),
      date,
      startAt,
      endAt,
      price,
      userId,
      note,
    });

    return res.status(201).json({
      id: b._id.toString(),
      courtId: b.courtId.toString(),
      date: b.date,
      startAt: b.startAt,
      endAt: b.endAt,
      price: b.price,
      userId: b.userId ?? null,
      note: b.note ?? "",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

/** DELETE /api/bookings/:id – hủy đặt */
bookingsRouter.delete("/bookings/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const b = await Booking.findByIdAndDelete(id);
  if (!b) return res.status(404).json({ error: "Booking not found" });
  return res.json({ ok: true });
});

/** PATCH /api/bookings/:id – cập nhật ghi chú */
bookingsRouter.patch("/bookings/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { note } = req.body || {};
  const b = await Booking.findByIdAndUpdate(id, { note }, { new: true });
  if (!b) return res.status(404).json({ error: "Booking not found" });
  return res.json({ id: b._id.toString(), note: b.note ?? "" });
});

/** (Optional) GET /api/bookings?courtId=&date= – xem list booking */
bookingsRouter.get("/bookings", async (req: Request, res: Response) => {
  const { courtId, date } = req.query as { courtId?: string; date?: string };
  const q: any = {};
  if (courtId) q.courtId = new Types.ObjectId(courtId);
  if (date) q.date = date;
  const bookings = await Booking.find(q).lean();
  res.json(bookings);
});
