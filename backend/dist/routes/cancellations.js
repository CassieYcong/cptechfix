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
const cancelSchema = zod_1.z.object({
    orderId: zod_1.z.string().uuid().optional(),
    repairId: zod_1.z.string().uuid().optional(),
    reason: zod_1.z.string().min(1),
});
router.post("/", auth_1.authenticate, (0, validate_1.validate)(cancelSchema), async (req, res) => {
    const d = req.body;
    // determine eligibility
    if (d.orderId) {
        const [o] = await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, d.orderId));
        if (!o)
            return res.status(404).json({ message: "Order not found" });
        if (o.orderStatus === "COMPLETED" || o.orderStatus === "CANCELLED")
            return res.status(400).json({ message: "Cannot cancel" });
        const created = new Date(o.createdAt).getTime();
        if (req.user.role === "CUSTOMER" && Date.now() - created > 24 * 60 * 60 * 1000)
            return res.status(400).json({ message: "Cancellation expired" });
    }
    if (d.repairId) {
        const [r] = await db_1.db.select().from(schema_1.repairs).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, d.repairId));
        if (!r)
            return res.status(404).json({ message: "Repair not found" });
        if (r.status === "COMPLETED" || r.status === "CANCELLED")
            return res.status(400).json({ message: "Cannot cancel" });
        const created = new Date(r.createdAt).getTime();
        if (req.user.role === "CUSTOMER" && Date.now() - created > 24 * 60 * 60 * 1000)
            return res.status(400).json({ message: "Cancellation expired" });
    }
    const [c] = await db_1.db.insert(schema_1.cancellations).values({
        orderId: d.orderId || null,
        repairId: d.repairId || null,
        reason: d.reason,
        cancellationStatus: req.user.role === "CUSTOMER" ? "REQUESTED" : "APPROVED",
        requestedBy: req.user.id,
        processedAt: req.user.role !== "CUSTOMER" ? new Date() : null,
    }).returning();
    // if admin/staff, apply immediately
    if (req.user.role !== "CUSTOMER") {
        if (d.orderId)
            await db_1.db.update(schema_1.orders).set({ orderStatus: "CANCELLED", updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.orders.id, d.orderId));
        if (d.repairId)
            await db_1.db.update(schema_1.repairs).set({ status: "CANCELLED", updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, d.repairId));
    }
    res.status(201).json(c);
});
router.get("/", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"), async (_req, res) => {
    const rows = await db_1.db.select().from(schema_1.cancellations).orderBy((0, drizzle_orm_1.desc)(schema_1.cancellations.createdAt));
    res.json(rows);
});
router.patch("/:id/approve", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"), async (req, res) => {
    const [c] = await db_1.db.select().from(schema_1.cancellations).where((0, drizzle_orm_1.eq)(schema_1.cancellations.id, req.params.id));
    if (!c)
        return res.status(404).json({ message: "Not found" });
    await db_1.db.update(schema_1.cancellations).set({ cancellationStatus: "APPROVED", processedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.cancellations.id, req.params.id));
    if (c.orderId)
        await db_1.db.update(schema_1.orders).set({ orderStatus: "CANCELLED", updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.orders.id, c.orderId));
    if (c.repairId)
        await db_1.db.update(schema_1.repairs).set({ status: "CANCELLED", updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, c.repairId));
    res.json({ message: "Approved" });
});
router.patch("/:id/reject", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"), async (req, res) => {
    await db_1.db.update(schema_1.cancellations).set({ cancellationStatus: "REJECTED", processedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.cancellations.id, req.params.id));
    res.json({ message: "Rejected" });
});
router.delete("/:id", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"), async (req, res) => {
    const [c] = await db_1.db.select().from(schema_1.cancellations).where((0, drizzle_orm_1.eq)(schema_1.cancellations.id, req.params.id));
    if (!c)
        return res.status(404).json({ message: "Not found" });
    if (c.cancellationStatus === "APPROVED")
        return res.status(400).json({ message: "Cannot delete an approved cancellation" });
    await db_1.db.delete(schema_1.cancellations).where((0, drizzle_orm_1.eq)(schema_1.cancellations.id, c.id));
    res.json({ message: "Deleted" });
});
exports.default = router;
//# sourceMappingURL=cancellations.js.map