"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const auth_2 = require("../utils/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"));
const customerSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2),
    phoneNumber: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
});
router.post("/customers", (0, validate_1.validate)(customerSchema), async (req, res) => {
    const d = req.body;
    // if email provided and exists, return existing
    if (d.email) {
        const [existing] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, d.email));
        if (existing)
            return res.json(existing);
    }
    const email = d.email || `walkin_${Date.now()}@cptechfix.local`;
    const [u] = await db_1.db.insert(schema_1.users).values({
        fullName: d.fullName,
        email,
        phoneNumber: d.phoneNumber,
        password: await (0, auth_2.hashPassword)("WalkIn123!"),
        role: "CUSTOMER",
    }).returning();
    res.status(201).json(u);
});
router.get("/transactions", async (_req, res) => {
    const repairRows = await db_1.db.select().from(schema_1.repairs).where((0, drizzle_orm_1.eq)(schema_1.repairs.transactionSource, "WALK_IN")).orderBy((0, drizzle_orm_1.desc)(schema_1.repairs.createdAt));
    const orderRows = await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.transactionSource, "WALK_IN")).orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt));
    const orderIds = orderRows.map((o) => o.id);
    let itemRows = [];
    let paymentRows = [];
    if (orderIds.length) {
        itemRows = await db_1.db
            .select({
            orderId: schema_1.orderItems.orderId,
            productName: schema_1.products.productName,
            quantity: schema_1.orderItems.quantity,
            unitPrice: schema_1.orderItems.unitPrice,
            subtotal: schema_1.orderItems.subtotal,
        })
            .from(schema_1.orderItems)
            .innerJoin(schema_1.products, (0, drizzle_orm_1.eq)(schema_1.orderItems.productId, schema_1.products.id))
            .where((0, drizzle_orm_1.inArray)(schema_1.orderItems.orderId, orderIds));
        paymentRows = await db_1.db
            .select({
            orderId: schema_1.payments.orderId,
            paymentMethod: schema_1.payments.paymentMethod,
            paymentStatus: schema_1.payments.paymentStatus,
            createdAt: schema_1.payments.createdAt,
        })
            .from(schema_1.payments)
            .where((0, drizzle_orm_1.inArray)(schema_1.payments.orderId, orderIds));
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
    const [rep] = await db_1.db.select().from(schema_1.repairs).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, req.params.id));
    if (rep)
        return res.json({ type: "repair", data: rep });
    const [ord] = await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, req.params.id));
    if (ord)
        return res.json({ type: "order", data: ord });
    res.status(404).json({ message: "Not found" });
});
exports.default = router;
//# sourceMappingURL=walkins.js.map