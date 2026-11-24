import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { orders, orderItems, products, invoices, payments, inventoryMovements, receipts, refunds, cancellations, reviews } from "../schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { genRef } from "../utils/gen";

const router = Router();

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

const orderSchema = z.object({
  items: z.array(itemSchema).min(1),
  transactionSource: z.enum(["ONLINE", "WALK_IN"]).optional(),
  customerName: z.string().optional().refine((v) => !v || /^[A-Za-z\s.'-]+$/.test(v), { message: "Name must contain letters only" }),
  paymentMethod: z.string().optional(),
  amountPaid: z.number().min(0).optional(),
  userId: z.string().uuid().optional(),
  discount: z.number().min(0).optional(),
  voucherCode: z.string().optional(),
  deliveryMethod: z.enum(["DELIVERY", "PICKUP"]).optional(),
  deliveryAddress: z.string().optional(),
});

router.post("/", authenticate, validate(orderSchema), async (req: AuthRequest, res) => {
  const d = req.body;
  const source = d.transactionSource || (req.user!.role === "CUSTOMER" ? "ONLINE" : "WALK_IN");
  try {
    const result = await db.transaction(async (tx) => {
      // validate stock
      let total = 0;
      const prepared: { product: any; qty: number; unitPrice: number; subtotal: number }[] = [];
      for (const it of d.items) {
        const [p] = await tx.select().from(products).where(eq(products.id, it.productId));
        if (!p) throw new Error("Product not found");
        if (p.stock < it.quantity) throw new Error(`Insufficient stock for ${p.productName}`);
        const unitPrice = Number(p.sellingPrice);
        const subtotal = unitPrice * it.quantity;
        total += subtotal;
        prepared.push({ product: p, qty: it.quantity, unitPrice, subtotal });
      }
      if (d.discount) total = Math.max(0, total - d.discount);

      const targetUserId = req.user!.role === "CUSTOMER" ? req.user!.id : (d.userId || null);

      const [order] = await tx.insert(orders).values({
        orderNumber: genRef("ORD"),
        userId: targetUserId,
        customerName: d.customerName,
        transactionSource: source,
        totalAmount: String(total),
        discount: String(d.discount || 0),
        voucherCode: d.voucherCode,
        deliveryMethod: d.deliveryMethod || "DELIVERY",
        deliveryAddress: d.deliveryAddress,
        paymentStatus: "UNPAID",
        orderStatus: "PENDING",
      }).returning();

      for (const pr of prepared) {
        await tx.insert(orderItems).values({
          orderId: order.id,
          productId: pr.product.id,
          quantity: pr.qty,
          unitPrice: String(pr.unitPrice),
          subtotal: String(pr.subtotal),
        });
        // decrement stock
        const newStock = pr.product.stock - pr.qty;
        await tx.update(products).set({ stock: newStock, sold: (pr.product.sold || 0) + pr.qty, updatedAt: new Date() }).where(eq(products.id, pr.product.id));
        await tx.insert(inventoryMovements).values({
          productId: pr.product.id,
          movementType: "SALE",
          quantity: pr.qty,
          previousStock: pr.product.stock,
          newStock,
          referenceType: "ORDER",
          referenceId: order.id,
          createdBy: req.user!.id,
        });
      }

      // invoice
      const paid = d.amountPaid ?? 0;
      const [invoice] = await tx.insert(invoices).values({
        invoiceNumber: genRef("INV"),
        userId: targetUserId,
        orderId: order.id,
        totalAmount: String(total),
        amountPaid: String(paid),
        balance: String(Math.max(0, total - paid)),
      }).returning();

      // payment if amountPaid
      if (paid > 0) {
        const [payment] = await tx.insert(payments).values({
          paymentReference: genRef("PAY"),
          userId: targetUserId,
          orderId: order.id,
          paymentMethod: d.paymentMethod || "CASH",
          paymentProvider: source === "ONLINE" ? "GATEWAY" : "WALK_IN",
          amount: String(paid),
          paymentStatus: "PAID",
          paidAt: new Date(),
        }).returning();
        await tx.insert(receipts).values({ receiptNumber: genRef("RCT"), paymentId: payment.id, invoiceId: invoice.id });
        await tx.update(orders).set({ paymentStatus: paid >= total ? "PAID" : "PARTIALLY_PAID", updatedAt: new Date() }).where(eq(orders.id, order.id));
      }

      return { order, invoice };
    });
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ message: e.message || "Order failed" });
  }
});

router.get("/", authenticate, async (req: AuthRequest, res) => {
  if (req.user!.role === "CUSTOMER") {
    const rows = await db.select().from(orders).where(eq(orders.userId, req.user!.id)).orderBy(desc(orders.createdAt));
    return res.json(rows);
  }
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  res.json(rows);
});

router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  const [o] = await db.select().from(orders).where(eq(orders.id, req.params.id));
  if (!o) return res.status(404).json({ message: "Not found" });
  if (req.user!.role === "CUSTOMER" && o.userId !== req.user!.id) return res.status(403).json({ message: "Forbidden" });
  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      productName: products.productName,
      productImage: products.imageUrl,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      subtotal: orderItems.subtotal,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, o.id));
  const pays = await db.select().from(payments).where(eq(payments.orderId, o.id));
  const invs = await db.select().from(invoices).where(eq(invoices.orderId, o.id));
  res.json({ ...o, items, payments: pays, invoices: invs });
});

