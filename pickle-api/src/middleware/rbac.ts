// src/middleware/rbac.ts
import { Response, NextFunction, RequestHandler } from "express";
import { AuthRequest } from "./auth"; // <- dùng type đã có
import Booking from "../models/Booking";

export type GetOwnerId =
  (req: AuthRequest) => Promise<string | null> | string | null;

/**
 * Middleware factory: kiểm tra owner OR thuộc 1 trong các roles cho phép (mặc định chỉ 'admin').
 */
export function requireOwnerOrRole(
  getOwnerId: GetOwnerId,
  allowedRoles: Array<"admin" | "staff" | "user"> = ["admin"]
): RequestHandler {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const u = req.user;
      if (!u) return res.status(401).json({ error: "Unauthorized" });

      // role-based pass
      if (allowedRoles.includes(u.role)) return next();

      // owner check
      const ownerId = await getOwnerId(req);
      if (!ownerId) return res.status(404).json({ error: "Owner not found" });

      if (String(ownerId) !== String(u.id)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

/** Helper: lấy ownerId từ bookingId (params/body) */
export const getBookingOwner: GetOwnerId = async (req) => {
  const bookingId =
    (req.params as any)?.bookingId ||
    (req.body as any)?.bookingId;
  if (!bookingId) return null;

  const b = await Booking.findById(bookingId).select("userId");
  return b?.userId ? b.userId.toString() : null;
};

export const requireAdmin: RequestHandler = (req: AuthRequest, res, next) => {
  const u = req.user;
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  if (u.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
};