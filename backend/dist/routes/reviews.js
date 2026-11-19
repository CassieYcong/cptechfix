"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const router = (0, express_1.Router)();
const reviewSchema = zod_1.z.object({
    orderId: zod_1.z.string().uuid().optional(),
    repairId: zod_1.z.string().uuid().optional(),
    rating: zod_1.z.number().int().min(1).max(5),
    title: zod_1.z.string().optional(),
    comment: zod_1.z.string().optional(),
});
router.get("/product-stats", async (_req, res) => {
    const rows = await db_1.db.select().from(schema_1.reviews);
    const map = new Map();
    for (const r of rows) {
        if (!r.productId)
            continue;
        const cur = map.get(r.productId) || { count: 0, avg: 0 };
        cur.count += 1;
        cur.avg += Number(r.rating);
        map.set(r.productId, cur);
    }
    const out = Array.from(map.entries()).map(([productId, v]) => ({ productId, totalReviews: v.count, avgRating: Math.round((v.avg / v.count) * 10) / 10, rating: Math.round((v.avg / v.count) * 10) / 10 }));
    res.json(out);
});
router.get("/product/:productId", async (req, res) => {
    const rows = await db_1.db.select().from(schema_1.reviews).where((0, drizzle_orm_1.eq)(schema_1.reviews.productId, req.params.productId)).orderBy((0, drizzle_orm_1.desc)(schema_1.reviews.createdAt));
    const visible = rows.filter((r) => r.moderationStatus === "APPROVED" || r.moderationStatus === "VISIBLE");
    const out = [];
    for (const r of visible) {
        const [u] = await db_1.db.select({ id: schema_1.users.id, fullName: schema_1.users.fullName, email: schema_1.users.email }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, r.userId));
        out.push({ ...r, user: u || null });
    }
    res.json(out);
});
const productReviewSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().min(1),
    title: zod_1.z.string().optional(),
});
router.post("/product/:productId", auth_1.authenticate, (0, validate_1.validate)(productReviewSchema), async (req, res) => {
    const [p] = await db_1.db.select().from(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.id, req.params.productId));
    if (!p)
        return res.status(404).json({ message: "Product not found" });
    const d = req.body;
    const existing = await db_1.db.select().from(schema_1.reviews).where((0, drizzle_orm_1.eq)(schema_1.reviews.userId, req.user.id));
    const dup = existing.find((r) => r.productId === req.params.productId);
    if (dup) {
        const [updated] = await db_1.db.update(schema_1.reviews).set({ rating: d.rating, comment: d.comment, title: d.title || dup.title, moderationStatus: "PENDING", updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.reviews.id, dup.id)).returning();
        return res.json(updated);
    }
    const [rev] = await db_1.db.insert(schema_1.reviews).values({
        userId: req.user.id, productId: req.params.productId, rating: d.rating, title: d.title, comment: d.comment, moderationStatus: "PENDING",
    }).returning();
    res.status(201).json(rev);
});
router.post("/", auth_1.authenticate, (0, validate_1.validate)(reviewSchema), async (req, res) => {
    const d = req.body;
    if (!d.orderId && !d.repairId)
        return res.status(400).json({ message: "Must reference an order or repair" });
    // duplicate check
    const existing = await db_1.db.select().from(schema_1.reviews).where((0, drizzle_orm_1.eq)(schema_1.reviews.userId, req.user.id));
    const dup = existing.find((r) => (d.orderId && r.orderId === d.orderId) || (d.repairId && r.repairId === d.repairId));
    if (dup)
        return res.status(400).json({ message: "Review already exists for this transaction" });
    // completed check
    if (d.orderId) {
        const [o] = await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, d.orderId));
        if (!o || o.orderStatus !== "COMPLETED")
            return res.status(400).json({ message: "Can only review completed orders" });
    }
    if (d.repairId) {
        const [r] = await db_1.db.select().from(schema_1.repairs).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, d.repairId));
        if (!r || r.status !== "COMPLETED")
            return res.status(400).json({ message: "Can only review completed repairs" });
    }
    const [rev] = await db_1.db.insert(schema_1.reviews).values({
        userId: req.user.id,
        orderId: d.orderId || null,
        repairId: d.repairId || null,
        rating: d.rating,
        title: d.title,
        comment: d.comment,
        moderationStatus: "PENDING",
    }).returning();
    res.status(201).json(rev);
});
router.get("/", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"), async (_req, res) => {
    const rows = await db_1.db.select().from(schema_1.reviews).orderBy((0, drizzle_orm_1.desc)(schema_1.reviews.createdAt));
    const out = [];
    for (const r of rows) {
        const [u] = await db_1.db.select({ id: schema_1.users.id, fullName: schema_1.users.fullName, email: schema_1.users.email, profileImage: schema_1.users.profileImage }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, r.userId));
        out.push({ ...r, user: u || null });
    }
    res.json(out);
});
router.get("/my-reviews", auth_1.authenticate, async (req, res) => {
    const rows = await db_1.db.select().from(schema_1.reviews).where((0, drizzle_orm_1.eq)(schema_1.reviews.userId, req.user.id)).orderBy((0, drizzle_orm_1.desc)(schema_1.reviews.createdAt));
    res.json(rows);
});
router.put("/:id", auth_1.authenticate, async (req, res) => {
    const [r] = await db_1.db.select().from(schema_1.reviews).where((0, drizzle_orm_1.eq)(schema_1.reviews.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    if (r.userId !== req.user.id && req.user.role === "CUSTOMER")
        return res.status(403).json({ message: "Forbidden" });
    const d = req.body;
    const [updated] = await db_1.db.update(schema_1.reviews).set({
        rating: d.rating ?? r.rating,
        title: d.title ?? r.title,
        comment: d.comment ?? r.comment,
        updatedAt: new Date(),
    }).where((0, drizzle_orm_1.eq)(schema_1.reviews.id, req.params.id)).returning();
    res.json(updated);
});
router.delete("/:id", auth_1.authenticate, async (req, res) => {
    const [r] = await db_1.db.select().from(schema_1.reviews).where((0, drizzle_orm_1.eq)(schema_1.reviews.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    if (r.userId !== req.user.id && req.user.role !== "ADMIN")
        return res.status(403).json({ message: "Forbidden" });
    await db_1.db.delete(schema_1.reviews).where((0, drizzle_orm_1.eq)(schema_1.reviews.id, req.params.id));
    res.json({ message: "Deleted" });
});
router.patch("/:id/moderate", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN"), async (req, res) => {
    const { moderationStatus, reason } = req.body;
    const [r] = await db_1.db.update(schema_1.reviews).set({ moderationStatus }).where((0, drizzle_orm_1.eq)(schema_1.reviews.id, req.params.id)).returning();
    res.json(r);
});
exports.default = router;
//# sourceMappingURL=reviews.js.map