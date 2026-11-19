import { Router } from "express";
import { db } from "../db";
import { invoices, receipts } from "../schema";
import { eq, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";
import { genRef } from "../utils/gen";
const router = Router();
router.post("/", authenticate, requireRole("ADMIN", "STAFF"), async (req, res) => {
    const d = req.body;
    const [inv] = await db.insert(invoices).values({
        invoiceNumber: genRef("INV"),
        userId: d.userId || null,
        orderId: d.orderId || null,
        repairId: d.repairId || null,
        totalAmount: String(d.totalAmount || 0),
        amountPaid: String(d.amountPaid || 0),
        balance: String(d.balance || 0),
    }).returning();
    res.status(201).json(inv);
});
router.get("/history", authenticate, async (req, res) => {
    if (req.user.role === "CUSTOMER") {
        const rows = await db.select().from(invoices).where(eq(invoices.userId, req.user.id)).orderBy(desc(invoices.createdAt));
        return res.json(rows);
    }
    const rows = await db.select().from(invoices).orderBy(desc(invoices.createdAt));
    res.json(rows);
});
router.get("/:id", authenticate, async (req, res) => {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, req.params.id));
    if (!inv)
        return res.status(404).json({ message: "Not found" });
    const recs = await db.select().from(receipts).where(eq(receipts.invoiceId, inv.id));
    res.json({ ...inv, receipts: recs });
});
// invoices by id route alias (GET /api/invoices/:id)
export default router;
//# sourceMappingURL=billing.js.map