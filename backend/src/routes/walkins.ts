import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { users, repairs, orders, orderItems, products, payments } from "../schema";
import { eq, desc, inArray } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { hashPassword } from "../utils/auth";

const router = Router();
router.use(authenticate, requireRole("ADMIN", "STAFF"));

const customerSchema = z.object({
  fullName: z.string().min(2),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

router.post("/customers", validate(customerSchema), async (req, res) => {
  const d = req.body;
  // if email provided and exists, return existing
  if (d.email) {
    const [existing] = await db.select().from(users).where(eq(users.email, d.email));
    if (existing) return res.json(existing);
  }
  const email = d.email || `walkin_${Date.now()}@cptechfix.local`;
  const [u] = await db.insert(users).values({
    fullName: d.fullName,
    email,
    phoneNumber: d.phoneNumber,
    password: await hashPassword("WalkIn123!"),
    role: "CUSTOMER",
  }).returning();
  res.status(201).json(u);
});

router.get("/transactions", async (_req, res) => {
  const repairRows = await db.select().from(repairs).where(eq(repairs.transactionSource, "WALK_IN")).orderBy(desc(repairs.createdAt));
  const orderRows = await db.select().from(orders).where(eq(orders.transactionSource, "WALK_IN")).orderBy(desc(orders.createdAt));

  const orderIds = orderRows.map((o) => o.id);
  let itemRows: any[] = [];
  let paymentRows: any[] = [];

  if (orderIds.length) {
    itemRows = await db
      .select({
        orderId: orderItems.orderId,
        productName: products.productName,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        subtotal: orderItems.subtotal,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(inArray(orderItems.orderId, orderIds));

    paymentRows = await db
      .select({
        orderId: payments.orderId,
        paymentMethod: payments.paymentMethod,
        paymentStatus: payments.paymentStatus,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(inArray(payments.orderId, orderIds));
  }

  // Attach the line items and the recorded payment method so the UI can show
  // products, quantities and how the walk-in sale was paid.
  const ordersWithDetails = orderRows.map((o) => {
    const orderPayments = paymentRows
      .filter((p) => p.orderId === o.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const payment = orderPayments.find((p) => p.paymentStatus === "PAID") || orderPayments[0];
    return {
      ...o,
      items: itemRows.filter((i) => i.orderId === o.id),
      paymentMethod: payment?.paymentMethod || null,
    };
  });

  res.json({ repairs: repairRows, orders: ordersWithDetails });
});

router.get("/transactions/:id", async (req, res) => {
  // try repair then order
  const [rep] = await db.select().from(repairs).where(eq(repairs.id, req.params.id));
  if (rep) return res.json({ type: "repair", data: rep });
  const [ord] = await db.select().from(orders).where(eq(orders.id, req.params.id));
  if (ord) return res.json({ type: "order", data: ord });
  res.status(404).json({ message: "Not found" });
});

export default router;
