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
router.use(auth_1.authenticate);
router.get("/", async (req, res) => {
    const rows = await db_1.db.select().from(schema_1.cartItems).where((0, drizzle_orm_1.eq)(schema_1.cartItems.userId, req.user.id));
    // join product
    const result = [];
    for (const c of rows) {
        const [p] = await db_1.db.select().from(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.id, c.productId));
        result.push({ ...c, product: p });
    }
    res.json(result);
});
const addSchema = zod_1.z.object({ productId: zod_1.z.string().uuid(), quantity: zod_1.z.number().int().min(1).default(1) });
router.post("/", (0, validate_1.validate)(addSchema), async (req, res) => {
    const { productId, quantity } = req.body;
    const [p] = await db_1.db.select().from(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.id, productId));
    if (!p)
        return res.status(404).json({ message: "Product not found" });
    // upsert
    const existing = await db_1.db.select().from(schema_1.cartItems).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.userId, req.user.id), (0, drizzle_orm_1.eq)(schema_1.cartItems.productId, productId)));
    if (existing.length) {
        const newQty = Math.min(p.stock, existing[0].quantity + quantity);
        const [updated] = await db_1.db.update(schema_1.cartItems).set({ quantity: newQty, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.cartItems.id, existing[0].id)).returning();
        return res.json(updated);
    }
    const [created] = await db_1.db.insert(schema_1.cartItems).values({ userId: req.user.id, productId, quantity: Math.min(p.stock, quantity) }).returning();
    res.status(201).json(created);
});
router.put("/:id", async (req, res) => {
    const { quantity } = req.body;
    const [c] = await db_1.db.select().from(schema_1.cartItems).where((0, drizzle_orm_1.eq)(schema_1.cartItems.id, req.params.id));
    if (!c || c.userId !== req.user.id)
        return res.status(404).json({ message: "Not found" });
    const [p] = await db_1.db.select().from(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.id, c.productId));
    const q = Math.max(1, Math.min(p.stock, Number(quantity)));
    const [updated] = await db_1.db.update(schema_1.cartItems).set({ quantity: q, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.cartItems.id, req.params.id)).returning();
    res.json(updated);
});
router.delete("/:id", async (req, res) => {
    const [c] = await db_1.db.select().from(schema_1.cartItems).where((0, drizzle_orm_1.eq)(schema_1.cartItems.id, req.params.id));
    if (!c || c.userId !== req.user.id)
        return res.status(404).json({ message: "Not found" });
    await db_1.db.delete(schema_1.cartItems).where((0, drizzle_orm_1.eq)(schema_1.cartItems.id, req.params.id));
    res.json({ message: "Removed" });
});
router.delete("/", async (req, res) => {
    await db_1.db.delete(schema_1.cartItems).where((0, drizzle_orm_1.eq)(schema_1.cartItems.userId, req.user.id));
    res.json({ message: "Cleared" });
});
exports.default = router;
//# sourceMappingURL=cart.js.map