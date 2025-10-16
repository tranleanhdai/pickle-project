// src/routes/booking.ts
import { Router } from "express";
import { Types } from "mongoose";
import { auth, AuthRequest } from "../middleware/auth";
import { Timeslot } from "../models/Timeslot";
import { Booking } from "../models/Booking";
import { Court } from "../models/Court";

const router = Router();

/**
 * POST /
 * - pay_later:
 *    tạo booking giữ chỗ (pending, hold 15')
 * - prepay_transfer:
 *    - KHÔNG có paymentId  -> awaiting_transfer + hold 15'
 *    - CÓ paymentId        -> paid (idempotent nếu submit lại)
 *
 * Luật chặn (blocker):
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
      (req.header("Idempotency-Key") || req.header("x-idempotency-key") || "")
        .trim() || undefined;

    if (typeof price === "string") price = Number(price);
    if (!courtId || !date || !startAt || !endAt || typeof price !== "number") {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!["prepay_transfer", "pay_later"].includes(paymentMethod)) {
      return res.status(400).json({
        error: "paymentMethod must be 'prepay_transfer' or 'pay_later'",
      });
    }

    // Idempotency: nếu đã có record với cùng key, trả lại luôn
    if (idempotencyKey) {
      const existed = await Booking.findOne({
        idempotencyKey,
        userId: req.user!.id,
      }).lean();
      if (existed) return res.status(200).json(existed);
    }

    // 1) slot phải tồn tại
    const slot = await Timeslot.findOne({ courtId, date, startAt, endAt });
    if (!slot) return res.status(404).json({ error: "Timeslot not found" });

    // 2) kiểm tra "blocker" theo đúng luật khóa
    const now = new Date();
    const blocker = await Booking.findOne({
      courtId,
      date,
      startAt,
      endAt,
      $or: [
        { paymentMethod: "pay_later",       paymentStatus: "paid" },
        { paymentMethod: "pay_later",       paymentStatus: "pending",            holdUntil: { $gt: now } },
        { paymentMethod: "prepay_transfer", paymentStatus: "paid" },
        { paymentMethod: "prepay_transfer", paymentStatus: { $in: ["awaiting_transfer", "verifying"] }, holdUntil: { $gt: now } },
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
      // pay_later
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

/**
 * GET /:id
 * - Lấy chi tiết 1 booking (user chỉ xem được booking của mình; admin xem tất cả)
 */
router.get("/:id", auth, async (req: AuthRequest, res) => {
  const id = String(req.params.id || "").trim();

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const bk = await Booking.findById(id).lean();
  if (!bk) return res.status(404).json({ error: "Booking not found" });

  const user = req.user!;
  if (user.role !== "admin" && String(bk.userId) !== String(user.id)) {
    return res.status(403).json({ error: "Not your booking" });
  }

  return res.json(bk);
});

/**
 * GET /
 * - Admin: thấy tất cả
 * - User: chỉ thấy của mình
 * - Filter: ?courtId=&date=&paymentStatus=
 */
router.get("/", auth, async (req, res) => {
  try {
    const user = (req as any).user as { id: string; role: string };
    const { courtId, date, paymentStatus } = req.query as {
      courtId?: string;
      date?: string;
      paymentStatus?: string;
    };

    const base: any = {};
    if (courtId) base.courtId = courtId;
    if (date) base.date = date;
    if (paymentStatus) base.paymentStatus = paymentStatus;

    const filter = user.role === "admin" ? base : { ...base, userId: user.id };

    const list = await Booking.find(filter).sort({ date: 1, startAt: 1 }).lean();

    const courtIds = Array.from(new Set(list.map((b: any) => String(b.courtId))));
    const courts = await Court.find({ _id: { $in: courtIds } })
      .select("_id name")
      .lean();

    const nameMap = new Map<string, string>(
      courts.map((c: any) => [String(c._id), c.name])
    );

    const withNames = list.map((b: any) => ({
      ...b,
      courtName: nameMap.get(String(b.courtId)) || undefined,
    }));

    res.json(withNames);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * DELETE /:id
 * - Chính chủ hoặc admin mới được hủy
 */
// DELETE /:id
router.delete("/:id", auth, async (req: AuthRequest, res) => {
  const id = String(req.params.id || "").trim();
  const user = req.user!;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const bk = await Booking.findById(id).lean();
  if (!bk) return res.status(404).json({ error: "Booking not found" });

  // Không phải của mình và cũng không phải admin
  if (user.role !== "admin" && String(bk.userId) !== String(user.id)) {
    return res.status(403).json({ error: "Not your booking" });
  }

  // ⚠️ User thường KHÔNG được hủy nếu booking đã thanh toán
  if (user.role !== "admin" && bk.paymentStatus === "paid") {
    return res
      .status(403)
      .json({ error: "Booking đã thanh toán, bạn không thể tự hủy. Vui lòng liên hệ admin." });
  }

  // (Optional) nếu muốn chặn cả admin khi paid thì đổi điều kiện phía trên.
  await Booking.deleteOne({ _id: id });
  return res.json({ ok: true });
});

/**
 * PATCH /:id
 * - Cập nhật NOTE (chính chủ hoặc admin)
 */
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
