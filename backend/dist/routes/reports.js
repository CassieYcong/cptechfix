"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"));
function parseRange(req) {
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    return { from, to };
}
router.get("/revenue", async (req, res) => {
    const { from, to } = parseRange(req);
    const allOrders = await db_1.db.select().from(schema_1.orders);
    const allPayments = await db_1.db.select().from(schema_1.payments);
    const allRepairs = await db_1.db.select().from(schema_1.repairs);
    const allRefunds = await db_1.db.select().from(schema_1.refunds);
    const inRange = (d) => {
        if (from && d < from)
            return false;
        if (to && d > to)
            return false;
        return true;
    };
    const ordersInRange = allOrders.filter((o) => inRange(new Date(o.createdAt)));
    const paymentsInRange = allPayments.filter((p) => inRange(new Date(p.createdAt)));
    const repairsInRange = allRepairs.filter((r) => inRange(new Date(r.createdAt)));
    const refundsInRange = allRefunds.filter((r) => inRange(new Date(r.createdAt)));
    const grossSales = ordersInRange.reduce((a, o) => a + Number(o.totalAmount), 0);
    const repairRevenue = repairsInRange.reduce((a, r) => a + Number(r.repairCost), 0);
    const refundsTotal = refundsInRange.reduce((a, r) => a + (r.refundStatus === "REFUNDED" ? Number(r.refundAmount) : 0), 0);
    const cashCollected = paymentsInRange.reduce((a, p) => a + (p.paymentStatus === "PAID" ? Number(p.amount) : 0), 0);
    const walkInRevenue = ordersInRange.filter((o) => o.transactionSource === "WALK_IN").reduce((a, o) => a + Number(o.totalAmount), 0);
    const onlineRevenue = ordersInRange.filter((o) => o.transactionSource === "ONLINE").reduce((a, o) => a + Number(o.totalAmount), 0);
    const outstanding = ordersInRange.reduce((a, o) => a + (o.paymentStatus !== "PAID" ? Number(o.totalAmount) : 0), 0);
    // payment method breakdown
    const pmBreakdown = {};
    for (const p of paymentsInRange) {
        if (p.paymentStatus === "PAID") {
            pmBreakdown[p.paymentMethod] = (pmBreakdown[p.paymentMethod] || 0) + Number(p.amount);
        }
    }
    // best selling products
    const soldMap = {};
    for (const o of ordersInRange) {
        // need items; fetch
    }
    const allItems = await db_1.db.select().from(schema_1.orderItems);
    for (const it of allItems) {
        soldMap[it.productId] = (soldMap[it.productId] || 0) + it.quantity;
    }
    const productList = await db_1.db.select().from(schema_1.products);
    const bestSelling = productList
        .map((p) => ({ id: p.id, name: p.productName, sold: soldMap[p.id] || 0, revenue: (soldMap[p.id] || 0) * Number(p.sellingPrice) }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5);
    res.json({
        totalRevenue: grossSales + repairRevenue,
        totalSales: grossSales,
        repairServiceRevenue: repairRevenue,
        accessoriesRevenue: grossSales,
        walkInRevenue,
        onlineRevenue,
        totalRefunds: refundsTotal,
        netRevenue: grossSales + repairRevenue - refundsTotal,
        outstandingBalances: outstanding,
        cashCollected,
        totalOrders: ordersInRange.length,
        totalRepairs: repairsInRange.length,
        paymentMethods: pmBreakdown,
        bestSelling,
    });
});
router.get("/sales", async (req, res) => {
    const rows = await db_1.db.select().from(schema_1.orders).orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt));
    res.json(rows);
});
router.get("/refunds", async (req, res) => {
    const rows = await db_1.db.select().from(schema_1.refunds).orderBy((0, drizzle_orm_1.desc)(schema_1.refunds.createdAt));
    res.json(rows);
});
router.get("/transactions", async (req, res) => {
    const ordersRows = await db_1.db.select().from(schema_1.orders).orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt));
    const repairsRows = await db_1.db.select().from(schema_1.repairs).orderBy((0, drizzle_orm_1.desc)(schema_1.repairs.createdAt));
    res.json({ orders: ordersRows, repairs: repairsRows });
});
router.get("/export", async (_req, res) => {
    // simple CSV of orders
    const rows = await db_1.db.select().from(schema_1.orders);
    const header = "orderNumber,totalAmount,paymentStatus,orderStatus,source,createdAt\n";
    const body = rows.map((o) => `${o.orderNumber},${o.totalAmount},${o.paymentStatus},${o.orderStatus},${o.transactionSource},${o.createdAt}`).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=report.csv");
    res.send(header + body);
});
exports.default = router;
//# sourceMappingURL=reports.js.map