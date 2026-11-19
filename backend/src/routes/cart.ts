import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { cartItems, products } from "../schema";
import { eq, and } from "drizzle-orm";
import { authenticate, AuthRequest } from "../middlewares/auth";
import { validate } from "../middlewares/validate";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  const rows = await db.select().from(cartItems).where(eq(cartItems.userId, req.user!.id));
  // join product
  const result = [];
  for (const c of rows) {
    const [p] = await db.select().from(products).where(eq(products.id, c.productId));
    result.push({ ...c, product: p });
  }
  res.json(result);
});

const addSchema = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).default(1) });
router.post("/", validate(addSchema), async (req: AuthRequest, res) => {
  const { productId, quantity } = req.body;
  const [p] = await db.select().from(products).where(eq(products.id, productId));
  if (!p) return res.status(404).json({ message: "Product not found" });
  // upsert
  const existing = await db.select().from(cartItems).where(and(eq(cartItems.userId, req.user!.id), eq(cartItems.productId, productId)));
  if (existing.length) {
    const newQty = Math.min(p.stock, existing[0].quantity + quantity);
    const [updated] = await db.update(cartItems).set({ quantity: newQty, updatedAt: new Date() }).where(eq(cartItems.id, existing[0].id)).returning();
    return res.json(updated);
  }
  const [created] = await db.insert(cartItems).values({ userId: req.user!.id, productId, quantity: Math.min(p.stock, quantity) }).returning();
  res.status(201).json(created);
});

router.put("/:id", async (req: AuthRequest, res) => {
  const { quantity } = req.body;
  const [c] = await db.select().from(cartItems).where(eq(cartItems.id, req.params.id));
  if (!c || c.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
  const [p] = await db.select().from(products).where(eq(products.id, c.productId));
  const q = Math.max(1, Math.min(p.stock, Number(quantity)));
  const [updated] = await db.update(cartItems).set({ quantity: q, updatedAt: new Date() }).where(eq(cartItems.id, req.params.id)).returning();
  res.json(updated);
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const [c] = await db.select().from(cartItems).where(eq(cartItems.id, req.params.id));
  if (!c || c.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
  await db.delete(cartItems).where(eq(cartItems.id, req.params.id));
  res.json({ message: "Removed" });
});

router.delete("/", async (req: AuthRequest, res) => {
  await db.delete(cartItems).where(eq(cartItems.userId, req.user!.id));
  res.json({ message: "Cleared" });
});

export default router;
