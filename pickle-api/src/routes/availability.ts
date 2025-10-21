// src/routes/availability.ts
import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { Timeslot } from "../models/Timeslot";
import { Booking } from "../models/Booking";
import { optionalAuth } from "../middleware/optionalAuth";

const router = Router();

router.use((req, _res, next) => {
  console.log("[availability]", req.method, req.originalUrl, req.query);
  next();
});

type SlotAvailable = {
  courtId: string;
  date: string;
  startAt: string;
  endAt: string;
  price: number;
  status: "available";
};

type SlotBlocked = {
  courtId: string;
  date: string;
  startAt: string;
  endAt: string;
  price: number;
  status: "blocked";
  booking: {
    id: string;
    userId: string;
    paymentMethod: "pay_later" | "prepay_transfer";
    paymentStatus: "pending" | "awaiting_transfer" | "verifying" | "paid" | "failed" | "expired";
    holdUntil?: Date | null;
    note?: string;
    // NEW: expose timeslotId cho FE nếu cần
    timeslotId?: string | null;
  };
  bookedByMe?: boolean;
};

type SlotResponse = SlotAvailable | SlotBlocked;

async function ensureTimeslots(courtId: string, date: string) {
  const startHour = 7;
  const endHour = 22;
  const price = 100_000;

  const ops: any[] = [];
  for (let h = startHour; h < endHour; h++) {
    const s = `${String(h).padStart(2, "0")}:00`;
    const e = `${String(h + 1).padStart(2, "0")}:00`;
    ops.push({
      updateOne: {
        filter: { courtId, date, startAt: s, endAt: e },
        update: { $setOnInsert: { courtId, date, startAt: s, endAt: e, price } },
        upsert: true,
      },
    });
  }
  if (ops.length) await Timeslot.bulkWrite(ops, { ordered: false });
}

router.get("/", optionalAuth, async (req: Request, res: Response) => {
  try {
    const { courtId, date } = req.query as { courtId?: string; date?: string };

    if (!courtId || typeof courtId !== "string") {
      return res.status(400).json({ error: "Missing courtId" });
    }
    if (!Types.ObjectId.isValid(courtId)) {
      return res.status(400).json({ error: "Invalid courtId" });
    }
    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "Missing date" });
    }

    await ensureTimeslots(courtId, date);

    const now = new Date();

    const slots = await Timeslot.find({ courtId, date }).sort({ startAt: 1 }).lean();

    const bookings = await Booking.find({
      courtId,
      date,
      $or: [
        { paymentMethod: "pay_later", paymentStatus: "paid" },
        { paymentMethod: "pay_later", paymentStatus: "pending", holdUntil: { $gt: now } },
        { paymentMethod: "prepay_transfer", paymentStatus: "paid" },
        {
          paymentMethod: "prepay_transfer",
          paymentStatus: { $in: ["awaiting_transfer", "verifying"] },
          holdUntil: { $gt: now },
        },
      ],
    })
      .select("_id timeslotId startAt endAt userId paymentMethod paymentStatus holdUntil note")
      .lean();

    type BookingLite = {
      _id: any;
      timeslotId?: any | null;
      startAt: string;
      endAt: string;
      userId: any;
      paymentMethod: "pay_later" | "prepay_transfer";
      paymentStatus: "pending" | "awaiting_transfer" | "verifying" | "paid" | "failed" | "expired";
      holdUntil?: Date | null;
      note?: string;
    };

    const myId: string | null = (req as any)?.user?.id ? String((req as any).user.id) : null;

    // Map theo timeslotId nếu có, nếu không thì theo "start|end" (booking cũ)
    const bookedBySlotId = new Map<string, BookingLite>();
    const bookedByTimeKey = new Map<string, BookingLite>();
    for (const b of bookings as BookingLite[]) {
      if (b.timeslotId) {
        bookedBySlotId.set(String(b.timeslotId), b);
      } else {
        bookedByTimeKey.set(`${b.startAt}|${b.endAt}`, b);
      }
    }

    const data = (slots as Array<{
      _id: any; courtId: any; date: string; startAt: string; endAt: string; price: number;
    }>).map<SlotResponse>((s) => {
      const b =
        bookedBySlotId.get(String(s._id)) ||
        bookedByTimeKey.get(`${s.startAt}|${s.endAt}`); // fallback cho dữ liệu cũ

      if (!b) {
        return {
          courtId: String(s.courtId),
          date: s.date,
          startAt: s.startAt,
          endAt: s.endAt,
          price: s.price,
          status: "available",
        };
      }

      const booking: SlotBlocked["booking"] = {
        id: String(b._id),
        userId: String(b.userId),
        paymentMethod: b.paymentMethod,
        paymentStatus: b.paymentStatus,
        holdUntil: b.holdUntil ?? null,
        timeslotId: b.timeslotId ? String(b.timeslotId) : null,
        ...(b.note ? { note: b.note } : {}),
      };

      const bookedByMe = !!myId && String(b.userId) === myId;

      return {
        courtId: String(s.courtId),
        date: s.date,
        startAt: s.startAt,
        endAt: s.endAt,
        price: s.price,
        status: "blocked",
        booking,
        ...(bookedByMe ? { bookedByMe: true } : {}),
      };
    });

    return res.json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
