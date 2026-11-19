"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const gen_1 = require("../utils/gen");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"));
const refundSchema = zod_1.z.object({
    paymentId: zod_1.z.string().uuid().optional(),
    orderId: zod_1.z.string().uuid().optional(),
    refundAmount: zod_1.z.number().min(0.01),
    refundMethod: zod_1.z.string().optional(),
    refundReason: zod_1.z.string().optional(),
});
router.post("/", (0, validate_1.validate)(refundSchema), async (req, res) => {
    const d = req.body;
    // duplicate check
    if (d.paymentId) {
        const existing = await db_1.db.select().from(schema_1.refunds).where((0, drizzle_orm_1.eq)(schema_1.refunds.paymentId, d.paymentId));
        const active = existing.filter((r) => r.refundStatus !== "REJECTED");
        if (active.length)
            return res.status(400).json({ message: "Refund already exists for this payment" });
    }
    // refundable amount check
    if (d.paymentId) {
        const [p] = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.id, d.paymentId));
        if (!p)
            return res.status(404).json({ message: "Payment not found" });
        const prior = await db_1.db.select().from(schema_1.refunds).where((0, drizzle_orm_1.eq)(schema_1.refunds.paymentId, d.paymentId));
        const refundedSoFar = prior.reduce((a, r) => a + Number(r.refundAmount), 0);
        if (d.refundAmount + refundedSoFar > Number(p.amount)) {
            return res.status(400).json({ message: "Refund amount exceeds refundable amount" });
        }
    }
    const [r] = await db_1.db.insert(schema_1.refunds).values({
        refundReference: (0, gen_1.genRef)("REF"),
        paymentId: d.paymentId || null,
        orderId: d.orderId || null,
        refundAmount: String(d.refundAmount),
        refundMethod: d.refundMethod,
        refundReason: d.refundReason,
        refundStatus: "REQUESTED",
        processedBy: req.user.id,
    }).returning();
    await db_1.db.insert(schema_1.refundHistory).values({ refundId: r.id, newStatus: "REQUESTED", remarks: "Created", updatedBy: req.user.id });
    res.status(201).json(r);
});
router.get("/", async (_req, res) => {
    const rows = await db_1.db.select().from(schema_1.refunds).orderBy((0, drizzle_orm_1.desc)(schema_1.refunds.createdAt));
    res.json(rows);
});
router.get("/:id", async (req, res) => {
    const [r] = await db_1.db.select().from(schema_1.refunds).where((0, drizzle_orm_1.eq)(schema_1.refunds.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    const hist = await db_1.db.select().from(schema_1.refundHistory).where((0, drizzle_orm_1.eq)(schema_1.refundHistory.refundId, r.id));
    res.json({ ...r, history: hist });
});
router.put("/:id", async (req, res) => {
    const d = req.body;
    const [r] = await db_1.db.update(schema_1.refunds).set({
        refundAmount: d.refundAmount !== undefined ? String(d.refundAmount) : undefined,
        refundMethod: d.refundMethod,
        refundReason: d.refundReason,
        updatedAt: new Date(),
    }).where((0, drizzle_orm_1.eq)(schema_1.refunds.id, req.params.id)).returning();
    res.json(r);
});
router.patch("/:id/status", async (req, res) => {
    const { status, remarks } = req.body;
    const [r] = await db_1.db.select().from(schema_1.refunds).where((0, drizzle_orm_1.eq)(schema_1.refunds.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    // prevent modifying completed refunded? allow status progression
    await db_1.db.update(schema_1.refunds).set({ refundStatus: status, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.refunds.id, req.params.id));
    await db_1.db.insert(schema_1.refundHistory).values({ refundId: r.id, previousStatus: r.refundStatus, newStatus: status, remarks, updatedBy: req.user.id });
    // if refunded, update payment status? optional
    if (status === "REFUNDED" && r.paymentId) {
        await db_1.db.update(schema_1.payments).set({ paymentStatus: "REFUNDED" }).where((0, drizzle_orm_1.eq)(schema_1.payments.id, r.paymentId));
    }
    res.json({ message: "Updated" });
});
router.delete("/:id", async (req, res) => {
    const [r] = await db_1.db.select().from(schema_1.refunds).where((0, drizzle_orm_1.eq)(schema_1.refunds.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    if (r.refundStatus === "REFUNDED")
        return res.status(400).json({ message: "Cannot delete a completed refund" });
    await db_1.db.delete(schema_1.refundHistory).where((0, drizzle_orm_1.eq)(schema_1.refundHistory.refundId, r.id));
    await db_1.db.delete(schema_1.refunds).where((0, drizzle_orm_1.eq)(schema_1.refunds.id, r.id));
    res.json({ message: "Deleted" });
});
exports.default = router;
//# sourceMappingURL=refunds.js.map