import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { users } from "../schema";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, signToken } from "../utils/auth";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";
const router = Router();
const registerSchema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phoneNumber: z.string().optional(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords must match", path: ["confirmPassword"] });
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
const publicUser = (u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phoneNumber: u.phoneNumber,
    profileImage: u.profileImage,
    role: u.role,
});
router.post("/register", validate(registerSchema), async (req, res) => {
    try {
        const { fullName, email, phoneNumber, password } = req.body;
        const existing = await db.select().from(users).where(eq(users.email, email));
        if (existing.length)
            return res.status(409).json({ message: "Email already registered" });
        const hashed = await hashPassword(password);
        const [user] = await db.insert(users).values({
            fullName, email, phoneNumber, password: hashed, role: "CUSTOMER",
        }).returning();
        const token = signToken({ id: user.id, role: user.role, email: user.email });
        res.status(201).json({ message: "Registration successful", token, user: publicUser(user) });
    }
    catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});
router.post("/login", validate(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user)
            return res.status(401).json({ message: "Invalid credentials" });
        const ok = await comparePassword(password, user.password);
        if (!ok)
            return res.status(401).json({ message: "Invalid credentials" });
        const token = signToken({ id: user.id, role: user.role, email: user.email });
        res.json({ message: "Login successful", token, user: publicUser(user) });
    }
    catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});
router.get("/me", authenticate, async (req, res) => {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id));
    if (!user)
        return res.status(404).json({ message: "Not found" });
    res.json(publicUser(user));
});
router.put("/me", authenticate, async (req, res) => {
    const [existing] = await db.select().from(users).where(eq(users.id, req.user.id));
    if (!existing)
        return res.status(404).json({ message: "Not found" });
    const { fullName, email, phoneNumber, profileImage } = req.body;
    if (email && email !== existing.email) {
        const [dupe] = await db.select().from(users).where(eq(users.email, email));
        if (dupe)
            return res.status(400).json({ message: "Email already in use" });
    }
    const update = { updatedAt: new Date() };
    if (fullName !== undefined) {
        if (!String(fullName).trim())
            return res.status(400).json({ message: "Full name is required" });
        update.fullName = String(fullName).trim();
    }
    if (email !== undefined)
        update.email = email;
    if (phoneNumber !== undefined)
        update.phoneNumber = phoneNumber;
    if (profileImage !== undefined)
        update.profileImage = profileImage ? String(profileImage) : null;
    const [user] = await db.update(users).set(update).where(eq(users.id, req.user.id)).returning();
    res.json(publicUser(user));
});
router.post("/forgot-password", async (req, res) => {
    // stub: in production send email
    res.json({ message: "If the email exists, a reset link has been sent." });
});
export default router;
//# sourceMappingURL=auth.js.map