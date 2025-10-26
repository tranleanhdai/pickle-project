// src/routes/booking.ts
import { Router } from "express";
import { Types } from "mongoose";
import { auth, AuthRequest, requireAdmin } from "../middleware/auth";
import { Timeslot } from "../models/Timeslot";
import { Booking } from "../models/Booking";
import { Court } from "../models/Court";
import { Venue } from "../models/Venue";

const router = Router();

router.get("/me", auth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Kiểu dữ liệu lean từ Mongo
    type Doc = {
      _id: Types.ObjectId;
      courtId?: Types.ObjectId | string;
      date: string;
      startAt: string;
      endAt: string;
      price?: number;
      userId: Types.ObjectId | string;
      note?: string;
      paymentMethod: "prepay_transfer" | "pay_later";
      paymentStatus: "pending" | "awaiting_transfer" | "verifying" | "paid" | "failed" | "expired";
      holdUntil?: Date | null;
      timeslotId?: Types.ObjectId;
      createdAt?: Date;
    };

    type CourtLean = { _id: Types.ObjectId; name: string; venueId?: Types.ObjectId | string };
    type VenueLean = { _id: Types.ObjectId; name: string };

    const docs = (await Booking.find({ userId })
      .sort({ createdAt: -1 })
      .select("_id courtId date startAt endAt price userId note paymentMethod paymentStatus holdUntil createdAt timeslotId")
      .lean()) as Doc[];

    if (!docs.length) return res.json([]);

    const courtIds: string[] = Array.from(
      new Set(
        docs
          .map((d: Doc) => (d.courtId ? String(d.courtId) : ""))
          .filter((x: string) => Boolean(x))
      )
    );

    const courtObjectIds = courtIds
      .filter((id: string) => Types.ObjectId.isValid(id))
      .map((id: string) => new Types.ObjectId(id));

    const courts = (await Court.find({ _id: { $in: courtObjectIds } })
      .select("_id name venueId")
      .lean()) as CourtLean[];

    const venueIds: string[] = Array.from(
      new Set(
        courts
          .map((c: CourtLean) => (c.venueId ? String(c.venueId) : ""))
          .filter((x: string) => Boolean(x))
      )
    );

    const venueObjectIds = venueIds
      .filter((id: string) => Types.ObjectId.isValid(id))
      .map((id: string) => new Types.ObjectId(id));

    const venues = (await Venue.find({ _id: { $in: venueObjectIds } })
      .select("_id name")
      .lean()) as VenueLean[];

    const courtMap = new Map<string, CourtLean>(courts.map((c: CourtLean) => [String(c._id), c]));
    const venueMap = new Map<string, VenueLean>(venues.map((v: VenueLean) => [String(v._id), v]));

    const enriched = docs.map((d: Doc) => {
      const c = courtMap.get(String(d.courtId ?? ""));
      const v = c ? venueMap.get(String(c.venueId ?? "")) : undefined;
      return {
        id: String(d._id),
        ...d,
        courtName: c?.name,
        venueName: v?.name,
      };
    });

    return res.json(enriched);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});
/**
 * GET / (ADMIN)
 * Query:
 *   - date?: YYYY-MM-DD
 *   - courtId?: string
 *   - paymentStatus?: pending|awaiting_transfer|verifying|paid|failed|expired
 *   - paymentMethod?: prepay_transfer|pay_later
 * Trả thêm: courtName, venueName
 */
