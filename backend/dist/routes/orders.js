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
const itemSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid(),
    quantity: zod_1.z.number().int().min(1),
});
const orderSchema = zod_1.z.object({
    items: zod_1.z.array(itemSchema).min(1),
    transactionSource: zod_1.z.enum(["ONLINE", "WALK_IN"]).optional(),
    customerName: zod_1.z.string().optional().refine((v) => !v || /^[A-Za-z\s.'-]+$/.test(v), { message: "Name must contain letters only" }),
    paymentMethod: zod_1.z.string().optional(),
    amountPaid: zod_1.z.number().min(0).optional(),
    userId: zod_1.z.string().uuid().optional(),
    discount: zod_1.z.number().min(0).optional(),
    voucherCode: zod_1.z.string().optional(),
    deliveryMethod: zod_1.z.enum(["DELIVERY", "PICKUP"]).optional(),
    deliveryAddress: zod_1.z.string().optional(),
});
router.post("/", auth_1.authenticate, (0, validate_1.validate)(orderSchema), async (req, res) => {
    const d = req.body;
    const source = d.transactionSource || (req.user.role === "CUSTOMER" ? "ONLINE" : "WALK_IN");
    try {
        const result = await db_1.db.transaction(async (tx) => {
            // validate stock
            let total = 0;
            const prepared = [];
            for (const it of d.items) {
                const [p] = await tx.select().from(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.id, it.productId));
                if (!p)
                    throw new Error("Product not found");
                if (p.stock < it.quantity)
                    throw new Error(`Insufficient stock for ${p.productName}`);
                const unitPrice = Number(p.sellingPrice);
                const subtotal = unitPrice * it.quantity;
                total += subtotal;
                prepared.push({ product: p, qty: it.quantity, unitPrice, subtotal });
            }
            if (d.discount)
                total = Math.max(0, total - d.discount);
            const targetUserId = req.user.role === "CUSTOMER" ? req.user.id : (d.userId || null);
            const [order] = await tx.insert(schema_1.orders).values({
                orderNumber: (0, gen_1.genRef)("ORD"),
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
                await tx.insert(schema_1.orderItems).values({
                    orderId: order.id,
                    productId: pr.product.id,
                    quantity: pr.qty,
                    unitPrice: String(pr.unitPrice),
                    subtotal: String(pr.subtotal),
                });
                // decrement stock
                const newStock = pr.product.stock - pr.qty;
                await tx.update(schema_1.products).set({ stock: newStock, sold: (pr.product.sold || 0) + pr.qty, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.products.id, pr.product.id));
                await tx.insert(schema_1.inventoryMovements).values({
                    productId: pr.product.id,
                    movementType: "SALE",
                    quantity: pr.qty,
                    previousStock: pr.product.stock,
                    newStock,
                    referenceType: "ORDER",
                    referenceId: order.id,
                    createdBy: req.user.id,
                });
            }
            // invoice
            const paid = d.amountPaid ?? 0;
            const [invoice] = await tx.insert(schema_1.invoices).values({
                invoiceNumber: (0, gen_1.genRef)("INV"),
                userId: targetUserId,
                orderId: order.id,
                totalAmount: String(total),
                amountPaid: String(paid),
                balance: String(Math.max(0, total - paid)),
            }).returning();
            // payment if amountPaid
            if (paid > 0) {
                const [payment] = await tx.insert(schema_1.payments).values({
                    paymentReference: (0, gen_1.genRef)("PAY"),
                    userId: targetUserId,
                    orderId: order.id,
                    paymentMethod: d.paymentMethod || "CASH",
                    paymentProvider: source === "ONLINE" ? "GATEWAY" : "WALK_IN",
                    amount: String(paid),
                    paymentStatus: "PAID",
                    paidAt: new Date(),
                }).returning();
                await tx.insert(schema_1.receipts).values({ receiptNumber: (0, gen_1.genRef)("RCT"), paymentId: payment.id, invoiceId: invoice.id });
                await tx.update(schema_1.orders).set({ paymentStatus: paid >= total ? "PAID" : "PARTIALLY_PAID", updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.orders.id, order.id));
            }
            return { order, invoice };
        });
        res.status(201).json(result);
    }
    catch (e) {
        res.status(400).json({ message: e.message || "Order failed" });
    }
});
router.get("/", auth_1.authenticate, async (req, res) => {
    if (req.user.role === "CUSTOMER") {
        const rows = await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.userId, req.user.id)).orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt));
        return res.json(rows);
    }
    const rows = await db_1.db.select().from(schema_1.orders).orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt));
    res.json(rows);
});
router.get("/:id", auth_1.authenticate, async (req, res) => {
    const [o] = await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, req.params.id));
    if (!o)
        return res.status(404).json({ message: "Not found" });
    if (req.user.role === "CUSTOMER" && o.userId !== req.user.id)
        return res.status(403).json({ message: "Forbidden" });
    const items = await db_1.db
        .select({
        id: schema_1.orderItems.id,
        orderId: schema_1.orderItems.orderId,
        productId: schema_1.orderItems.productId,
        productName: schema_1.products.productName,
        productImage: schema_1.products.imageUrl,
        quantity: schema_1.orderItems.quantity,
        unitPrice: schema_1.orderItems.unitPrice,
        subtotal: schema_1.orderItems.subtotal,
    })
        .from(schema_1.orderItems)
        .innerJoin(schema_1.products, (0, drizzle_orm_1.eq)(schema_1.orderItems.productId, schema_1.products.id))
        .where((0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, o.id));
    const pays = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.orderId, o.id));
    const invs = await db_1.db.select().from(schema_1.invoices).where((0, drizzle_orm_1.eq)(schema_1.invoices.orderId, o.id));
    res.json({ ...o, items, payments: pays, invoices: invs });
});
// cancel order (24h)
router.post("/:id/cancel", auth_1.authenticate, async (req, res) => {
    const [o] = await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, req.params.id));
    if (!o)
        return res.status(404).json({ message: "Not found" });
    if (req.user.role === "CUSTOMER" && o.userId !== req.user.id)
        return res.status(403).json({ message: "Forbidden" });
    if (o.orderStatus === "COMPLETED" || o.orderStatus === "CANCELLED")
        return res.status(400).json({ message: "Cannot cancel" });
    const created = new Date(o.createdAt).getTime();
    if (req.user.role === "CUSTOMER" && Date.now() - created > 24 * 60 * 60 * 1000) {
        return res.status(400).json({ message: "Cancellation window expired (24h)" });
    }
    // restore stock
    await db_1.db.transaction(async (tx) => {
        const items = await tx.select().from(schema_1.orderItems).where((0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, o.id));
        for (const it of items) {
            const [p] = await tx.select().from(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.id, it.productId));
            if (p) {
                const newStock = p.stock + it.quantity;
                await tx.update(schema_1.products).set({ stock: newStock, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.products.id, p.id));
                await tx.insert(schema_1.inventoryMovements).values({
                    productId: p.id,
                    movementType: "RETURN",
                    quantity: it.quantity,
                    previousStock: p.stock,
                    newStock,
                    referenceType: "ORDER",
                    referenceId: o.id,
                    remarks: "Order cancelled - stock restored",
                    createdBy: req.user.id,
                });
            }
        }
        await tx.update(schema_1.orders).set({ orderStatus: "CANCELLED", updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.orders.id, o.id));
    });
    res.json({ message: "Cancelled" });
});
// update order details (admin/staff)
router.put("/:id", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"), async (req, res) => {
    const [o] = await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, req.params.id));
    if (!o)
        return res.status(404).json({ message: "Not found" });
    const d = req.body;
    const [updated] = await db_1.db.update(schema_1.orders).set({
        customerName: d.customerName ?? o.customerName,
        deliveryMethod: d.deliveryMethod ?? o.deliveryMethod,
        deliveryAddress: d.deliveryAddress ?? o.deliveryAddress,
        updatedAt: new Date(),
    }).where((0, drizzle_orm_1.eq)(schema_1.orders.id, o.id)).returning();
    res.json(updated);
});
// status update admin
router.patch("/:id/status", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"), async (req, res) => {
    const { orderStatus } = req.body;
    const [o] = await db_1.db.update(schema_1.orders).set({ orderStatus, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.orders.id, req.params.id)).returning();
    res.json(o);
});
// delete order - staff can delete any; customers only their own pending/cancelled orders
router.delete("/:id", auth_1.authenticate, async (req, res) => {
    const [o] = await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, req.params.id));
    if (!o)
        return res.status(404).json({ message: "Not found" });
    const isStaff = req.user.role === "ADMIN" || req.user.role === "STAFF";
    if (!isStaff) {
        if (o.userId !== req.user.id)
            return res.status(403).json({ message: "Forbidden" });
        if (o.orderStatus !== "PENDING" && o.orderStatus !== "CANCELLED") {
            return res.status(400).json({ message: "Only pending or cancelled orders can be deleted" });
        }
    }
    const existingRefunds = await db_1.db.select().from(schema_1.refunds).where((0, drizzle_orm_1.eq)(schema_1.refunds.orderId, o.id));
    if (existingRefunds.length) {
        return res.status(400).json({ message: "Cannot delete an order that has refund records" });
    }
    await db_1.db.transaction(async (tx) => {
        const items = await tx.select().from(schema_1.orderItems).where((0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, o.id));
        // Cancelled orders already had stock restored; completed orders were genuinely sold.
        const shouldRestoreStock = o.orderStatus !== "CANCELLED" && o.orderStatus !== "COMPLETED";
        if (shouldRestoreStock) {
            for (const it of items) {
                const [p] = await tx.select().from(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.id, it.productId));
                if (p) {
                    const newStock = p.stock + it.quantity;
                    await tx.update(schema_1.products).set({
                        stock: newStock,
                        sold: Math.max(0, (p.sold || 0) - it.quantity),
                        updatedAt: new Date(),
                    }).where((0, drizzle_orm_1.eq)(schema_1.products.id, p.id));
                }
            }
        }
        const invs = await tx.select().from(schema_1.invoices).where((0, drizzle_orm_1.eq)(schema_1.invoices.orderId, o.id));
        const pays = await tx.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.orderId, o.id));
        for (const inv of invs)
            await tx.delete(schema_1.receipts).where((0, drizzle_orm_1.eq)(schema_1.receipts.invoiceId, inv.id));
        for (const pay of pays)
            await tx.delete(schema_1.receipts).where((0, drizzle_orm_1.eq)(schema_1.receipts.paymentId, pay.id));
        await tx.delete(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.orderId, o.id));
        await tx.delete(schema_1.invoices).where((0, drizzle_orm_1.eq)(schema_1.invoices.orderId, o.id));
        await tx.update(schema_1.cancellations).set({ orderId: null }).where((0, drizzle_orm_1.eq)(schema_1.cancellations.orderId, o.id));
        await tx.update(schema_1.reviews).set({ orderId: null }).where((0, drizzle_orm_1.eq)(schema_1.reviews.orderId, o.id));
        await tx.delete(schema_1.orderItems).where((0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, o.id));
        await tx.delete(schema_1.inventoryMovements).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryMovements.referenceType, "ORDER"), (0, drizzle_orm_1.eq)(schema_1.inventoryMovements.referenceId, o.id)));
        await tx.delete(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, o.id));
    });
    res.json({ message: "Deleted" });
});
exports.default = router;
//# sourceMappingURL=orders.js.map