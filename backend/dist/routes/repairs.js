import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { repairs, repairStatusHistory, payments, invoices, cancellations, reviews } from "../schema";
import { eq, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { genRef } from "../utils/gen";
const router = Router();
const repairSchema = z.object({
    deviceType: z.string().min(1),
    brand: z.string().optional(),
    model: z.string().optional(),
    problemDescription: z.string().min(1),
    imageUrl: z.string().optional(),
    preferredDate: z.string().optional(),
    repairCost: z.number().min(0).optional(),
    amountPaid: z.number().min(0).optional(),
    customerName: z.string().optional(),
    contactNumber: z.string().optional(),
    serviceType: z.string().optional(),
    technician: z.string().optional(),
    expectedCompletionDate: z.string().optional(),
    transactionSource: z.enum(["ONLINE", "WALK_IN"]).optional(),
});
router.post("/", authenticate, validate(repairSchema), async (req, res) => {
    const d = req.body;
    const isWalkIn = d.transactionSource === "WALK_IN" || req.user.role !== "CUSTOMER";
    const source = d.transactionSource || (req.user.role === "CUSTOMER" ? "ONLINE" : "WALK_IN");
    const cost = d.repairCost ?? 0;
    const paid = d.amountPaid ?? 0;
    const balance = Math.max(0, cost - paid);
    const [r] = await db.insert(repairs).values({
        referenceNumber: genRef("REP"),
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
    await db.insert(repairStatusHistory).values({ repairId: r.id, status: "PENDING", remarks: "Created", updatedBy: req.user.id });
    res.status(201).json(r);
});
router.get("/", authenticate, async (req, res) => {
    if (req.user.role === "CUSTOMER") {
        const rows = await db.select().from(repairs).where(eq(repairs.userId, req.user.id)).orderBy(desc(repairs.createdAt));
        return res.json(rows);
    }
    const rows = await db.select().from(repairs).orderBy(desc(repairs.createdAt));
    res.json(rows);
});
router.get("/:id", authenticate, async (req, res) => {
    const [r] = await db.select().from(repairs).where(eq(repairs.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    if (req.user.role === "CUSTOMER" && r.userId !== req.user.id)
        return res.status(403).json({ message: "Forbidden" });
    const history = await db.select().from(repairStatusHistory).where(eq(repairStatusHistory.repairId, r.id));
    res.json({ ...r, history });
});
router.put("/:id", authenticate, async (req, res) => {
    const [r] = await db.select().from(repairs).where(eq(repairs.id, req.params.id));
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
    const [updated] = await db.update(repairs).set(update).where(eq(repairs.id, req.params.id)).returning();
    res.json(updated);
});
const statusSchema = z.object({ status: z.enum(["PENDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]), remarks: z.string().optional() });
router.patch("/:id/status", authenticate, requireRole("ADMIN", "STAFF"), validate(statusSchema), async (req, res) => {
    const { status, remarks } = req.body;
    const [r] = await db.select().from(repairs).where(eq(repairs.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    const [updated] = await db.update(repairs).set({ status, updatedAt: new Date() }).where(eq(repairs.id, req.params.id)).returning();
    await db.insert(repairStatusHistory).values({ repairId: r.id, status, remarks, updatedBy: req.user.id });
    res.json(updated);
});
// cancel repair (customer within 24h)
router.post("/:id/cancel", authenticate, async (req, res) => {
    const [r] = await db.select().from(repairs).where(eq(repairs.id, req.params.id));
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
    const [updated] = await db.update(repairs).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(repairs.id, req.params.id)).returning();
    await db.insert(repairStatusHistory).values({ repairId: r.id, status: "CANCELLED", remarks: req.body?.reason || "Cancelled", updatedBy: req.user.id });
    res.json(updated);
});
// delete repair (customer: own pending/cancelled only)
router.delete("/:id", authenticate, async (req, res) => {
    const [r] = await db.select().from(repairs).where(eq(repairs.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    if (req.user.role === "CUSTOMER") {
        if (r.userId !== req.user.id)
            return res.status(403).json({ message: "Forbidden" });
        if (r.status !== "PENDING" && r.status !== "CANCELLED") {
            return res.status(400).json({ message: "Only pending or cancelled repairs can be deleted" });
        }
    }
    await db.delete(repairStatusHistory).where(eq(repairStatusHistory.repairId, r.id));
    await db.update(payments).set({ repairId: null }).where(eq(payments.repairId, r.id));
    await db.update(invoices).set({ repairId: null }).where(eq(invoices.repairId, r.id));
    await db.update(cancellations).set({ repairId: null }).where(eq(cancellations.repairId, r.id));
    await db.update(reviews).set({ repairId: null }).where(eq(reviews.repairId, r.id));
    await db.delete(repairs).where(eq(repairs.id, r.id));
    res.json({ message: "Deleted" });
});
export default router;
//# sourceMappingURL=repairs.js.map