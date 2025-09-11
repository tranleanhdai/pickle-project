// src/routes/availability.ts
import { Router } from "express";
import { Types } from "mongoose";
import { Timeslot } from "../models/Timeslot";
import { Booking } from "../models/Booking";

const router = Router();

// Sinh timeslot mặc định nếu chưa có
async function ensureTimeslots(courtId: string, date: string) {
  const count = await Timeslot.countDocuments({ courtId, date });
  if (count > 0) return;

  const startHour = 7, endHour = 22, price = 100_000;
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
  await Timeslot.bulkWrite(ops);
}

/**
 * GET /api/availability?courtId=...&date=YYYY-MM-DD
 */
router.get("/availability", async (req, res) => {
  try {
    const { courtId, date } = req.query as { courtId?: string; date?: string };
    if (!courtId || !date) return res.status(400).json({ error: "Missing courtId/date" });
    if (!Types.ObjectId.isValid(courtId)) return res.status(400).json({ error: "Invalid courtId" });

    // auto tạo timeslot nếu chưa có
    await ensureTimeslots(courtId, date);

    // lấy timeslot + bookings
    const slots = await Timeslot.find({ courtId, date }).sort({ startAt: 1 }).lean();
    const bookings = await Booking.find({ courtId, date }).lean();

    // user hiện tại (sau này thay bằng user thực tế từ auth)
    const CURRENT_USER = "demo-user";

    // group bookings theo start-end
    const byKey = new Map(
      bookings.map((b) => [
        `${b.startAt}-${b.endAt}`,
        {
          id: b._id.toString(),
          userId: b.userId ?? null,
          note: (b as any).note ?? "",
        },
      ])
    );

    // build response
    const data = slots.map((s) => {
      const key = `${s.startAt}-${s.endAt}`;
      const bk = byKey.get(key);
      return {
        id: s._id.toString(),
        courtId: s.courtId.toString(),
        date: s.date,
        startAt: s.startAt,
        endAt: s.endAt,
        price: s.price,
        isBooked: !!bk,
        bookingId: bk?.id ?? null,            // NEW
        note: bk?.note ?? "",                 // NEW
        isMine: bk?.userId === CURRENT_USER,  // NEW
      };
    });

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
