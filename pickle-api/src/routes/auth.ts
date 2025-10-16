// pickle-api/src/routes/auth.ts
import { Router } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { auth } from "../middleware/auth";
import { User } from "../models/User";
import { PasswordReset } from "../models/PasswordReset";

const router = Router();

/** Debug log (tuỳ chọn) */
router.use((req, _res, next) => {
  console.log("[auth]", req.method, req.originalUrl);
  next();
});

/** ============ Mailer (Gmail SMTP) ============ */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

/** Helper: ký JWT dùng sub */
function signToken(payload: any) {
  const { id, role, ...rest } = payload || {};
  return jwt.sign({ sub: id, role, ...rest }, process.env.JWT_SECRET as string, {
    expiresIn: Number(process.env.JWT_EXPIRES || 604800),
  });
}

/** ============ REGISTER (username + email) ============ */
// PATH CHUẨN: /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body ?? {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: "username, email, password required" });
    }

    const existed = await User.findOne({
      $or: [{ username: String(username).trim() }, { email: String(email).toLowerCase().trim() }],
    });
    if (existed) return res.status(409).json({ error: "Username or email already exists" });

    const u = new User({
      username: String(username).trim(),
      email: String(email).toLowerCase().trim(),
    });
    await u.setPassword(String(password));
    await u.save();

    const token = signToken({ id: u._id, role: (u as any).role });

    return res.status(201).json({
      token,
      user: {
        id: String(u._id),
        role: (u as any).role,
        name: u.username,
        email: u.email,
      },
    });
  } catch (e) {
    console.error("register error", e);
    return res.status(500).json({ error: "Server error" });
  }
});

/** ============ LOGIN (username OR email) ============ */
// PATH CHUẨN: /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: "username, password required" });
    }

    const key = String(username).trim();
    const user = await User.findOne({
      $or: [{ username: key }, { email: key.toLowerCase() }],
    }); // KHÔNG .lean()

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await user.validatePassword(String(password));
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({ id: user._id, role: (user as any).role, name: user.username });
    return res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email, role: (user as any).role },
    });
  } catch (e) {
    console.error("login error", e);
    return res.status(500).json({ error: "Server error" });
  }
});

/** ============ /me ============ */
// PATH CHUẨN: /api/auth/me
router.get("/me", auth, async (req, res) => {
  try {
    const u = await User.findById((req as any).user.id).lean();
    if (!u) return res.status(404).json({ error: "User not found" });
    return res.json({
      id: String(u._id),
      role: (u as any).role,
      name: u.username,
      username: u.username,
      email: u.email,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    });
  } catch (e) {
    console.error("me error", e);
    return res.status(500).json({ error: "Server error" });
  }
});

/** ============ PASSWORD RESET ============ */
// PATH CHUẨN: /api/auth/password/request
router.post("/password/request", async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!email) return res.status(400).json({ error: "email required" });

    const norm = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: norm });
    if (!user) return res.json({ ok: true }); // ẩn tồn tại

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await PasswordReset.deleteMany({ email: norm });
    await PasswordReset.create({ email: norm, token, expiresAt });

    const webBase = process.env.RESET_WEB_URL!;
    const resetLink = `${webBase}?token=${token}`;

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: norm,
      subject: `[${process.env.APP_NAME || "App"}] Khôi phục mật khẩu`,
      html: `
        <p>Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu.</p>
        <p><a href="${resetLink}">👉 Nhấn vào đây để đặt lại mật khẩu</a></p>
        <p><small>Hiệu lực đến: ${expiresAt.toLocaleString()}</small></p>
      `,
      text: `Reset link: ${resetLink}`,
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("reset/request error", e);
    return res.status(500).json({ error: "Server error" });
  }
});

// PATH CHUẨN: /api/auth/password/confirm
router.post("/password/confirm", async (req, res) => {
  try {
    const { token, newPassword } = req.body ?? {};
    if (!token || !newPassword) {
      return res.status(400).json({ error: "token, newPassword required" });
    }

    const pr = await PasswordReset.findOne({ token });
    if (!pr) return res.status(400).json({ error: "Invalid token" });
    if (pr.expiresAt < new Date()) return res.status(400).json({ error: "Token expired" });

    const user = await User.findOne({ email: pr.email });
    if (!user) return res.status(404).json({ error: "User not found" });

    await user.setPassword(String(newPassword));
    await user.save();
    await PasswordReset.deleteMany({ email: pr.email });

    return res.json({ ok: true });
  } catch (e) {
    console.error("reset/confirm error", e);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
