// src/routes/payments.ts
import express, { Response } from "express";
import crypto from "crypto";
import qs from "qs";
import { AuthRequest, auth, requireAdmin } from "../middleware/auth";
import { Booking } from "../models/Booking";

const router = express.Router();

/* =======================
   PART A - CK THỦ CÔNG (GIỮ NGUYÊN)
   ======================= */

/**
 * GET /payments/transfers
 * - Admin xem danh sách booking chuyển khoản theo trạng thái
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
 * - Trả hướng dẫn CK (luồng cũ – giữ nguyên cho backward-compat)
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

    // Demo bank info (giữ)
    const bank = {
      name: "VCB",
      accountNumber: "0123456789",
      accountName: "Cong ty ABC",
    };

    const memoEnc = encodeURIComponent(b.transfer!.memoCode!);
    const qrUrl = `https://img.vietqr.io/image/VCB-0123456789-compact.png?amount=${b.price}&addInfo=${memoEnc}&accountName=Cong%20ty%20ABC`;

    return res.json({
      id: b.transfer!.memoCode, // FE cũ đang dùng info.id
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
 * - Luồng thủ công cũ
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
 * - Luồng thủ công cũ
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
    }

    await b.save();
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

/* =======================
   PART B - VNPAY (TỰ ĐỘNG)
   ======================= */

const {
  VNP_TMN_CODE,
  VNP_HASH_SECRET,
  VNP_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  VNP_RETURN_URL,
  VNP_VERSION = "2.1.0",
  VNP_LOCALE = "vn",
  VNP_CURR = "VND",
  APP_SCHEME = "picklecourts",
} = process.env as Record<string, string>;

function sortObject(obj: Record<string, any>) {
  const sorted: Record<string, any> = {};
  Object.keys(obj)
    .sort()
    .forEach((k) => (sorted[k] = obj[k]));
  return sorted;
}

// Ký SHA512 -> hex (UPPERCASE)
function hmacSHA512(secret: string, data: string) {
  return crypto.createHmac("sha512", secret).update(Buffer.from(data, "utf-8")).digest("hex").toUpperCase();
}

// Encode theo RFC1738 (space -> '+') và GIỮ NGUYÊN value đã encode khi stringify
function toVnpString(params: Record<string, any>) {
  // params đã sort trước khi truyền vào
  return qs.stringify(params, {
    encodeValuesOnly: true,   // chỉ encode value
    format: "RFC1738",        // ' ' -> '+'
  });
}

