"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../utils/auth");
const validate_1 = require("../middlewares/validate");
const auth_2 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    phoneNumber: zod_1.z.string().optional(),
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
router.post("/register", (0, validate_1.validate)(registerSchema), async (req, res) => {
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
router.post("/login", (0, validate_1.validate)(loginSchema), async (req, res) => {
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
    const [user] = await db_1.db.update(schema_1.users).set(update).where((0, drizzle_orm_1.eq)(schema_1.users.id, req.user.id)).returning();
    res.json(publicUser(user));
});
router.post("/forgot-password", async (req, res) => {
    // stub: in production send email
    res.json({ message: "If the email exists, a reset link has been sent." });
});
exports.default = router;
//# sourceMappingURL=auth.js.map