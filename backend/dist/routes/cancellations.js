import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { cancellations, orders, repairs } from "../schema";
import { eq, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
const router = Router();
const cancelSchema = z.object({
    orderId: z.string().uuid().optional(),
    repairId: z.string().uuid().optional(),
    reason: z.string().min(1),
});
router.post("/", authenticate, validate(cancelSchema), async (req, res) => {
    const d = req.body;
    // determine eligibility
    if (d.orderId) {
        const [o] = await db.select().from(orders).where(eq(orders.id, d.orderId));
        if (!o)
            return res.status(404).json({ message: "Order not found" });
        if (o.orderStatus === "COMPLETED" || o.orderStatus === "CANCELLED")
            return res.status(400).json({ message: "Cannot cancel" });
        const created = new Date(o.createdAt).getTime();
        if (req.user.role === "CUSTOMER" && Date.now() - created > 24 * 60 * 60 * 1000)
            return res.status(400).json({ message: "Cancellation expired" });
    }
    if (d.repairId) {
        const [r] = await db.select().from(repairs).where(eq(repairs.id, d.repairId));
        if (!r)
            return res.status(404).json({ message: "Repair not found" });
        if (r.status === "COMPLETED" || r.status === "CANCELLED")
            return res.status(400).json({ message: "Cannot cancel" });
        const created = new Date(r.createdAt).getTime();
        if (req.user.role === "CUSTOMER" && Date.now() - created > 24 * 60 * 60 * 1000)
            return res.status(400).json({ message: "Cancellation expired" });
    }
    const [c] = await db.insert(cancellations).values({
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
            await db.update(orders).set({ orderStatus: "CANCELLED", updatedAt: new Date() }).where(eq(orders.id, d.orderId));
        if (d.repairId)
            await db.update(repairs).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(repairs.id, d.repairId));
    }
    res.status(201).json(c);
});
router.get("/", authenticate, requireRole("ADMIN", "STAFF"), async (_req, res) => {
    const rows = await db.select().from(cancellations).orderBy(desc(cancellations.createdAt));
    res.json(rows);
});
router.patch("/:id/approve", authenticate, requireRole("ADMIN", "STAFF"), async (req, res) => {
    const [c] = await db.select().from(cancellations).where(eq(cancellations.id, req.params.id));
    if (!c)
        return res.status(404).json({ message: "Not found" });
    await db.update(cancellations).set({ cancellationStatus: "APPROVED", processedAt: new Date() }).where(eq(cancellations.id, req.params.id));
    if (c.orderId)
        await db.update(orders).set({ orderStatus: "CANCELLED", updatedAt: new Date() }).where(eq(orders.id, c.orderId));
    if (c.repairId)
        await db.update(repairs).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(repairs.id, c.repairId));
    res.json({ message: "Approved" });
});
router.patch("/:id/reject", authenticate, requireRole("ADMIN", "STAFF"), async (req, res) => {
    await db.update(cancellations).set({ cancellationStatus: "REJECTED", processedAt: new Date() }).where(eq(cancellations.id, req.params.id));
    res.json({ message: "Rejected" });
});
router.delete("/:id", authenticate, requireRole("ADMIN", "STAFF"), async (req, res) => {
    const [c] = await db.select().from(cancellations).where(eq(cancellations.id, req.params.id));
    if (!c)
        return res.status(404).json({ message: "Not found" });
    if (c.cancellationStatus === "APPROVED")
        return res.status(400).json({ message: "Cannot delete an approved cancellation" });
    await db.delete(cancellations).where(eq(cancellations.id, c.id));
    res.json({ message: "Deleted" });
});
export default router;
//# sourceMappingURL=cancellations.js.map