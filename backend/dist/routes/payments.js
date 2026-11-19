import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { payments, orders, repairs, invoices, receipts, paymentEvents } from "../schema";
import { eq, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { genRef } from "../utils/gen";
import crypto from "crypto";
const router = Router();
const paySchema = z.object({
    orderId: z.string().uuid().optional(),
    repairId: z.string().uuid().optional(),
    amount: z.number().min(0.01),
    paymentMethod: z.string().min(1),
    paymentStatus: z.enum(["UNPAID", "PENDING", "PROCESSING", "PARTIALLY_PAID", "PAID", "FAILED", "EXPIRED", "REFUNDED", "PARTIALLY_REFUNDED"]).optional(),
});
// walk-in / direct payment
router.post("/walk-in", authenticate, requireRole("ADMIN", "STAFF"), validate(paySchema), async (req, res) => {
    const d = req.body;
    const [payment] = await db.insert(payments).values({
        paymentReference: genRef("PAY"),
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
        const [o] = await db.select().from(orders).where(eq(orders.id, d.orderId));
        if (o) {
            const paid = await sumPayments(d.orderId);
            await db.update(orders).set({ paymentStatus: paid >= Number(o.totalAmount) ? "PAID" : "PARTIALLY_PAID", updatedAt: new Date() }).where(eq(orders.id, d.orderId));
        }
    }
    if (d.repairId) {
        const [r] = await db.select().from(repairs).where(eq(repairs.id, d.repairId));
        if (r) {
            const newPaid = Number(r.amountPaid) + d.amount;
            const balance = Math.max(0, Number(r.repairCost) - newPaid);
            await db.update(repairs).set({ amountPaid: String(newPaid), remainingBalance: String(balance), updatedAt: new Date() }).where(eq(repairs.id, d.repairId));
        }
    }
    let invoiceId = null;
    if (d.orderId) {
        const [inv] = await db.select().from(invoices).where(eq(invoices.orderId, d.orderId));
        if (inv)
            invoiceId = inv.id;
    }
    else if (d.repairId) {
        const [inv] = await db.select().from(invoices).where(eq(invoices.repairId, d.repairId));
        if (inv)
            invoiceId = inv.id;
    }
    if (!invoiceId) {
        const [inv] = await db.insert(invoices).values({
            invoiceNumber: genRef("INV"),
            userId: d.userId || null,
            orderId: d.orderId || null,
            repairId: d.repairId || null,
            totalAmount: String(d.amount),
            amountPaid: String(d.amount),
            balance: "0",
        }).returning();
        invoiceId = inv.id;
    }
    await db.insert(receipts).values({ receiptNumber: genRef("RCT"), paymentId: payment.id, invoiceId });
    res.status(201).json({ payment });
});
async function sumPayments(orderId) {
    const pays = await db.select().from(payments).where(eq(payments.orderId, orderId));
    return pays.reduce((a, p) => a + (p.paymentStatus === "PAID" ? Number(p.amount) : 0), 0);
}
// ---------- Online payment gateway (PayMongo) ----------
function paymongoSecret() { return process.env.PAYMONGO_SECRET_KEY; }
function frontendUrl() { return process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:5173"; }
const checkoutHandler = async (req, res) => {
    const { orderId, repairId, amount, paymentMethod } = req.body;
    const [payment] = await db.insert(payments).values({
        paymentReference: genRef("PAY"),
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
        await db.update(payments).set({ paymentProvider: "OVER_THE_COUNTER", paymentStatus: "PENDING" }).where(eq(payments.id, payment.id));
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
            await db.update(payments).set({ providerTransactionId: json.data.id }).where(eq(payments.id, payment.id));
            return res.json({ payment, checkoutUrl, provider: "PAYMONGO" });
        }
        catch (e) {
            await db.update(payments).set({ paymentStatus: "FAILED" }).where(eq(payments.id, payment.id));
            return res.status(400).json({ message: e.message || "Gateway error" });
        }
    }
    // Sandbox fallback
    res.json({ payment, checkoutUrl: `${frontendUrl()}/payment/sandbox/${payment.id}`, provider: "SANDBOX" });
};
router.post("/checkout", authenticate, checkoutHandler);
router.post("/create", authenticate, checkoutHandler);
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
router.get("/verify/:id", authenticate, async (req, res) => {
    const [p] = await db.select().from(payments).where(eq(payments.id, req.params.id));
    if (!p)
        return res.status(404).json({ message: "Not found" });
    if (p.userId !== req.user.id && req.user.role === "CUSTOMER")
        return res.status(403).json({ message: "Forbidden" });
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
                    await db.update(payments).set({ paymentStatus: "PAID", paidAt: new Date() }).where(eq(payments.id, p.id));
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
            await db.update(payments).set({ paymentStatus: "PAID", paidAt: new Date() }).where(eq(payments.id, p.id));
            await handlePaidSideEffects(p.id);
        }
    }
    const [updated] = await db.select().from(payments).where(eq(payments.id, p.id));
    res.json(updated);
});
async function handlePaidSideEffects(paymentId) {
    const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
    if (!p)
        return;
    if (p.orderId) {
        const [o] = await db.select().from(orders).where(eq(orders.id, p.orderId));
        if (o) {
            const paid = await sumPayments(p.orderId);
            await db.update(orders).set({ paymentStatus: paid >= Number(o.totalAmount) ? "PAID" : "PARTIALLY_PAID", updatedAt: new Date() }).where(eq(orders.id, p.orderId));
            let [inv] = await db.select().from(invoices).where(eq(invoices.orderId, p.orderId));
            if (!inv) {
                [inv] = await db.insert(invoices).values({ invoiceNumber: genRef("INV"), userId: p.userId, orderId: p.orderId, totalAmount: o.totalAmount, amountPaid: String(p.amount), balance: String(Math.max(0, Number(o.totalAmount) - paid)) }).returning();
            }
            else {
                await db.update(invoices).set({ amountPaid: String(paid), balance: String(Math.max(0, Number(o.totalAmount) - paid)) }).where(eq(invoices.id, inv.id));
            }
            await db.insert(receipts).values({ receiptNumber: genRef("RCT"), paymentId: p.id, invoiceId: inv.id });
        }
    }
    if (p.repairId) {
        const [r] = await db.select().from(repairs).where(eq(repairs.id, p.repairId));
        if (r) {
            const newPaid = Number(r.amountPaid) + Number(p.amount);
            const balance = Math.max(0, Number(r.repairCost) - newPaid);
            await db.update(repairs).set({ amountPaid: String(newPaid), remainingBalance: String(balance), updatedAt: new Date() }).where(eq(repairs.id, p.repairId));
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
        const computed = crypto.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
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
            const [p] = await db.select().from(payments).where(eq(payments.providerTransactionId, checkoutId));
            if (p && p.paymentStatus !== "PAID") {
                await db.update(payments).set({ paymentStatus: "PAID", paidAt: new Date() }).where(eq(payments.id, p.id));
                await handlePaidSideEffects(p.id);
            }
        }
    }
    // Backward compat: manual sandbox trigger
    if (req.body?.paymentId && req.body?.status) {
        const { paymentId, status, providerTransactionId } = req.body;
        const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
        if (p) {
            await db.update(payments).set({
                paymentStatus: status === "success" ? "PAID" : "FAILED",
                providerTransactionId: providerTransactionId || p.providerTransactionId,
                paidAt: status === "success" ? new Date() : null,
            }).where(eq(payments.id, paymentId));
            if (status === "success")
                await handlePaidSideEffects(paymentId);
        }
    }
    res.json({ message: "Processed" });
});
router.post("/", authenticate, validate(paySchema), async (req, res) => {
    const d = req.body;
    const [payment] = await db.insert(payments).values({
        paymentReference: genRef("PAY"),
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
router.get("/gateway-status", authenticate, requireRole("ADMIN", "STAFF"), async (_req, res) => {
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
router.get("/", authenticate, requireRole("ADMIN", "STAFF"), async (_req, res) => {
    const rows = await db.select().from(payments).orderBy(desc(payments.createdAt));
    res.json(rows);
});
router.get("/:id", authenticate, async (req, res) => {
    const [p] = await db.select().from(payments).where(eq(payments.id, req.params.id));
    if (!p)
        return res.status(404).json({ message: "Not found" });
    res.json(p);
});
// ---------- Verify by reference ----------
router.post("/verify-reference", authenticate, async (req, res) => {
    const { reference } = req.body || {};
    if (!reference)
        return res.status(400).json({ message: "reference required" });
    const [p] = await db.select().from(payments).where(eq(payments.paymentReference, reference));
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
                    await db.update(payments).set({ paymentStatus: "PAID", paidAt: new Date() }).where(eq(payments.id, p.id));
                    // side effects
                    if (p.orderId) {
                        const [o] = await db.select().from(orders).where(eq(orders.id, p.orderId));
                        if (o) {
                            const pays = await db.select().from(payments).where(eq(payments.orderId, p.orderId));
                            const paidAmt = pays.reduce((a, x) => a + (x.paymentStatus === "PAID" ? Number(x.amount) : 0), 0);
                            await db.update(orders).set({ paymentStatus: paidAmt >= Number(o.totalAmount) ? "PAID" : "PARTIALLY_PAID", updatedAt: new Date() }).where(eq(orders.id, p.orderId));
                        }
                    }
                }
                const [u] = await db.select().from(payments).where(eq(payments.id, p.id));
                updated = u;
            }
            catch (e) { /* ignore */ }
        }
    }
    res.json(updated);
});
// ---------- Status ----------
router.get("/:id/status", authenticate, async (req, res) => {
    const [p] = await db.select().from(payments).where(eq(payments.id, req.params.id));
    if (!p)
        return res.status(404).json({ message: "Not found" });
    res.json({ id: p.id, status: p.paymentStatus, paymentReference: p.paymentReference });
});
// ---------- Maya webhook ----------
router.post("/webhooks/maya", async (req, res) => {
    await db.insert(paymentEvents).values({ eventType: "maya.webhook", payload: JSON.stringify(req.body) });
    // reuse generic webhook handler logic by forwarding
    req.url = "/webhook";
    // call the existing webhook handler by re-invoking router? Instead handle inline minimal:
    const event = req.body?.data?.attributes || req.body;
    const paymentId = req.body?.paymentId;
    if (paymentId) {
        const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
        if (p && p.paymentStatus !== "PAID" && req.body?.status === "success") {
            await db.update(payments).set({ paymentStatus: "PAID", paidAt: new Date() }).where(eq(payments.id, p.id));
        }
    }
    res.json({ message: "Processed" });
});
export default router;
//# sourceMappingURL=payments.js.map