function formatVnpDate(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function getClientIp(req: express.Request) {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
}

/**
 * POST /payments/vnpay/create
 */
router.post("/vnpay/create", auth, async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, bankCode } = (req.body ?? {}) as { bookingId?: string; bankCode?: string };
    if (!bookingId) return res.status(400).json({ error: "bookingId required" });

    const b = await Booking.findById(bookingId);
    if (!b) return res.status(404).json({ error: "Booking not found" });

    const isOwner = String(b.userId) === req.user!.id;
    if (!isOwner && req.user!.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    if (b.paymentMethod !== "prepay_transfer") return res.status(400).json({ error: "Not a prepay booking" });
    if (b.paymentStatus === "paid") return res.status(409).json({ error: "Already paid" });

    // Lấy & trim cấu hình để tránh dấu cách thừa trong .env
    const TMN = (process.env.VNP_TMN_CODE || "").trim();
    const SECRET = (process.env.VNP_HASH_SECRET || "").trim();
    const RETURN_URL = (process.env.VNP_RETURN_URL || "").trim();
    const URL = (process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html").trim();
    const VERS = (process.env.VNP_VERSION || "2.1.0").trim();
    const LOCALE = (process.env.VNP_LOCALE || "vn").trim();
    const CURR = (process.env.VNP_CURR || "VND").trim();

    if (!TMN || !SECRET || !RETURN_URL) return res.status(500).json({ error: "VNPAY is not configured" });

    const amountVnd = Math.round(Number(b.price || 0));
    if (!amountVnd || amountVnd <= 0) return res.status(400).json({ error: "Invalid amount" });

    // TxnRef ổn định theo booking
    const txnRef = b.paymentId || `${String(b._id).slice(-6)}${Date.now()}`;
    if (!b.paymentId) { b.paymentId = txnRef; await b.save(); }

    const vnpParamsRaw: Record<string, any> = {
      vnp_Version: VERS,
      vnp_Command: "pay",
      vnp_TmnCode: TMN,
      vnp_Locale: LOCALE,
      vnp_CurrCode: CURR,
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan dat san ${txnRef}`, // KHÔNG dấu tiếng Việt để tránh lẫn encode
      vnp_OrderType: "other",
      vnp_Amount: amountVnd * 100,
      vnp_ReturnUrl: RETURN_URL,
      vnp_IpAddr: getClientIp(req) || "127.0.0.1",
      vnp_CreateDate: formatVnpDate(),
    };
    if (bankCode) vnpParamsRaw["vnp_BankCode"] = bankCode;

    // 1) sort
    const vnpParams = sortObject(vnpParamsRaw);

    // 2) build CHÍNH XÁC chuỗi sẽ gửi đi (RFC1738) -> dùng nó để ký
    const signData = toVnpString(vnpParams);

    // 3) ký
    const secureHash = hmacSHA512(SECRET, signData);

    // 4) ráp URL GỬI ĐI từ CHÍNH chuỗi signData (đảm bảo 100% y hệt)
    const paymentUrl = `${URL}?${signData}&vnp_SecureHashType=HmacSHA512&vnp_SecureHash=${secureHash}`;

    // log debug
    console.log("[VNPAY] TMN=%s, secret_tail=%s, return=%s", TMN, SECRET.slice(-6), RETURN_URL);
    console.log("[VNPAY] signData=", signData);
    console.log("[VNPAY] secureHash=", secureHash);

    b.addAudit("payment_initiated", req.user!.id as any, { gateway: "VNPAY", txnRef });
    await b.save();

    return res.json({ url: paymentUrl, txnRef });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Create VNPAY payment failed" });
  }
});

/**
 * GET /payments/vnpay/ipn
 */
router.get("/vnpay/ipn", async (req: express.Request, res: Response) => {
  try {
    const all = { ...(req.query as any) } as Record<string, any>;
    const receivedHash = String(all["vnp_SecureHash"] || "").toUpperCase();

    delete all["vnp_SecureHash"];
    delete all["vnp_SecureHashType"];

    const sorted = sortObject(all);

    // build verifyData theo CÙNG HÀM với lúc tạo đơn
    const verifyData = toVnpString(sorted);
    const checkHash = hmacSHA512((process.env.VNP_HASH_SECRET || "").trim(), verifyData);

    if (checkHash !== receivedHash) {
      console.warn("[VNPAY][ipn] Hash mismatch", { verifyData, checkHash, receivedHash });
      return res.json({ RspCode: "97", Message: "Invalid signature" });
    }

    const txnRef = String(all["vnp_TxnRef"]);
    const rspCode = String(all["vnp_ResponseCode"]);
    const transStatus = String(all["vnp_TransactionStatus"]);
    const amount = Number(all["vnp_Amount"]) / 100;

    const b = await Booking.findOne({ paymentId: txnRef });
    if (!b) return res.json({ RspCode: "01", Message: "Order not found" });
    if (Math.round(Number(b.price)) !== Math.round(amount)) return res.json({ RspCode: "04", Message: "Invalid amount" });
    if (b.paymentStatus === "paid") return res.json({ RspCode: "02", Message: "Order already confirmed" });

    const success = rspCode === "00" && transStatus === "00";
    if (success) {
      b.paymentStatus = "paid";
      b.holdUntil = null;
      b.transfer = { ...(b.transfer || {}), bankRef: String(all["vnp_TransactionNo"] || ""), verifiedAt: new Date() };
      b.addAudit("payment_confirmed", undefined as any, { gateway: "VNPAY", txnRef, rspCode, transStatus });
      await b.save();
      return res.json({ RspCode: "00", Message: "Confirm Success" });
    } else {
      b.paymentStatus = "failed";
      b.addAudit("payment_failed", undefined as any, { gateway: "VNPAY", txnRef, rspCode, transStatus });
      await b.save();
      return res.json({ RspCode: "00", Message: "Confirm Failed" });
    }
  } catch (e) {
    console.error(e);
    return res.json({ RspCode: "99", Message: "Unknown error" });
  }
});

/**
 * GET /payments/vnpay/return
 * Hiển thị kết quả + deep-link về app để đóng WebView
 */
router.get("/vnpay/return", async (req: express.Request, res: Response) => {
  try {
    const q = req.query as any;
    const success = q["vnp_ResponseCode"] === "00" && q["vnp_TransactionStatus"] === "00";
    const txnRef = String(q["vnp_TxnRef"] || "");
    const deeplink = `${APP_SCHEME}://payment-result?success=${success ? "1" : "0"}&ref=${txnRef}`;

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Payment result</title></head>
<body style="font-family: system-ui; padding: 24px">
  <h2>${success ? "Thanh toán thành công" : "Thanh toán thất bại"}</h2>
  <p>Mã tham chiếu: ${txnRef}</p>
  <a href="${deeplink}" style="display:inline-block;margin-top:12px;padding:10px 16px;border:1px solid #222;border-radius:8px;text-decoration:none">Quay lại ứng dụng</a>
  <script>setTimeout(function(){ window.location.href='${deeplink}'; }, 300);</script>
</body></html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  } catch (e) {
    return res.status(500).send("Something went wrong");
  }
});

export default router;