router.get("/", auth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { date, courtId, paymentStatus, paymentMethod } = req.query as {
      date?: string;
      courtId?: string;
      paymentStatus?: string;
      paymentMethod?: "prepay_transfer" | "pay_later";
    };

    const cond: any = {};
    if (date) cond.date = date;
    if (courtId) cond.courtId = courtId;
    if (paymentStatus) cond.paymentStatus = paymentStatus;
    if (paymentMethod) cond.paymentMethod = paymentMethod;

    const docs = await Booking.find(cond)
      .sort({ createdAt: -1 })
      .select(
        "_id courtId date startAt endAt price userId note paymentMethod paymentStatus transfer createdAt"
      )
      .lean();

    if (!docs.length) return res.json(docs);

    // ---- Enrich courtName & venueName ----
    const courtIds: string[] = Array.from(
      new Set((docs as any[]).map((d: any) => String(d.courtId)).filter(Boolean))
    );

    // court._id là ObjectId → convert an toàn
    const courtObjectIds = courtIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const courts = await Court.find({ _id: { $in: courtObjectIds } })
      .select("_id name venueId")
      .lean();

    const venueIds: string[] = Array.from(
      new Set((courts as any[]).map((c: any) => String(c.venueId)).filter(Boolean))
    );

    const venueObjectIds = venueIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const venues = await Venue.find({ _id: { $in: venueObjectIds } })
      .select("_id name")
      .lean();

    const courtMap = new Map<string, any>(
      (courts as any[]).map((c: any) => [String(c._id), c])
    );
    const venueMap = new Map<string, any>(
      (venues as any[]).map((v: any) => [String(v._id), v])
    );

    const enriched = (docs as any[]).map((d: any) => {
      const c = courtMap.get(String(d.courtId));
      const v = c ? venueMap.get(String(c?.venueId)) : undefined;
      return {
        ...d,
        courtName: c?.name,
        venueName: v?.name,
      };
    });

    return res.json(enriched);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /
 * Luật chặn:
 *  - pay_later:  paid  OR (pending  && holdUntil > now)
 *  - prepay_tr:  paid  OR ((awaiting_transfer|verifying) && holdUntil > now)
 */
router.post("/", auth, async (req: AuthRequest, res) => {
  try {
    let {
      courtId,
      date,
      startAt,
      endAt,
      price,
      note,
      paymentMethod,
      paymentId, // OPTIONAL cho prepay_transfer
    } = req.body ?? {};

    const idempotencyKey =
      (req.header("Idempotency-Key") || req.header("x-idempotency-key") || "").trim() ||
      undefined;

    if (typeof price === "string") price = Number(price);
    if (!courtId || !date || !startAt || !endAt || typeof price !== "number") {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!["prepay_transfer", "pay_later"].includes(paymentMethod)) {
      return res.status(400).json({
        error: "paymentMethod must be 'prepay_transfer' or 'pay_later'",
      });
    }

    // Idempotency
    if (idempotencyKey) {
      const existed = await Booking.findOne({ idempotencyKey, userId: req.user!.id }).lean();
      if (existed) return res.status(200).json(existed);
    }

    // 1) slot phải tồn tại
    const slot = await Timeslot.findOne({ courtId, date, startAt, endAt }).lean();
    if (!slot) return res.status(404).json({ error: "Timeslot not found" });

    // 2) kiểm tra "blocker" — ưu tiên khớp theo timeslotId, fallback theo start/end
    const now = new Date();
    const stateOrs = [
      { paymentMethod: "pay_later", paymentStatus: "paid" },
      { paymentMethod: "pay_later", paymentStatus: "pending", holdUntil: { $gt: now } },
      { paymentMethod: "prepay_transfer", paymentStatus: "paid" },
      {
        paymentMethod: "prepay_transfer",
        paymentStatus: { $in: ["awaiting_transfer", "verifying"] },
        holdUntil: { $gt: now },
      },
    ];

    const blocker = await Booking.findOne({
      courtId,
      date,
      $and: [
        {
          $or: [
            { timeslotId: slot._id }, // booking mới
            { $and: [{ startAt }, { endAt }] }, // booking cũ chưa có timeslotId
          ],
        },
        { $or: stateOrs as any },
      ],
    }).lean();

    if (blocker) {
      return res.status(409).json({ error: "Timeslot already booked" });
    }

    // 3) set trạng thái thanh toán
    type PStatus = "pending" | "awaiting_transfer" | "verifying" | "paid";
    let paymentStatus: PStatus = "pending";
    let holdUntil: Date | null = null;
    let transfer: any | undefined;
    let storedPaymentId: string | undefined;

    if (paymentMethod === "prepay_transfer") {
      if (paymentId) {
        paymentStatus = "paid";
        holdUntil = null;
        transfer = { amountExpected: Number(price) };
        storedPaymentId = String(paymentId);
      } else {
        paymentStatus = "awaiting_transfer";
        holdUntil = new Date(Date.now() + 15 * 60 * 1000); // giữ chỗ 15'
        transfer = { amountExpected: Number(price) };
      }
    } else {
      paymentStatus = "pending";
      holdUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    const user = req.user!;
    const created = await Booking.create({
      courtId,
      date,
      startAt,
      endAt,
      price,
      note: typeof note === "string" ? note : "",
      userId: user.id,
      paymentMethod,
      paymentStatus,
      holdUntil,
      transfer,
      paymentId: storedPaymentId,
      idempotencyKey,
      timeslotId: slot._id, // NEW: gắn timeslotId
      audit: [{ action: "create", at: new Date(), by: user.id as any }],
    });

    return res.status(201).json(created);
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ error: "Timeslot already booked (index)" });
    }
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

/** DELETE /:id — chính chủ hoặc admin */
router.delete("/:id", auth, async (req: AuthRequest, res) => {
  const id = String(req.params.id || "").trim();
  const user = req.user!;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const bk = await Booking.findById(id).lean();
  if (!bk) return res.status(404).json({ error: "Booking not found" });

  if (user.role !== "admin" && String(bk.userId) !== String(user.id)) {
    return res.status(403).json({ error: "Not your booking" });
  }

  if (user.role !== "admin" && bk.paymentStatus === "paid") {
    return res
      .status(403)
      .json({ error: "Booking đã thanh toán, bạn không thể tự hủy. Vui lòng liên hệ admin." });
  }

  await Booking.deleteOne({ _id: id });
  return res.json({ ok: true });
});

/** PATCH /:id — cập nhật NOTE (chính chủ hoặc admin) */
router.patch("/:id", auth, async (req: AuthRequest, res) => {
  const id = String(req.params.id || "").trim();
  const { note } = req.body ?? {};
  const user = req.user!;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const bk = await Booking.findById(id).lean();
  if (!bk) return res.status(404).json({ error: "Booking not found" });
  if (user.role !== "admin" && String(bk.userId) !== String(user.id)) {
    return res.status(403).json({ error: "Not your booking" });
  }

  const updated = await Booking.findByIdAndUpdate(
    id,
    {
      $set: { note: String(note ?? "") },
      $push: { audit: { action: "update_note", at: new Date(), by: user.id as any } },
    },
    { new: true }
  );

  res.json(updated);
});

export default router;
