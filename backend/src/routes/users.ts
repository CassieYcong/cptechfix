import { Router } from "express";
import { db } from "../db";
import { users, repairs, orders, payments, invoices, cancellations, reviews, cartItems, notifications, inventoryMovements, repairStatusHistory, refundHistory, refunds } from "../schema";
import { eq } from "drizzle-orm";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";
import { hashPassword } from "../utils/auth";

const router = Router();
router.use(authenticate, requireRole("ADMIN", "STAFF"));

const publicUser = (u: any) => ({ id: u.id, fullName: u.fullName, email: u.email, phoneNumber: u.phoneNumber, profileImage: u.profileImage, role: u.role, createdAt: u.createdAt });

router.get("/", async (_req, res) => {
  const list = await db.select({ id: users.id, fullName: users.fullName, email: users.email, phoneNumber: users.phoneNumber, profileImage: users.profileImage, role: users.role, createdAt: users.createdAt }).from(users);
  res.json(list);
});

router.get("/:id", async (req, res) => {
  const [u] = await db.select().from(users).where(eq(users.id, req.params.id));
  if (!u) return res.status(404).json({ message: "Not found" });
  res.json(publicUser(u));
});

router.post("/", async (req: AuthRequest, res) => {
  const { fullName, email, phoneNumber, password, role } = req.body;
  const name = String(fullName || "").trim();
  const em = String(email || "").trim();
  const ph = String(phoneNumber || "").trim();
  if (!name || !em) return res.status(400).json({ message: "Name and email are required" });
  if (!/^[A-Za-z\s.'-]+$/.test(name)) return res.status(400).json({ message: "Name must contain letters only" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return res.status(400).json({ message: "Please enter a valid email address" });
  if (ph && !/^(09\d{9}|\+63\s?9\d{2}\s?\d{3}\s?\d{4})$/.test(ph)) return res.status(400).json({ message: "Phone must start with 09 or +63 9XX XXX XXXX" });
  const [existing] = await db.select().from(users).where(eq(users.email, em));
  if (existing) return res.status(400).json({ message: "Email already in use" });
  const hashed = await hashPassword(password || "Password123!");
  // only admins may assign elevated roles
  const finalRole = req.user!.role === "ADMIN" ? (role || "CUSTOMER") : "CUSTOMER";
  const [u] = await db.insert(users).values({ fullName: name, email: em, phoneNumber: ph || null, password: hashed, role: finalRole }).returning();
  res.status(201).json(publicUser(u));
});

router.put("/:id", async (req: AuthRequest, res) => {
  const [existing] = await db.select().from(users).where(eq(users.id, req.params.id));
  if (!existing) return res.status(404).json({ message: "Not found" });
  const { fullName, email, phoneNumber, role, password, profileImage } = req.body;
  const name = fullName !== undefined ? String(fullName).trim() : undefined;
  const em = email !== undefined ? String(email).trim() : undefined;
  const ph = phoneNumber !== undefined ? String(phoneNumber).trim() : undefined;
  if (name !== undefined) {
    if (!name) return res.status(400).json({ message: "Name is required" });
    if (!/^[A-Za-z\s.'-]+$/.test(name)) return res.status(400).json({ message: "Name must contain letters only" });
  }
  if (em !== undefined) {
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return res.status(400).json({ message: "Please enter a valid email address" });
  }
  if (ph !== undefined && ph && !/^(09\d{9}|\+63\s?9\d{2}\s?\d{3}\s?\d{4})$/.test(ph)) {
    return res.status(400).json({ message: "Phone must start with 09 or +63 9XX XXX XXXX" });
  }
  if (em && em !== existing.email) {
    const [dupe] = await db.select().from(users).where(eq(users.email, em));
    if (dupe) return res.status(400).json({ message: "Email already in use" });
  }
  const update: any = { updatedAt: new Date() };
  if (name !== undefined) update.fullName = name;
  if (em !== undefined) update.email = em;
  if (ph !== undefined) update.phoneNumber = ph || null;
  if (profileImage !== undefined) update.profileImage = profileImage ? String(profileImage) : null;
  if (role !== undefined && req.user!.role === "ADMIN") update.role = role;
  if (password) update.password = await hashPassword(password);
  const [u] = await db.update(users).set(update).where(eq(users.id, req.params.id)).returning();
  res.json(publicUser(u));
});

router.delete("/:id", requireRole("ADMIN"), async (req: AuthRequest, res) => {
  if (req.params.id === req.user!.id) return res.status(400).json({ message: "You cannot delete your own account" });
  const [existing] = await db.select().from(users).where(eq(users.id, req.params.id));
  if (!existing) return res.status(404).json({ message: "Not found" });

  await db.transaction(async (tx) => {
    // remove personal data that cannot be orphaned
    await tx.delete(reviews).where(eq(reviews.userId, req.params.id));
    await tx.delete(cartItems).where(eq(cartItems.userId, req.params.id));
    await tx.delete(notifications).where(eq(notifications.userId, req.params.id));
    // preserve financial/transaction history by detaching the user
    await tx.update(repairs).set({ userId: null }).where(eq(repairs.userId, req.params.id));
    await tx.update(orders).set({ userId: null }).where(eq(orders.userId, req.params.id));
    await tx.update(payments).set({ userId: null }).where(eq(payments.userId, req.params.id));
    await tx.update(invoices).set({ userId: null }).where(eq(invoices.userId, req.params.id));
    await tx.update(cancellations).set({ requestedBy: null }).where(eq(cancellations.requestedBy, req.params.id));
    await tx.update(refunds).set({ processedBy: null }).where(eq(refunds.processedBy, req.params.id));
    await tx.update(inventoryMovements).set({ createdBy: null }).where(eq(inventoryMovements.createdBy, req.params.id));
    await tx.update(repairStatusHistory).set({ updatedBy: null }).where(eq(repairStatusHistory.updatedBy, req.params.id));
    await tx.update(refundHistory).set({ updatedBy: null }).where(eq(refundHistory.updatedBy, req.params.id));
    await tx.delete(users).where(eq(users.id, req.params.id));
  });

  res.json({ message: "Deleted" });
});

export default router;
