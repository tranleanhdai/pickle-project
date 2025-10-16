// src/routes/posts.ts
import { Router } from "express";
import { Types } from "mongoose";
import { auth, type AuthRequest } from "../middleware/auth";
import { optionalAuth } from "../middleware/optionalAuth";
import { Post } from "../models/Post";
import { Like } from "../models/Like";
import { Comment } from "../models/Comment";
import { View } from "../models/View";

const router = Router();
const oid = (s: string) => new Types.ObjectId(String(s));

/** GET /api/posts?courtId=&limit=&cursor=  (KHÔNG bắt buộc login) */
router.get("/", optionalAuth, async (req: AuthRequest, res) => {
  const courtId = req.query.courtId as string | undefined;
  const limit = Number(req.query.limit ?? 20);
  const cursor = req.query.cursor as string | undefined;
  if (!courtId || !Types.ObjectId.isValid(courtId)) {
    return res.status(400).json({ error: "Missing/invalid courtId" });
  }
  const n = Math.min(Math.max(limit || 20, 1), 50);
  const cond: any = { courtId: oid(courtId) };
  if (cursor && Types.ObjectId.isValid(cursor)) cond._id = { $lt: oid(cursor) };

  const items = await Post.find(cond).sort({ _id: -1 }).limit(n).lean();

  let likedSet = new Set<string>();
  if (req.user && items.length) {
    const likes = await Like.find({
      userId: oid(req.user.id),
      postId: { $in: items.map((i: any) => i._id) },
    })
      .select("postId")
      .lean();
    likedSet = new Set(likes.map((l: any) => String(l.postId)));
  }

  const last = items[items.length - 1];
  const nextCursor = items.length === n && last ? String(last._id) : null;

  res.json({
    items: items.map((p: any) => ({ ...mongoPostToDTO(p), liked: likedSet.has(String(p._id)) })),
    nextCursor,
  });
});

/** GET /api/posts/:id  (KHÔNG bắt buộc login) */
router.get("/:id", optionalAuth, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });
  const p = await Post.findById(id).lean();
  if (!p) return res.status(404).json({ error: "Post not found" });
  res.json(mongoPostToDTO(p));
});

/** POST /api/posts */
router.post("/", auth, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Chưa đăng nhập" });
  const { courtId, content = "", images = [] } = req.body || {};
  if (!courtId || !Types.ObjectId.isValid(courtId)) {
    return res.status(400).json({ error: "Invalid courtId" });
  }
  if (!Array.isArray(images) || images.some((i: any) => !i?.url)) {
    return res.status(400).json({ error: "images must be [{url,w,h,mime}]" });
  }
  const doc = await Post.create({
    courtId: oid(courtId),
    userId: oid(req.user.id),
    content,
    images,
  });
  res.status(201).json(mongoPostToDTO(doc.toObject()));
});

/** POST /api/posts/:id/like */
router.post("/:id/like", auth, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Chưa đăng nhập" });
  const id = req.params.id as string;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    await Like.create({ postId: oid(id), userId: oid(req.user.id) });
    await Post.findByIdAndUpdate(oid(id), { $inc: { likeCount: 1 } });
  } catch (e: any) {
    if (e?.code === 11000) return res.json({ ok: true, duplicated: true });
  }
  res.json({ ok: true });
});

/** DELETE /api/posts/:id/like */
router.delete("/:id/like", auth, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Chưa đăng nhập" });
  const id = req.params.id as string;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });
  const r = await Like.findOneAndDelete({ postId: oid(id), userId: oid(req.user.id) });
  if (r) await Post.findByIdAndUpdate(oid(id), { $inc: { likeCount: -1 } });
  res.json({ ok: true });
});

/** POST /api/posts/:id/comments */
router.post("/:id/comments", auth, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Chưa đăng nhập" });
  const id = req.params.id as string;
  const { content, parentId } = (req.body ?? {}) as { content?: string; parentId?: string };
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });
  if (!content || typeof content !== "string") return res.status(400).json({ error: "Missing content" });

  const c = await Comment.create({
    postId: oid(id),
    userId: oid(req.user.id),
    content,
    parentId: parentId && Types.ObjectId.isValid(parentId) ? oid(parentId) : null,
  });
  await Post.findByIdAndUpdate(oid(id), { $inc: { commentCount: 1 } });

  res.status(201).json({
    id: String(c._id),
    postId: String(c.postId),
    userId: String(c.userId),
    content: c.content,
    parentId: c.parentId ? String(c.parentId) : null,
    createdAt: c.createdAt,
  });
});

/** GET /api/posts/:id/comments  (KHÔNG bắt buộc login) */
router.get("/:id/comments", optionalAuth, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const limit = Number(req.query.limit ?? 50);
  const cursor = req.query.cursor as string | undefined;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });
  const n = Math.min(Math.max(limit || 50, 1), 100);
  const cond: any = { postId: oid(id) };
  if (cursor && Types.ObjectId.isValid(cursor)) cond._id = { $lt: oid(cursor) };
  const items = await Comment.find(cond).sort({ _id: -1 }).limit(n).lean();
  const last = items[items.length - 1];
  const nextCursor = items.length === n && last ? String(last._id) : null;

  res.json({
    items: items.map((c: any) => ({
      id: String(c._id),
      postId: String(c.postId),
      userId: String(c.userId),
      content: c.content,
      parentId: c.parentId ? String(c.parentId) : null,
      createdAt: c.createdAt,
    })),
    nextCursor,
  });
});

/** POST /api/posts/:id/view */
router.post("/:id/view", auth, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Chưa đăng nhập" });
  const id = req.params.id as string;
  const day = req.body?.day as string | undefined;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    await View.create({ postId: oid(id), userId: oid(req.user.id), day });
    await Post.findByIdAndUpdate(oid(id), { $inc: { viewCount: 1 } });
  } catch (e: any) {
    if (e?.code === 11000) return res.json({ ok: true, duplicated: true });
  }
  res.json({ ok: true });
});

function mongoPostToDTO(p: any) {
  return {
    id: String(p._id),
    courtId: String(p.courtId),
    userId: String(p.userId),
    content: p.content || "",
    images: (p.images || []).map((i: any) => ({ url: i.url, w: i.w, h: i.h, mime: i.mime })),
    likeCount: p.likeCount || 0,
    commentCount: p.commentCount || 0,
    viewCount: p.viewCount || 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export default router;
