// pickle-api/src/routes/venues.ts
import { Router } from "express";
import { Types } from "mongoose";
import { Venue } from "../models/Venue";
import { auth } from "../middleware/auth";
// Nếu bạn đã có middleware phân quyền admin thì import ở đây.
// Nếu CHƯA có, tạm dùng pass-through:
// const requireAdmin = (_req: any, _res: any, next: any) => next();
import { requireAdmin } from "../middleware/rbac";

const router = Router();

/** ====== Logging mọi request vào router này (debug) ====== */
router.use((req, _res, next) => {
  console.log("[venues]", req.method, req.originalUrl, {
    params: req.params,
    query: req.query,
    body: req.body,
  });
  next();
});

/** ====== GET /api/venues → list ====== */
router.get("/", async (_req, res) => {
  const venues = await Venue.find().sort({ createdAt: -1 }).lean();
  res.json(
    venues.map((v) => ({
      id: v._id.toString(),
      name: v.name,
      address: v.address,
      coverUrl: (v as any).coverUrl ?? null,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }))
  );
});

/** ====== GET /api/venues/:id → detail ====== */
router.get("/:id", async (req, res) => {
  const id = String(req.params.id || "");
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

  const v = await Venue.findById(id).lean();
  if (!v) return res.status(404).json({ error: "Venue not found" });

  res.json({
    id: v._id.toString(),
    name: v.name,
    address: v.address,
    coverUrl: (v as any).coverUrl ?? null,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  });
});

/** ====== POST /api/venues → create (admin) ====== */
router.post("/", auth, requireAdmin, async (req, res) => {
  try {
    const { name, address, coverUrl } = req.body ?? {};
    if (!name) return res.status(400).json({ error: "Missing name" });

    const v = await Venue.create({
      name: String(name).trim(),
      address: String(address || "").trim(),
      coverUrl: coverUrl ?? null,
    });

    res.status(201).json({
      id: v._id.toString(),
      name: v.name,
      address: v.address,
      coverUrl: (v as any).coverUrl ?? null,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    });
  } catch (e: any) {
    console.error("create venue error", e);
    res.status(500).json({ error: e?.message || "Create venue failed" });
  }
});

/** ====== PATCH /api/venues/:id → update (admin) ====== */
router.patch("/:id", auth, requireAdmin, async (req, res) => {
  const id = String(req.params.id || "");
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const allowed = ["name", "address", "coverUrl"];
    const patch: Record<string, any> = {};
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k];

    const v = await Venue.findByIdAndUpdate(id, patch, { new: true }).lean();
    if (!v) return res.status(404).json({ error: "Venue not found" });

    res.json({
      id: v._id.toString(),
      name: v.name,
      address: v.address,
      coverUrl: (v as any).coverUrl ?? null,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    });
  } catch (e: any) {
    console.error("update venue error", e);
    res.status(500).json({ error: e?.message || "Update venue failed" });
  }
});

/** ====== DELETE /api/venues/:id → delete (admin) ====== */
router.delete("/:id", auth, requireAdmin, async (req, res) => {
  const id = String(req.params.id || "");
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const v = await Venue.findById(id);
    if (!v) return res.status(404).json({ error: "Venue not found" });

    await v.deleteOne();
    res.json({ ok: true });
  } catch (e: any) {
    console.error("delete venue error", e);
    res.status(500).json({ error: e?.message || "Delete venue failed" });
  }
});

export default router;
