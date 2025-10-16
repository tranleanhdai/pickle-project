import { Router } from "express";
import { Types } from "mongoose";
import { auth, requireAdmin, type AuthRequest } from "../middleware/auth";
import Court from "../models/Court";

const router = Router();

// Log tất cả request vào router này
router.use((req, _res, next) => {
  console.log(`[courts] ${req.method} ${req.originalUrl}`);
  next();
});

/** ===== Public: list all courts (có thể lọc theo ?venueId=) ===== */
router.get("/", async (req, res) => {
  const venueId = req.query.venueId as string | undefined;

  if (venueId != null) {
    if (!Types.ObjectId.isValid(venueId)) {
      return res.status(400).json({ error: "Invalid venueId" });
    }
  }

  const query = venueId ? { venueId } : {};
  const courts = await Court.find(query).sort(venueId ? { createdAt: 1 } : { createdAt: -1 });
  res.json(courts);
});

/** ===== Public: get court by id ===== */
router.get("/:id", async (req, res) => {
  const id = String(req.params.id || "");
  console.log(`[courts] detail id=`, id);

  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

  const court = await Court.findById(id);
  if (!court) return res.status(404).json({ error: "Court not found" });
  res.json(court);
});

/** ===== Admin: create court ===== */
router.post("/", auth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, venueId, pricePerHour, description, coverUrl, isActive } = req.body;

    if (!name) return res.status(400).json({ error: "Missing court name" });
    if (!venueId || !Types.ObjectId.isValid(String(venueId))) {
      return res.status(400).json({ error: "Invalid venueId" });
    }

    const court = await Court.create({
      name,
      venueId,
      pricePerHour: Number(pricePerHour) || 0,
      description: description || "",
      coverUrl: coverUrl ?? null,
      isActive: isActive !== false,
    });

    res.status(201).json(court);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Create court failed" });
  }
});

/** ===== Admin: update court ===== */
router.patch("/:id", auth, requireAdmin, async (req: AuthRequest, res) => {
  const id = String(req.params.id || "");
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const allowed = ["name", "venueId", "pricePerHour", "description", "coverUrl", "isActive"];
    const patch: Record<string, any> = {};
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k];

    if (patch.venueId && !Types.ObjectId.isValid(String(patch.venueId))) {
      return res.status(400).json({ error: "Invalid venueId" });
    }

    const updated = await Court.findByIdAndUpdate(id, patch, { new: true });
    if (!updated) return res.status(404).json({ error: "Court not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Update court failed" });
  }
});

/** ===== Admin: delete court ===== */
router.delete("/:id", auth, requireAdmin, async (req: AuthRequest, res) => {
  const id = String(req.params.id || "");
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const court = await Court.findById(id);
    if (!court) return res.status(404).json({ error: "Court not found" });

    await court.deleteOne();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Delete court failed" });
  }
});

/** ===== Admin: update cover only ===== */
router.patch("/:id/cover", auth, requireAdmin, async (req: AuthRequest, res) => {
  const id = String(req.params.id || "");
  const coverUrl = String(req.body?.coverUrl || "");

  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });
  if (!coverUrl) return res.status(400).json({ error: "Missing coverUrl" });

  const court = await Court.findByIdAndUpdate(
    id,
    { $set: { coverUrl } },
    { new: true, lean: true }
  );
  if (!court) return res.status(404).json({ error: "Court not found" });

  res.json({
    id: court._id.toString(),
    name: (court as any).name,
    venueId: (court as any).venueId?.toString(),
    coverUrl: (court as any).coverUrl ?? null,
  });
});

export default router;
