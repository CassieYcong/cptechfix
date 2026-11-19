import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { refunds, refundHistory, payments, orders } from "../schema";
import { eq, desc } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { genRef } from "../utils/gen";

const router = Router();
router.use(authenticate, requireRole("ADMIN", "STAFF"));

const refundSchema = z.object({
  paymentId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  refundAmount: z.number().min(0.01),
  refundMethod: z.string().optional(),
  refundReason: z.string().optional(),
});

router.post("/", validate(refundSchema), async (req: AuthRequest, res) => {
  const d = req.body;
  // duplicate check
  if (d.paymentId) {
    const existing = await db.select().from(refunds).where(eq(refunds.paymentId, d.paymentId));
    const active = existing.filter((r) => r.refundStatus !== "REJECTED");
    if (active.length) return res.status(400).json({ message: "Refund already exists for this payment" });
  }
  // refundable amount check
  if (d.paymentId) {
    const [p] = await db.select().from(payments).where(eq(payments.id, d.paymentId));
    if (!p) return res.status(404).json({ message: "Payment not found" });
    const prior = await db.select().from(refunds).where(eq(refunds.paymentId, d.paymentId));
    const refundedSoFar = prior.reduce((a, r) => a + Number(r.refundAmount), 0);
    if (d.refundAmount + refundedSoFar > Number(p.amount)) {
      return res.status(400).json({ message: "Refund amount exceeds refundable amount" });
    }
  }
  const [r] = await db.insert(refunds).values({
    refundReference: genRef("REF"),
    paymentId: d.paymentId || null,
    orderId: d.orderId || null,
    refundAmount: String(d.refundAmount),
    refundMethod: d.refundMethod,
    refundReason: d.refundReason,
    refundStatus: "REQUESTED",
    processedBy: req.user!.id,
  }).returning();
  await db.insert(refundHistory).values({ refundId: r.id, newStatus: "REQUESTED", remarks: "Created", updatedBy: req.user!.id });
  res.status(201).json(r);
});

router.get("/", async (_req, res) => {
  const rows = await db.select().from(refunds).orderBy(desc(refunds.createdAt));
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const [r] = await db.select().from(refunds).where(eq(refunds.id, req.params.id));
  if (!r) return res.status(404).json({ message: "Not found" });
  const hist = await db.select().from(refundHistory).where(eq(refundHistory.refundId, r.id));
  res.json({ ...r, history: hist });
});

router.put("/:id", async (req, res) => {
  const d = req.body;
  const [r] = await db.update(refunds).set({
    refundAmount: d.refundAmount !== undefined ? String(d.refundAmount) : undefined,
    refundMethod: d.refundMethod,
    refundReason: d.refundReason,
    updatedAt: new Date(),
  }).where(eq(refunds.id, req.params.id)).returning();
  res.json(r);
});

router.patch("/:id/status", async (req: AuthRequest, res) => {
  const { status, remarks } = req.body;
  const [r] = await db.select().from(refunds).where(eq(refunds.id, req.params.id));
  if (!r) return res.status(404).json({ message: "Not found" });
  // prevent modifying completed refunded? allow status progression
  await db.update(refunds).set({ refundStatus: status, updatedAt: new Date() }).where(eq(refunds.id, req.params.id));
  await db.insert(refundHistory).values({ refundId: r.id, previousStatus: r.refundStatus, newStatus: status, remarks, updatedBy: req.user!.id });
  // if refunded, update payment status? optional
  if (status === "REFUNDED" && r.paymentId) {
    await db.update(payments).set({ paymentStatus: "REFUNDED" }).where(eq(payments.id, r.paymentId));
  }
  res.json({ message: "Updated" });
});

router.delete("/:id", async (req, res) => {
  const [r] = await db.select().from(refunds).where(eq(refunds.id, req.params.id));
  if (!r) return res.status(404).json({ message: "Not found" });
  if (r.refundStatus === "REFUNDED") return res.status(400).json({ message: "Cannot delete a completed refund" });
  await db.delete(refundHistory).where(eq(refundHistory.refundId, r.id));
  await db.delete(refunds).where(eq(refunds.id, r.id));
  res.json({ message: "Deleted" });
});

export default router;
