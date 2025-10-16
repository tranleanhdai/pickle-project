// src/routes/payments.ts
import express, { Response } from "express";
import crypto from "crypto";
import { AuthRequest, auth, requireAdmin } from "../middleware/auth";
import { Booking } from "../models/Booking";

const router = express.Router();

/**
 * GET /payments/transfers
 * - Admin xem danh sách booking chuyển khoản theo trạng thái
 * Query:
 *   - status: verifying|awaiting_transfer|pending|paid|failed (mặc định: verifying)
 *   - date?: lọc theo ngày (yyyy-mm-dd)
 *   - courtId?: lọc theo sân
 */
router.get("/transfers", auth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status = "verifying", date, courtId } = req.query as {
      status?: string;
      date?: string;
      courtId?: string;
    };

    const allowed = ["verifying", "awaiting_transfer", "pending", "paid", "failed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const cond: any = {
      paymentMethod: "prepay_transfer",
      paymentStatus: status,
    };
    if (date) cond.date = date;
    if (courtId) cond.courtId = courtId;

    const docs = await Booking.find(cond)
      .sort({ createdAt: -1 })
      .select(
        "_id courtId courtName date startAt endAt price userId note paymentStatus transfer"
      )
      .lean();

    return res.json(docs);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /payments/transfer/initiate
 * - Yêu cầu: bookingId của booking kiểu prepay_transfer (awaiting_transfer/pending)
 * - Trả: hướng dẫn chuyển khoản + QR
 */
router.post("/transfer/initiate", auth, async (req: AuthRequest, res: Response) => {
  console.log("[initiate] from", req.ip, "user", req.user?.id, "body", req.body);
  try {
    const { bookingId } = req.body ?? {};
    if (!bookingId) return res.status(400).json({ error: "bookingId required" });

    const b = await Booking.findById(bookingId);
    if (!b) return res.status(404).json({ error: "Booking not found" });

    const isOwner = String(b.userId) === req.user!.id;
    if (!isOwner && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (b.paymentMethod !== "prepay_transfer") {
      return res.status(400).json({ error: "Not a transfer booking" });
    }
    if (b.paymentStatus === "paid") {
      return res.status(400).json({ error: "Already paid" });
    }

    // Tạo memoCode ổn định cho booking nếu chưa có
    if (!b.transfer?.memoCode) {
      const salt = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 ký tự
      const memoCode = `BK-${b.id}-${salt}`;
      b.transfer = {
        ...(b.transfer || {}),
        memoCode,
        amountExpected: Number(b.price),
      };
      await b.save();
    }

    // Thông tin ngân hàng (demo)
    const bank = {
      name: "VCB",
      accountNumber: "0123456789",
      accountName: "Cong ty ABC",
    };

    const memoEnc = encodeURIComponent(b.transfer!.memoCode!);
    const qrUrl = `https://img.vietqr.io/image/VCB-0123456789-compact.png?amount=${b.price}&addInfo=${memoEnc}&accountName=Cong%20ty%20ABC`;

    return res.json({
      // FE đang dùng info.id -> map luôn sang memoCode để không phải đổi FE
      id: b.transfer!.memoCode,
      amount: Number(b.price),
      memoCode: b.transfer!.memoCode,
      bank,
      vietqr: { url: qrUrl },
      paymentStatus: b.paymentStatus,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /payments/transfer/confirm
 * - User báo "tôi đã chuyển", đính kèm proofUrl (ảnh biên lai)
 * - Server chuyển trạng thái -> 'verifying' (đợi admin duyệt)
 */
router.post("/transfer/confirm", auth, async (req: AuthRequest, res: Response) => {
  console.log("[confirm]  from", req.ip, "user", req.user?.id, "body", req.body);
  try {
    const { bookingId, proofUrl } = req.body ?? {};
    if (!bookingId) return res.status(400).json({ error: "bookingId required" });
    if (!proofUrl) return res.status(400).json({ error: "proofUrl required" });

    const b = await Booking.findById(bookingId);
    if (!b) return res.status(404).json({ error: "Booking not found" });

    const isOwner = String(b.userId) === req.user!.id;
    if (!isOwner && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (b.paymentMethod !== "prepay_transfer") {
      return res.status(400).json({ error: "Not a transfer booking" });
    }
    if (b.paymentStatus === "paid") {
      return res.json({ ok: true }); // idempotent
    }

    // Chỉ chuyển sang verifying từ awaiting_transfer/pending
    if (
      b.paymentStatus !== "awaiting_transfer" &&
      b.paymentStatus !== "pending" &&
      b.paymentStatus !== "verifying"
    ) {
      return res.status(400).json({ error: "Invalid state" });
    }

    b.paymentStatus = "verifying";
    b.transfer = { ...(b.transfer || {}), proofUrl };
    await b.save();

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /payments/transfer/verify
 * - Admin duyệt kết quả chuyển khoản
 * body: { bookingId, bankRef?, success: boolean }
 */
router.post("/transfer/verify", auth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, bankRef, success } = req.body ?? {};
    if (!bookingId) return res.status(400).json({ error: "bookingId required" });

    const b = await Booking.findById(bookingId);
    if (!b) return res.status(404).json({ error: "Booking not found" });
    if (b.paymentMethod !== "prepay_transfer") {
      return res.status(400).json({ error: "Not a transfer booking" });
    }

    if (b.paymentStatus === "paid") {
      return res.json({ ok: true }); // idempotent
    }

    if (success) {
      b.paymentStatus = "paid";
      b.holdUntil = null; // đã trả tiền -> bỏ giữ chỗ
      b.transfer = {
        ...(b.transfer || {}),
        bankRef,
        verifiedBy: req.user!.id as any,
        verifiedAt: new Date(),
      };
    } else {
      b.paymentStatus = "failed";
      // policy tuỳ bạn: có thể clear holdUntil
    }

    await b.save();
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
