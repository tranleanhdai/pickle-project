// src/routes/admin.summary.ts
import express from "express";
import dayjs from "dayjs";
import { auth, requireAdmin } from "../middleware/auth";
import { Booking } from "../models/Booking";

const router = express.Router();

/**
 * GET /api/admin/bookings/summary
 * query:
 *  - venueId?, courtId?
 *  - mode=past|day
 *  - date=YYYY-MM-DD (khi mode=day)
 *
 * Trả về: { count: number, revenue: number }
 */
router.get("/admin/bookings/summary", auth, requireAdmin, async (req, res) => {
  try {
    const { venueId, courtId, mode = "past", date } = req.query as any;
    const cond: any = {};
    if (venueId) cond.venueId = String(venueId);
    if (courtId) cond.courtId = String(courtId);

    if (mode === "day" && date) {
      cond.date = String(date);
    } else {
      // past
      cond.date = { $lt: dayjs().format("YYYY-MM-DD") };
    }

    const [agg] = await Booking.aggregate([
      { $match: cond },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: { $ifNull: ["$price", 0] } },
        },
      },
    ]);

    res.json(agg ?? { count: 0, revenue: 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Summary failed" });
  }
});

export default router;