// cancel order (24h)
router.post("/:id/cancel", authenticate, async (req: AuthRequest, res) => {
  const [o] = await db.select().from(orders).where(eq(orders.id, req.params.id));
  if (!o) return res.status(404).json({ message: "Not found" });
  if (req.user!.role === "CUSTOMER" && o.userId !== req.user!.id) return res.status(403).json({ message: "Forbidden" });
  if (o.orderStatus === "COMPLETED" || o.orderStatus === "CANCELLED") return res.status(400).json({ message: "Cannot cancel" });
  const created = new Date(o.createdAt).getTime();
  if (req.user!.role === "CUSTOMER" && Date.now() - created > 24 * 60 * 60 * 1000) {
    return res.status(400).json({ message: "Cancellation window expired (24h)" });
  }
  // restore stock
  await db.transaction(async (tx) => {
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, o.id));
    for (const it of items) {
      const [p] = await tx.select().from(products).where(eq(products.id, it.productId));
      if (p) {
        const newStock = p.stock + it.quantity;
        await tx.update(products).set({ stock: newStock, updatedAt: new Date() }).where(eq(products.id, p.id));
        await tx.insert(inventoryMovements).values({
          productId: p.id,
          movementType: "RETURN",
          quantity: it.quantity,
          previousStock: p.stock,
          newStock,
          referenceType: "ORDER",
          referenceId: o.id,
          remarks: "Order cancelled - stock restored",
          createdBy: req.user!.id,
        });
      }
    }
    await tx.update(orders).set({ orderStatus: "CANCELLED", updatedAt: new Date() }).where(eq(orders.id, o.id));
  });
  res.json({ message: "Cancelled" });
});

// update order details (admin/staff)
router.put("/:id", authenticate, requireRole("ADMIN", "STAFF"), async (req, res) => {
  const [o] = await db.select().from(orders).where(eq(orders.id, req.params.id));
  if (!o) return res.status(404).json({ message: "Not found" });
  const d = req.body;
  const [updated] = await db.update(orders).set({
    customerName: d.customerName ?? o.customerName,
    deliveryMethod: d.deliveryMethod ?? o.deliveryMethod,
    deliveryAddress: d.deliveryAddress ?? o.deliveryAddress,
    updatedAt: new Date(),
  }).where(eq(orders.id, o.id)).returning();
  res.json(updated);
});

// status update admin
router.patch("/:id/status", authenticate, requireRole("ADMIN", "STAFF"), async (req, res) => {
  const { orderStatus } = req.body;
  const [o] = await db.update(orders).set({ orderStatus, updatedAt: new Date() }).where(eq(orders.id, req.params.id)).returning();
  res.json(o);
});

// delete order - staff can delete any; customers only their own pending/cancelled orders
router.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  const [o] = await db.select().from(orders).where(eq(orders.id, req.params.id));
  if (!o) return res.status(404).json({ message: "Not found" });

  const isStaff = req.user!.role === "ADMIN" || req.user!.role === "STAFF";
  if (!isStaff) {
    if (o.userId !== req.user!.id) return res.status(403).json({ message: "Forbidden" });
    if (o.orderStatus !== "PENDING" && o.orderStatus !== "CANCELLED") {
      return res.status(400).json({ message: "Only pending or cancelled orders can be deleted" });
    }
  }

  const existingRefunds = await db.select().from(refunds).where(eq(refunds.orderId, o.id));
  if (existingRefunds.length) {
    return res.status(400).json({ message: "Cannot delete an order that has refund records" });
  }

  await db.transaction(async (tx) => {
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, o.id));
    // Cancelled orders already had stock restored; completed orders were genuinely sold.
    const shouldRestoreStock = o.orderStatus !== "CANCELLED" && o.orderStatus !== "COMPLETED";
    if (shouldRestoreStock) {
      for (const it of items) {
        const [p] = await tx.select().from(products).where(eq(products.id, it.productId));
        if (p) {
          const newStock = p.stock + it.quantity;
          await tx.update(products).set({
            stock: newStock,
            sold: Math.max(0, (p.sold || 0) - it.quantity),
            updatedAt: new Date(),
          }).where(eq(products.id, p.id));
        }
      }
    }

    const invs = await tx.select().from(invoices).where(eq(invoices.orderId, o.id));
    const pays = await tx.select().from(payments).where(eq(payments.orderId, o.id));
    for (const inv of invs) await tx.delete(receipts).where(eq(receipts.invoiceId, inv.id));
    for (const pay of pays) await tx.delete(receipts).where(eq(receipts.paymentId, pay.id));
    await tx.delete(payments).where(eq(payments.orderId, o.id));
    await tx.delete(invoices).where(eq(invoices.orderId, o.id));

    await tx.update(cancellations).set({ orderId: null }).where(eq(cancellations.orderId, o.id));
    await tx.update(reviews).set({ orderId: null }).where(eq(reviews.orderId, o.id));

    await tx.delete(orderItems).where(eq(orderItems.orderId, o.id));
    await tx.delete(inventoryMovements).where(and(eq(inventoryMovements.referenceType, "ORDER"), eq(inventoryMovements.referenceId, o.id)));
    await tx.delete(orders).where(eq(orders.id, o.id));
  });

  res.json({ message: "Deleted" });
});

export default router;
