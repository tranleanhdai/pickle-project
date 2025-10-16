import { Router } from "express";
import crypto from "crypto";
import { auth, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * POST /api/uploads/cloudinary/sign
 * body: { folder?: string }
 * return: { cloudName, apiKey, timestamp, folder, signature }
 */
router.post("/uploads/cloudinary/sign", auth, (req: AuthRequest, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: "Missing Cloudinary envs" });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = typeof req.body?.folder === "string" ? req.body.folder : "pickle";
  // Build to-sign string theo Cloudinary rule: key=val&...&timestamp=... + apiSecret
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret.startsWith("&") ? "" : ""}`;
  const signature = crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");

  res.json({ cloudName, apiKey, timestamp, folder, signature });
});

export default router;
