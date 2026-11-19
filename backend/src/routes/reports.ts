import { Router } from "express";
import { db } from "../db";
import { orders, payments, repairs, refunds, orderItems, products } from "../schema";
import { eq, gte, lte, and, sql, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";

const router = Router();
router.use(authenticate, requireRole("ADMIN", "STAFF"));

function parseRange(req: any) {
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  return { from, to };
}

router.get("/revenue", async (req, res) => {
  const { from, to } = parseRange(req);
  const allOrders = await db.select().from(orders);
  const allPayments = await db.select().from(payments);
  const allRepairs = await db.select().from(repairs);
  const allRefunds = await db.select().from(refunds);

  const inRange = (d: Date) => {
    if (from && d < from) return false;
    if (to && d > to) return false;
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
  const pmBreakdown: Record<string, number> = {};
  for (const p of paymentsInRange) {
    if (p.paymentStatus === "PAID") {
      pmBreakdown[p.paymentMethod] = (pmBreakdown[p.paymentMethod] || 0) + Number(p.amount);
    }
  }

  // best selling products
  const soldMap: Record<string, number> = {};
  for (const o of ordersInRange) {
    // need items; fetch
  }
  const allItems = await db.select().from(orderItems);
  for (const it of allItems) {
    soldMap[it.productId] = (soldMap[it.productId] || 0) + it.quantity;
  }
  const productList = await db.select().from(products);
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
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  res.json(rows);
});

router.get("/refunds", async (req, res) => {
  const rows = await db.select().from(refunds).orderBy(desc(refunds.createdAt));
  res.json(rows);
});

router.get("/transactions", async (req, res) => {
  const ordersRows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const repairsRows = await db.select().from(repairs).orderBy(desc(repairs.createdAt));
  res.json({ orders: ordersRows, repairs: repairsRows });
});

router.get("/export", async (_req, res) => {
  // simple CSV of orders
  const rows = await db.select().from(orders);
  const header = "orderNumber,totalAmount,paymentStatus,orderStatus,source,createdAt\n";
  const body = rows.map((o) => `${o.orderNumber},${o.totalAmount},${o.paymentStatus},${o.orderStatus},${o.transactionSource},${o.createdAt}`).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=report.csv");
  res.send(header + body);
});

export default router;
