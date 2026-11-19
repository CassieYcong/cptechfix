import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { reviews, orders, repairs, users, products } from "../schema";
import { eq, desc, sql } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import { validate } from "../middlewares/validate";

const router = Router();

const reviewSchema = z.object({
  orderId: z.string().uuid().optional(),
  repairId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
});

router.get("/product-stats", async (_req, res) => {
  const rows = await db.select().from(reviews);
  const map = new Map<string, { count: number; avg: number }>();
  for (const r of rows) {
    if (!r.productId) continue;
    const cur = map.get(r.productId) || { count: 0, avg: 0 };
    cur.count += 1;
    cur.avg += Number(r.rating);
    map.set(r.productId, cur);
  }
  const out = Array.from(map.entries()).map(([productId, v]) => ({ productId, totalReviews: v.count, avgRating: Math.round((v.avg / v.count) * 10) / 10, rating: Math.round((v.avg / v.count) * 10) / 10 }));
  res.json(out);
});

router.get("/product/:productId", async (req, res) => {
  const rows = await db.select().from(reviews).where(eq(reviews.productId, req.params.productId)).orderBy(desc(reviews.createdAt));
  const visible = rows.filter((r) => r.moderationStatus === "APPROVED" || r.moderationStatus === "VISIBLE");
  const out = [];
  for (const r of visible) {
    const [u] = await db.select({ id: users.id, fullName: users.fullName, email: users.email }).from(users).where(eq(users.id, r.userId));
    out.push({ ...r, user: u || null });
  }
  res.json(out);
});

const productReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
  title: z.string().optional(),
});

router.post("/product/:productId", authenticate, validate(productReviewSchema), async (req: AuthRequest, res) => {
  const [p] = await db.select().from(products).where(eq(products.id, req.params.productId));
  if (!p) return res.status(404).json({ message: "Product not found" });
  const d = req.body;
  const existing = await db.select().from(reviews).where(eq(reviews.userId, req.user!.id));
  const dup = existing.find((r) => r.productId === req.params.productId);
  if (dup) {
    const [updated] = await db.update(reviews).set({ rating: d.rating, comment: d.comment, title: d.title || dup.title, moderationStatus: "PENDING", updatedAt: new Date() }).where(eq(reviews.id, dup.id)).returning();
    return res.json(updated);
  }
  const [rev] = await db.insert(reviews).values({
    userId: req.user!.id, productId: req.params.productId, rating: d.rating, title: d.title, comment: d.comment, moderationStatus: "PENDING",
  }).returning();
  res.status(201).json(rev);
});

router.post("/", authenticate, validate(reviewSchema), async (req: AuthRequest, res) => {
  const d = req.body;
  if (!d.orderId && !d.repairId) return res.status(400).json({ message: "Must reference an order or repair" });
  // duplicate check
  const existing = await db.select().from(reviews).where(eq(reviews.userId, req.user!.id));
  const dup = existing.find((r) => (d.orderId && r.orderId === d.orderId) || (d.repairId && r.repairId === d.repairId));
  if (dup) return res.status(400).json({ message: "Review already exists for this transaction" });
  // completed check
  if (d.orderId) {
    const [o] = await db.select().from(orders).where(eq(orders.id, d.orderId));
    if (!o || o.orderStatus !== "COMPLETED") return res.status(400).json({ message: "Can only review completed orders" });
  }
  if (d.repairId) {
    const [r] = await db.select().from(repairs).where(eq(repairs.id, d.repairId));
    if (!r || r.status !== "COMPLETED") return res.status(400).json({ message: "Can only review completed repairs" });
  }
  const [rev] = await db.insert(reviews).values({
    userId: req.user!.id,
    orderId: d.orderId || null,
    repairId: d.repairId || null,
    rating: d.rating,
    title: d.title,
    comment: d.comment,
    moderationStatus: "PENDING",
  }).returning();
  res.status(201).json(rev);
});

router.get("/", authenticate, requireRole("ADMIN", "STAFF"), async (_req, res) => {
  const rows = await db.select().from(reviews).orderBy(desc(reviews.createdAt));
  const out = [];
  for (const r of rows) {
    const [u] = await db.select({ id: users.id, fullName: users.fullName, email: users.email, profileImage: users.profileImage }).from(users).where(eq(users.id, r.userId));
    out.push({ ...r, user: u || null });
  }
  res.json(out);
});

router.get("/my-reviews", authenticate, async (req: AuthRequest, res) => {
  const rows = await db.select().from(reviews).where(eq(reviews.userId, req.user!.id)).orderBy(desc(reviews.createdAt));
  res.json(rows);
});

router.put("/:id", authenticate, async (req: AuthRequest, res) => {
  const [r] = await db.select().from(reviews).where(eq(reviews.id, req.params.id));
  if (!r) return res.status(404).json({ message: "Not found" });
  if (r.userId !== req.user!.id && req.user!.role === "CUSTOMER") return res.status(403).json({ message: "Forbidden" });
  const d = req.body;
  const [updated] = await db.update(reviews).set({
    rating: d.rating ?? r.rating,
    title: d.title ?? r.title,
    comment: d.comment ?? r.comment,
    updatedAt: new Date(),
  }).where(eq(reviews.id, req.params.id)).returning();
  res.json(updated);
});

router.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  const [r] = await db.select().from(reviews).where(eq(reviews.id, req.params.id));
  if (!r) return res.status(404).json({ message: "Not found" });
  if (r.userId !== req.user!.id && req.user!.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  await db.delete(reviews).where(eq(reviews.id, req.params.id));
  res.json({ message: "Deleted" });
});

router.patch("/:id/moderate", authenticate, requireRole("ADMIN"), async (req, res) => {
  const { moderationStatus, reason } = req.body;
  const [r] = await db.update(reviews).set({ moderationStatus }).where(eq(reviews.id, req.params.id)).returning();
  res.json(r);
});

export default router;
