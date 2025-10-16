import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { AuthedUser } from "./auth";

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const h = req.headers.authorization || "";
    if (!h.startsWith("Bearer ")) return next();

    const token = h.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const userId = String(decoded.sub ?? decoded.id);  // ✅
    (req as any).user = {
      id: userId,
      role: String(decoded.role || "user"),
      name: decoded.name,
    } as AuthedUser;
  } catch {
    // coi như chưa đăng nhập
  }
  next();
}
