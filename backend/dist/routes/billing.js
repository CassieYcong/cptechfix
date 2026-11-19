"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middlewares/auth");
const gen_1 = require("../utils/gen");
const router = (0, express_1.Router)();
router.post("/", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"), async (req, res) => {
    const d = req.body;
    const [inv] = await db_1.db.insert(schema_1.invoices).values({
        invoiceNumber: (0, gen_1.genRef)("INV"),
        userId: d.userId || null,
        orderId: d.orderId || null,
        repairId: d.repairId || null,
        totalAmount: String(d.totalAmount || 0),
        amountPaid: String(d.amountPaid || 0),
        balance: String(d.balance || 0),
    }).returning();
    res.status(201).json(inv);
});
router.get("/history", auth_1.authenticate, async (req, res) => {
    if (req.user.role === "CUSTOMER") {
        const rows = await db_1.db.select().from(schema_1.invoices).where((0, drizzle_orm_1.eq)(schema_1.invoices.userId, req.user.id)).orderBy((0, drizzle_orm_1.desc)(schema_1.invoices.createdAt));
        return res.json(rows);
    }
    const rows = await db_1.db.select().from(schema_1.invoices).orderBy((0, drizzle_orm_1.desc)(schema_1.invoices.createdAt));
    res.json(rows);
});
router.get("/:id", auth_1.authenticate, async (req, res) => {
    const [inv] = await db_1.db.select().from(schema_1.invoices).where((0, drizzle_orm_1.eq)(schema_1.invoices.id, req.params.id));
    if (!inv)
        return res.status(404).json({ message: "Not found" });
    const recs = await db_1.db.select().from(schema_1.receipts).where((0, drizzle_orm_1.eq)(schema_1.receipts.invoiceId, inv.id));
    res.json({ ...inv, receipts: recs });
});
// invoices by id route alias (GET /api/invoices/:id)
exports.default = router;
//# sourceMappingURL=billing.js.map