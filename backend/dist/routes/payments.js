"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const gen_1 = require("../utils/gen");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const optionalUuid = zod_1.z.preprocess((v) => (v === "" || v === null ? undefined : v), zod_1.z.string().uuid().optional());
const paySchema = zod_1.z.object({
    orderId: optionalUuid,
    repairId: optionalUuid,
    amount: zod_1.z.coerce.number().min(0.01),
    paymentMethod: zod_1.z.string().min(1),
    paymentStatus: zod_1.z.enum(["UNPAID", "PENDING", "PROCESSING", "PARTIALLY_PAID", "PAID", "FAILED", "EXPIRED", "REFUNDED", "PARTIALLY_REFUNDED"]).optional(),
});
// walk-in / direct payment
router.post("/walk-in", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"), (0, validate_1.validate)(paySchema), async (req, res) => {
    const d = req.body;
    const [payment] = await db_1.db.insert(schema_1.payments).values({
        paymentReference: (0, gen_1.genRef)("PAY"),
        userId: d.userId || null,
        orderId: d.orderId || null,
        repairId: d.repairId || null,
        paymentMethod: d.paymentMethod,
        paymentProvider: "WALK_IN",
        amount: String(d.amount),
        paymentStatus: d.paymentStatus || "PAID",
        paidAt: new Date(),
    }).returning();
    if (d.orderId) {
        const [o] = await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, d.orderId));
        if (o) {
            const paid = await sumPayments(d.orderId);
            await db_1.db.update(schema_1.orders).set({ paymentStatus: paid >= Number(o.totalAmount) ? "PAID" : "PARTIALLY_PAID", updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.orders.id, d.orderId));
        }
    }
    if (d.repairId) {
        const [r] = await db_1.db.select().from(schema_1.repairs).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, d.repairId));
        if (r) {
            const newPaid = Number(r.amountPaid) + d.amount;
            const balance = Math.max(0, Number(r.repairCost) - newPaid);
            await db_1.db.update(schema_1.repairs).set({ amountPaid: String(newPaid), remainingBalance: String(balance), updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, d.repairId));
        }
    }
    let invoiceId = null;
    if (d.orderId) {
        const [inv] = await db_1.db.select().from(schema_1.invoices).where((0, drizzle_orm_1.eq)(schema_1.invoices.orderId, d.orderId));
        if (inv)
            invoiceId = inv.id;
    }
    else if (d.repairId) {
        const [inv] = await db_1.db.select().from(schema_1.invoices).where((0, drizzle_orm_1.eq)(schema_1.invoices.repairId, d.repairId));
        if (inv)
            invoiceId = inv.id;
    }
    if (!invoiceId) {
        const [inv] = await db_1.db.insert(schema_1.invoices).values({
            invoiceNumber: (0, gen_1.genRef)("INV"),
            userId: d.userId || null,
            orderId: d.orderId || null,
            repairId: d.repairId || null,
            totalAmount: String(d.amount),
            amountPaid: String(d.amount),
            balance: "0",
        }).returning();
        invoiceId = inv.id;
    }
    await db_1.db.insert(schema_1.receipts).values({ receiptNumber: (0, gen_1.genRef)("RCT"), paymentId: payment.id, invoiceId });
    res.status(201).json({ payment });
});
async function sumPayments(orderId) {
    const pays = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.orderId, orderId));
    return pays.reduce((a, p) => a + (p.paymentStatus === "PAID" ? Number(p.amount) : 0), 0);
}
// ---------- Online payment gateway (PayMongo) ----------
function paymongoSecret() { return process.env.PAYMONGO_SECRET_KEY; }
function frontendUrl() { return process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:5173"; }
const checkoutHandler = async (req, res) => {
    const { orderId, repairId, amount, paymentMethod } = req.body;
    const [payment] = await db_1.db.insert(schema_1.payments).values({
        paymentReference: (0, gen_1.genRef)("PAY"),
        userId: req.user.id,
        orderId: orderId || null,
        repairId: repairId || null,
        paymentMethod: paymentMethod || "GCash",
        paymentProvider: paymongoSecret() ? "PAYMONGO" : "SANDBOX",
        amount: String(amount),
        paymentStatus: "PENDING",
    }).returning();
    const isCash = (paymentMethod || "").toLowerCase() === "cash";
    if (isCash) {
        await db_1.db.update(schema_1.payments).set({ paymentProvider: "OVER_THE_COUNTER", paymentStatus: "PENDING" }).where((0, drizzle_orm_1.eq)(schema_1.payments.id, payment.id));
        return res.json({ payment, checkoutUrl: null, provider: "CASH" });
    }
    const secret = paymongoSecret();
    if (secret) {
        try {
            const lineItems = [{
                    currency: "PHP",
                    amount: Math.round(Number(amount) * 100),
                    name: orderId ? "Order Payment" : "Repair Payment",
                    quantity: 1,
                    description: payment.paymentReference,
                }];
            const pmTypes = mapPaymentMethod(paymentMethod);
            const body = {
                data: {
                    attributes: {
                        line_items: lineItems,
                        payment_method_types: pmTypes,
                        success_url: `${frontendUrl()}/payment/success?payment_id=${payment.id}`,
                        cancel_url: `${frontendUrl()}/payment/cancel?payment_id=${payment.id}`,
                        description: `CP TechFix ${payment.paymentReference}`,
                        reference_number: payment.paymentReference,
                    },
                },
            };
            const auth = Buffer.from(`${secret}:`).toString("base64");
            const r = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
                body: JSON.stringify(body),
            });
            const json = await r.json();
            if (!r.ok)
                throw new Error(json?.errors?.[0]?.detail || "PayMongo error");
            const checkoutUrl = json.data.attributes.checkout_url;
            await db_1.db.update(schema_1.payments).set({ providerTransactionId: json.data.id }).where((0, drizzle_orm_1.eq)(schema_1.payments.id, payment.id));
            return res.json({ payment, checkoutUrl, provider: "PAYMONGO" });
        }
        catch (e) {
            await db_1.db.update(schema_1.payments).set({ paymentStatus: "FAILED" }).where((0, drizzle_orm_1.eq)(schema_1.payments.id, payment.id));
            return res.status(400).json({ message: e.message || "Gateway error" });
        }
    }
    // Sandbox fallback
    res.json({ payment, checkoutUrl: `${frontendUrl()}/payment/sandbox/${payment.id}`, provider: "SANDBOX" });
};
router.post("/checkout", auth_1.authenticate, checkoutHandler);
router.post("/create", auth_1.authenticate, checkoutHandler);
function mapPaymentMethod(method) {
    const m = (method || "").toLowerCase();
    if (m.includes("gcash"))
        return ["gcash"];
    if (m.includes("maya") || m.includes("paymaya"))
        return ["paymaya"];
    if (m.includes("bank"))
        return ["dob", "dob_ubp"];
    if (m.includes("card"))
        return ["card"];
    return ["gcash", "paymaya", "card"];
}
// Verify payment status (called by frontend success page)
router.get("/verify/:id", async (req, res) => {
    const [p] = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.id, req.params.id));
    if (!p)
        return res.status(404).json({ message: "Not found" });
    // Sandbox payments can be verified without auth (dev/testing flow).
    let user = null;
    const authHeader = req.headers?.authorization;
    if (authHeader) {
        try {
            const token = authHeader.replace(/^Bearer\s+/i, "");
            const { verifyToken } = await Promise.resolve().then(() => __importStar(require("../utils/auth")));
            user = verifyToken(token);
        }
        catch {
            user = null;
        }
    }
    if (p.paymentProvider !== "SANDBOX") {
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
    }
    if (user && user.role === "CUSTOMER" && p.userId && p.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
    }
    if (p.paymentProvider === "PAYMONGO" && p.providerTransactionId) {
        const secret = paymongoSecret();
        if (secret) {
            try {
                const auth = Buffer.from(`${secret}:`).toString("base64");
                const r = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${p.providerTransactionId}`, {
                    headers: { Authorization: `Basic ${auth}` },
                });
                const json = await r.json();
                const status = json?.data?.attributes?.payment_intent?.attributes?.status || json?.data?.attributes?.status;
                const paid = status === "succeeded" || json?.data?.attributes?.payments?.length > 0;
                if (paid && p.paymentStatus !== "PAID") {
                    await db_1.db.update(schema_1.payments).set({ paymentStatus: "PAID", paidAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.payments.id, p.id));
                    await handlePaidSideEffects(p.id);
                }
            }
            catch (e) {
                // ignore
            }
        }
    }
    else if (p.paymentProvider === "SANDBOX") {
        // sandbox: mark paid on verify
        if (p.paymentStatus !== "PAID") {
            await db_1.db.update(schema_1.payments).set({ paymentStatus: "PAID", paidAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.payments.id, p.id));
            await handlePaidSideEffects(p.id);
        }
    }
    const [updated] = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.id, p.id));
    res.json(updated);
});
async function handlePaidSideEffects(paymentId) {
    const [p] = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.id, paymentId));
    if (!p)
        return;
    if (p.orderId) {
        const [o] = await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, p.orderId));
        if (o) {
            const paid = await sumPayments(p.orderId);
            await db_1.db.update(schema_1.orders).set({ paymentStatus: paid >= Number(o.totalAmount) ? "PAID" : "PARTIALLY_PAID", updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.orders.id, p.orderId));
            let [inv] = await db_1.db.select().from(schema_1.invoices).where((0, drizzle_orm_1.eq)(schema_1.invoices.orderId, p.orderId));
            if (!inv) {
                [inv] = await db_1.db.insert(schema_1.invoices).values({ invoiceNumber: (0, gen_1.genRef)("INV"), userId: p.userId, orderId: p.orderId, totalAmount: o.totalAmount, amountPaid: String(p.amount), balance: String(Math.max(0, Number(o.totalAmount) - paid)) }).returning();
            }
            else {
                await db_1.db.update(schema_1.invoices).set({ amountPaid: String(paid), balance: String(Math.max(0, Number(o.totalAmount) - paid)) }).where((0, drizzle_orm_1.eq)(schema_1.invoices.id, inv.id));
            }
            await db_1.db.insert(schema_1.receipts).values({ receiptNumber: (0, gen_1.genRef)("RCT"), paymentId: p.id, invoiceId: inv.id });
        }
    }
    if (p.repairId) {
        const [r] = await db_1.db.select().from(schema_1.repairs).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, p.repairId));
        if (r) {
            const newPaid = Number(r.amountPaid) + Number(p.amount);
            const balance = Math.max(0, Number(r.repairCost) - newPaid);
            await db_1.db.update(schema_1.repairs).set({ amountPaid: String(newPaid), remainingBalance: String(balance), updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.repairs.id, p.repairId));
        }
    }
}
// Webhook (PayMongo)
router.post("/webhook", async (req, res) => {
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
    const raw = req.rawBody || JSON.stringify(req.body);
    if (secret) {
        const sig = req.headers["paymongo-signature"];
        if (!sig)
            return res.status(400).json({ message: "Missing signature" });
        // parse t, te
        const parts = {};
        sig.split(",").forEach((kv) => { const [k, v] = kv.split("="); parts[k] = v; });
        const t = parts.t;
        const te = parts.te;
        const computed = crypto_1.default.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
        if (computed !== te)
            return res.status(401).json({ message: "Invalid signature" });
    }
    const event = req.body?.data?.attributes || req.body;
    const type = event?.type || req.body?.type;
    // PayMongo checkout session paid event
    if (type === "checkout_session.payment.paid" || type === "payment.paid") {
        const checkoutId = event?.data?.id || event?.id;
        // find payment by providerTransactionId
        if (checkoutId) {
            const [p] = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.providerTransactionId, checkoutId));
            if (p && p.paymentStatus !== "PAID") {
                await db_1.db.update(schema_1.payments).set({ paymentStatus: "PAID", paidAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.payments.id, p.id));
                await handlePaidSideEffects(p.id);
            }
        }
    }
    // Backward compat: manual sandbox trigger
    if (req.body?.paymentId && req.body?.status) {
        const { paymentId, status, providerTransactionId } = req.body;
        const [p] = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.id, paymentId));
        if (p) {
            await db_1.db.update(schema_1.payments).set({
                paymentStatus: status === "success" ? "PAID" : "FAILED",
                providerTransactionId: providerTransactionId || p.providerTransactionId,
                paidAt: status === "success" ? new Date() : null,
            }).where((0, drizzle_orm_1.eq)(schema_1.payments.id, paymentId));
            if (status === "success")
                await handlePaidSideEffects(paymentId);
        }
    }
    res.json({ message: "Processed" });
});
router.post("/", auth_1.authenticate, (0, validate_1.validate)(paySchema), async (req, res) => {
    const d = req.body;
    const [payment] = await db_1.db.insert(schema_1.payments).values({
        paymentReference: (0, gen_1.genRef)("PAY"),
        userId: req.user.id,
        orderId: d.orderId || null,
        repairId: d.repairId || null,
        paymentMethod: d.paymentMethod,
        paymentProvider: "MANUAL",
        amount: String(d.amount),
        paymentStatus: d.paymentStatus || "PAID",
        paidAt: new Date(),
    }).returning();
    res.status(201).json(payment);
});
router.get("/gateway-status", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"), async (_req, res) => {
    const secret = process.env.PAYMONGO_SECRET_KEY;
    res.json({
        provider: secret ? "PayMongo" : "Sandbox (simulated)",
        configured: !!secret,
        supportedMethods: ["GCash", "Maya", "Bank Transfer", "Card"],
        frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
        webhookUrl: `${process.env.FRONTEND_URL || "http://localhost:5000"}/api/payments/webhook`,
        mode: secret ? "live/test (PayMongo)" : "sandbox simulation",
    });
});
router.get("/", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"), async (_req, res) => {
    const rows = await db_1.db.select().from(schema_1.payments).orderBy((0, drizzle_orm_1.desc)(schema_1.payments.createdAt));
    res.json(rows);
});
router.get("/:id", auth_1.authenticate, async (req, res) => {
    const [p] = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.id, req.params.id));
    if (!p)
        return res.status(404).json({ message: "Not found" });
    res.json(p);
});
// ---------- Verify by reference ----------
router.post("/verify-reference", auth_1.authenticate, async (req, res) => {
    const { reference } = req.body || {};
    if (!reference)
        return res.status(400).json({ message: "reference required" });
    const [p] = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.paymentReference, reference));
    if (!p)
        return res.status(404).json({ message: "Payment not found" });
    // Reuse verification by fetching the payment record and updating via provider when possible
    let updated = p;
    if (p.paymentProvider === "PAYMONGO" && p.providerTransactionId) {
        const secret = process.env.PAYMONGO_SECRET_KEY;
        if (secret) {
            try {
                const auth = Buffer.from(`${secret}:`).toString("base64");
                const r = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${p.providerTransactionId}`, { headers: { Authorization: `Basic ${auth}` } });
                const json = await r.json();
                const status = json?.data?.attributes?.payment_intent?.attributes?.status || json?.data?.attributes?.status;
                const paid = status === "succeeded" || (json?.data?.attributes?.payments?.length || 0) > 0;
                if (paid && p.paymentStatus !== "PAID") {
                    await db_1.db.update(schema_1.payments).set({ paymentStatus: "PAID", paidAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.payments.id, p.id));
                    // side effects
                    if (p.orderId) {
                        const [o] = await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.id, p.orderId));
                        if (o) {
                            const pays = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.orderId, p.orderId));
                            const paidAmt = pays.reduce((a, x) => a + (x.paymentStatus === "PAID" ? Number(x.amount) : 0), 0);
                            await db_1.db.update(schema_1.orders).set({ paymentStatus: paidAmt >= Number(o.totalAmount) ? "PAID" : "PARTIALLY_PAID", updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.orders.id, p.orderId));
                        }
                    }
                }
                const [u] = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.id, p.id));
                updated = u;
            }
            catch (e) { /* ignore */ }
        }
    }
    res.json(updated);
});
// ---------- Status ----------
router.get("/:id/status", auth_1.authenticate, async (req, res) => {
    const [p] = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.id, req.params.id));
    if (!p)
        return res.status(404).json({ message: "Not found" });
    res.json({ id: p.id, status: p.paymentStatus, paymentReference: p.paymentReference });
});
// ---------- Maya webhook ----------
router.post("/webhooks/maya", async (req, res) => {
    await db_1.db.insert(schema_1.paymentEvents).values({ eventType: "maya.webhook", payload: JSON.stringify(req.body) });
    // reuse generic webhook handler logic by forwarding
    req.url = "/webhook";
    // call the existing webhook handler by re-invoking router? Instead handle inline minimal:
    const event = req.body?.data?.attributes || req.body;
    const paymentId = req.body?.paymentId;
    if (paymentId) {
        const [p] = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.id, paymentId));
        if (p && p.paymentStatus !== "PAID" && req.body?.status === "success") {
            await db_1.db.update(schema_1.payments).set({ paymentStatus: "PAID", paidAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.payments.id, p.id));
        }
    }
    res.json({ message: "Processed" });
});
exports.default = router;
//# sourceMappingURL=payments.js.map