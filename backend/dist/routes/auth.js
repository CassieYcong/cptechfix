"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts. Please try again later." },
});
const zod_1 = require("zod");
const db_1 = require("../db");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../utils/auth");
const validate_1 = require("../middlewares/validate");
const auth_2 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2).regex(/^[A-Za-z\s.'-]+$/, { message: "Name must contain letters only" }),
    email: zod_1.z.string().email(),
    phoneNumber: zod_1.z.string().optional().refine((v) => !v || /^(09\d{9}|\+63\s?9\d{2}\s?\d{3}\s?\d{4})$/.test(v), { message: "Phone must start with 09 or +63 9XX XXX XXXX" }),
    password: zod_1.z.string().min(6),
    confirmPassword: zod_1.z.string().min(6),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords must match", path: ["confirmPassword"] });
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const publicUser = (u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phoneNumber: u.phoneNumber,
    profileImage: u.profileImage,
    role: u.role,
});
router.post("/register", authLimiter, (0, validate_1.validate)(registerSchema), async (req, res) => {
    try {
        const { fullName, email, phoneNumber, password } = req.body;
        const existing = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email));
        if (existing.length)
            return res.status(409).json({ message: "Email already registered" });
        const hashed = await (0, auth_1.hashPassword)(password);
        const [user] = await db_1.db.insert(schema_1.users).values({
            fullName, email, phoneNumber, password: hashed, role: "CUSTOMER",
        }).returning();
        const token = (0, auth_1.signToken)({ id: user.id, role: user.role, email: user.email });
        res.status(201).json({ message: "Registration successful", token, user: publicUser(user) });
    }
    catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});
router.post("/login", authLimiter, (0, validate_1.validate)(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
        const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email));
        if (!user)
            return res.status(401).json({ message: "Invalid credentials" });
        const ok = await (0, auth_1.comparePassword)(password, user.password);
        if (!ok)
            return res.status(401).json({ message: "Invalid credentials" });
        const token = (0, auth_1.signToken)({ id: user.id, role: user.role, email: user.email });
        res.json({ message: "Login successful", token, user: publicUser(user) });
    }
    catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});
router.get("/me", auth_2.authenticate, async (req, res) => {
    const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, req.user.id));
    if (!user)
        return res.status(404).json({ message: "Not found" });
    res.json(publicUser(user));
});
router.put("/me", auth_2.authenticate, async (req, res) => {
    const [existing] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, req.user.id));
    if (!existing)
        return res.status(404).json({ message: "Not found" });
    const { fullName, email, phoneNumber, profileImage } = req.body;
    if (email && email !== existing.email) {
        const [dupe] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email));
        if (dupe)
            return res.status(400).json({ message: "Email already in use" });
    }
    const update = { updatedAt: new Date() };
    if (fullName !== undefined) {
        const name = String(fullName).trim();
        if (!name)
            return res.status(400).json({ message: "Full name is required" });
        if (!/^[A-Za-z\s.'-]+$/.test(name))
            return res.status(400).json({ message: "Full name must contain letters only" });
        update.fullName = name;
    }
    if (email !== undefined) {
        const em = String(email).trim();
        if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))
            return res.status(400).json({ message: "Please enter a valid email address" });
        update.email = em;
    }
    if (phoneNumber !== undefined) {
        const ph = String(phoneNumber).trim();
        if (ph && !/^(09\d{9}|\+63\s?9\d{2}\s?\d{3}\s?\d{4})$/.test(ph))
            return res.status(400).json({ message: "Phone must start with 09 or +63 9XX XXX XXXX" });
        update.phoneNumber = ph;
    }
    if (profileImage !== undefined)
        update.profileImage = profileImage ? String(profileImage) : null;
    const [user] = await db_1.db.update(schema_1.users).set(update).where((0, drizzle_orm_1.eq)(schema_1.users.id, req.user.id)).returning();
    res.json(publicUser(user));
});
router.post("/forgot-password", async (req, res) => {
    // stub: in production send email
    res.json({ message: "If the email exists, a reset link has been sent." });
});
exports.default = router;
//# sourceMappingURL=auth.js.map