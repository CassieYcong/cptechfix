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
const repairSchema = zod_1.z.object({
    deviceType: zod_1.z.string().min(1),
    brand: zod_1.z.string().optional(),
    model: zod_1.z.string().optional(),
    problemDescription: zod_1.z.string().min(1),
    imageUrl: zod_1.z.string().optional(),
    preferredDate: zod_1.z.string().optional(),
    repairCost: zod_1.z.number().min(0).optional(),
    amountPaid: zod_1.z.number().min(0).optional(),
    customerName: zod_1.z.string().optional(),
    contactNumber: zod_1.z.string().optional(),
    serviceType: zod_1.z.string().optional(),
    technician: zod_1.z.string().optional(),
    expectedCompletionDate: zod_1.z.string().optional(),
    transactionSource: zod_1.z.enum(["ONLINE", "WALK_IN"]).optional(),
});
router.post("/", auth_1.authenticate, (0, validate_1.validate)(repairSchema), async (req, res) => {
    const d = req.body;
    const isWalkIn = d.transactionSource === "WALK_IN" || req.user.role !== "CUSTOMER";
    const source = d.transactionSource || (req.user.role === "CUSTOMER" ? "ONLINE" : "WALK_IN");
    const cost = d.repairCost ?? 0;
    const paid = d.amountPaid ?? 0;
    const balance = Math.max(0, cost - paid);
    const [r] = await db_1.db.insert(schema_1.repairs).values({
        referenceNumber: (0, gen_1.genRef)("REP"),
        userId: req.user.role === "CUSTOMER" ? req.user.id : (d.userId || null),
        transactionSource: source,
        customerName: d.customerName,
        contactNumber: d.contactNumber,
        deviceType: d.deviceType,
        brand: d.brand,
        model: d.model,
        problemDescription: d.problemDescription,
        imageUrl: d.imageUrl,
        serviceType: d.serviceType,
        technician: d.technician,
        repairCost: String(cost),
        amountPaid: String(paid),
        remainingBalance: String(balance),
        preferredDate: d.preferredDate ? new Date(d.preferredDate) : null,
        expectedCompletionDate: d.expectedCompletionDate ? new Date(d.expectedCompletionDate) : null,
        status: "PENDING",
    }).returning();
    await db_1.db.insert(schema_1.repairStatusHistory).values({ repairId: r.id, status: "PENDING", remarks: "Created", updatedBy: req.user.id });
    res.status(201).json(r);
});
router.get("/", auth_1.authenticate, async (req, res) => {
    if (req.user.role === "CUSTOMER") {
        const rows = await db_1.db.select().from(schema_1.repairs).where((0, drizzle_orm_1.eq)(schema_1.repairs.userId, req.user.id)).orderBy((0, drizzle_orm_1.desc)(schema_1.repairs.createdAt));
        return res.json(rows);
    }
    const rows = await db_1.db.select().from(schema_1.repairs).orderBy((0, drizzle_orm_1.desc)(schema_1.repairs.createdAt));
    res.json(rows);
});
router.get("/:id", auth_1.authenticate, async (req, res) => {
    const [r] = await db_1.db.select().from(schema_1.repairs).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    if (req.user.role === "CUSTOMER" && r.userId !== req.user.id)
        return res.status(403).json({ message: "Forbidden" });
    const history = await db_1.db.select().from(schema_1.repairStatusHistory).where((0, drizzle_orm_1.eq)(schema_1.repairStatusHistory.repairId, r.id));
    res.json({ ...r, history });
});
router.put("/:id", auth_1.authenticate, async (req, res) => {
    const [r] = await db_1.db.select().from(schema_1.repairs).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    const isStaff = req.user.role === "ADMIN" || req.user.role === "STAFF";
    if (!isStaff && r.userId !== req.user.id)
        return res.status(403).json({ message: "Forbidden" });
    // customers may only edit their own pending repairs; staff can edit any
    if (!isStaff && r.status !== "PENDING")
        return res.status(400).json({ message: "Only pending repairs can be edited" });
    const d = req.body;
    const cost = d.repairCost !== undefined ? Number(d.repairCost) : Number(r.repairCost);
    const paid = d.amountPaid !== undefined ? Number(d.amountPaid) : Number(r.amountPaid);
    const update = {
        deviceType: d.deviceType ?? r.deviceType,
        brand: d.brand ?? r.brand,
        model: d.model ?? r.model,
        problemDescription: d.problemDescription ?? r.problemDescription,
        imageUrl: d.imageUrl ?? r.imageUrl,
        preferredDate: d.preferredDate ? new Date(d.preferredDate) : r.preferredDate,
        updatedAt: new Date(),
    };
    if (isStaff) {
        update.customerName = d.customerName ?? r.customerName;
        update.contactNumber = d.contactNumber ?? r.contactNumber;
        update.serviceType = d.serviceType ?? r.serviceType;
        update.technician = d.technician ?? r.technician;
        update.repairCost = String(cost);
        update.amountPaid = String(paid);
        update.remainingBalance = String(Math.max(0, cost - paid));
        update.expectedCompletionDate = d.expectedCompletionDate ? new Date(d.expectedCompletionDate) : r.expectedCompletionDate;
    }
    const [updated] = await db_1.db.update(schema_1.repairs).set(update).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, req.params.id)).returning();
    res.json(updated);
});
const statusSchema = zod_1.z.object({ status: zod_1.z.enum(["PENDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]), remarks: zod_1.z.string().optional() });
router.patch("/:id/status", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"), (0, validate_1.validate)(statusSchema), async (req, res) => {
    const { status, remarks } = req.body;
    const [r] = await db_1.db.select().from(schema_1.repairs).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    const [updated] = await db_1.db.update(schema_1.repairs).set({ status, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, req.params.id)).returning();
    await db_1.db.insert(schema_1.repairStatusHistory).values({ repairId: r.id, status, remarks, updatedBy: req.user.id });
    res.json(updated);
});
// cancel repair (customer within 24h)
router.post("/:id/cancel", auth_1.authenticate, async (req, res) => {
    const [r] = await db_1.db.select().from(schema_1.repairs).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    if (req.user.role === "CUSTOMER" && r.userId !== req.user.id)
        return res.status(403).json({ message: "Forbidden" });
    if (r.status === "COMPLETED" || r.status === "CANCELLED")
        return res.status(400).json({ message: "Cannot cancel" });
    const created = new Date(r.createdAt).getTime();
    const now = Date.now();
    if (req.user.role === "CUSTOMER" && now - created > 24 * 60 * 60 * 1000) {
        return res.status(400).json({ message: "Cancellation window expired (24h)" });
    }
    const [updated] = await db_1.db.update(schema_1.repairs).set({ status: "CANCELLED", updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, req.params.id)).returning();
    await db_1.db.insert(schema_1.repairStatusHistory).values({ repairId: r.id, status: "CANCELLED", remarks: req.body?.reason || "Cancelled", updatedBy: req.user.id });
    res.json(updated);
});
// delete repair (customer: own pending/cancelled only)
router.delete("/:id", auth_1.authenticate, async (req, res) => {
    const [r] = await db_1.db.select().from(schema_1.repairs).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    if (req.user.role === "CUSTOMER") {
        if (r.userId !== req.user.id)
            return res.status(403).json({ message: "Forbidden" });
        if (r.status !== "PENDING" && r.status !== "CANCELLED") {
            return res.status(400).json({ message: "Only pending or cancelled repairs can be deleted" });
        }
    }
    await db_1.db.delete(schema_1.repairStatusHistory).where((0, drizzle_orm_1.eq)(schema_1.repairStatusHistory.repairId, r.id));
    await db_1.db.update(schema_1.payments).set({ repairId: null }).where((0, drizzle_orm_1.eq)(schema_1.payments.repairId, r.id));
    await db_1.db.update(schema_1.invoices).set({ repairId: null }).where((0, drizzle_orm_1.eq)(schema_1.invoices.repairId, r.id));
    await db_1.db.update(schema_1.cancellations).set({ repairId: null }).where((0, drizzle_orm_1.eq)(schema_1.cancellations.repairId, r.id));
    await db_1.db.update(schema_1.reviews).set({ repairId: null }).where((0, drizzle_orm_1.eq)(schema_1.reviews.repairId, r.id));
    await db_1.db.delete(schema_1.repairs).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, r.id));
    res.json({ message: "Deleted" });
});
exports.default = router;
//# sourceMappingURL=repairs.js.map