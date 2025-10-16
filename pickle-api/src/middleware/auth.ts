// pickle-api/src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthedUser = {
  id: string;
  role: "admin" | "user" | "staff";
  name?: string;
};

export interface AuthRequest extends Request {
  user?: AuthedUser;
}

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Thiếu token" });
  }

  try {
    const decoded = jwt.verify(h.slice(7), process.env.JWT_SECRET!) as any;
    const userId = String(decoded.sub ?? decoded.id); // hỗ trợ sub|id
    req.user = { id: userId, role: decoded.role, name: decoded.name };
    next();
  } catch {
    return res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Chưa đăng nhập" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Chỉ admin mới có quyền" });
  next();
}
