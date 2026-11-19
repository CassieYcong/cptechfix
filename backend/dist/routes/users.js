"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middlewares/auth");
const auth_2 = require("../utils/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF"));
const publicUser = (u) => ({ id: u.id, fullName: u.fullName, email: u.email, phoneNumber: u.phoneNumber, profileImage: u.profileImage, role: u.role, createdAt: u.createdAt });
router.get("/", async (_req, res) => {
    const list = await db_1.db.select({ id: schema_1.users.id, fullName: schema_1.users.fullName, email: schema_1.users.email, phoneNumber: schema_1.users.phoneNumber, profileImage: schema_1.users.profileImage, role: schema_1.users.role, createdAt: schema_1.users.createdAt }).from(schema_1.users);
    res.json(list);
});
router.get("/:id", async (req, res) => {
    const [u] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, req.params.id));
    if (!u)
        return res.status(404).json({ message: "Not found" });
    res.json(publicUser(u));
});
router.post("/", async (req, res) => {
    const { fullName, email, phoneNumber, password, role } = req.body;
    if (!fullName || !email)
        return res.status(400).json({ message: "Name and email are required" });
    const [existing] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email));
    if (existing)
        return res.status(400).json({ message: "Email already in use" });
    const hashed = await (0, auth_2.hashPassword)(password || "Password123!");
    // only admins may assign elevated roles
    const finalRole = req.user.role === "ADMIN" ? (role || "CUSTOMER") : "CUSTOMER";
    const [u] = await db_1.db.insert(schema_1.users).values({ fullName, email, phoneNumber, password: hashed, role: finalRole }).returning();
    res.status(201).json(publicUser(u));
});
router.put("/:id", async (req, res) => {
    const [existing] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, req.params.id));
    if (!existing)
        return res.status(404).json({ message: "Not found" });
    const { fullName, email, phoneNumber, role, password, profileImage } = req.body;
    if (email && email !== existing.email) {
        const [dupe] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email));
        if (dupe)
            return res.status(400).json({ message: "Email already in use" });
    }
    const update = { updatedAt: new Date() };
    if (fullName !== undefined)
        update.fullName = fullName;
    if (email !== undefined)
        update.email = email;
    if (phoneNumber !== undefined)
        update.phoneNumber = phoneNumber;
    if (profileImage !== undefined)
        update.profileImage = profileImage ? String(profileImage) : null;
    if (role !== undefined && req.user.role === "ADMIN")
        update.role = role;
    if (password)
        update.password = await (0, auth_2.hashPassword)(password);
    const [u] = await db_1.db.update(schema_1.users).set(update).where((0, drizzle_orm_1.eq)(schema_1.users.id, req.params.id)).returning();
    res.json(publicUser(u));
});
router.delete("/:id", (0, auth_1.requireRole)("ADMIN"), async (req, res) => {
    if (req.params.id === req.user.id)
        return res.status(400).json({ message: "You cannot delete your own account" });
    const [existing] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, req.params.id));
    if (!existing)
        return res.status(404).json({ message: "Not found" });
    await db_1.db.transaction(async (tx) => {
        // remove personal data that cannot be orphaned
        await tx.delete(schema_1.reviews).where((0, drizzle_orm_1.eq)(schema_1.reviews.userId, req.params.id));
        await tx.delete(schema_1.cartItems).where((0, drizzle_orm_1.eq)(schema_1.cartItems.userId, req.params.id));
        await tx.delete(schema_1.notifications).where((0, drizzle_orm_1.eq)(schema_1.notifications.userId, req.params.id));
        // preserve financial/transaction history by detaching the user
        await tx.update(schema_1.repairs).set({ userId: null }).where((0, drizzle_orm_1.eq)(schema_1.repairs.userId, req.params.id));
        await tx.update(schema_1.orders).set({ userId: null }).where((0, drizzle_orm_1.eq)(schema_1.orders.userId, req.params.id));
        await tx.update(schema_1.payments).set({ userId: null }).where((0, drizzle_orm_1.eq)(schema_1.payments.userId, req.params.id));
        await tx.update(schema_1.invoices).set({ userId: null }).where((0, drizzle_orm_1.eq)(schema_1.invoices.userId, req.params.id));
        await tx.update(schema_1.cancellations).set({ requestedBy: null }).where((0, drizzle_orm_1.eq)(schema_1.cancellations.requestedBy, req.params.id));
        await tx.update(schema_1.refunds).set({ processedBy: null }).where((0, drizzle_orm_1.eq)(schema_1.refunds.processedBy, req.params.id));
        await tx.update(schema_1.inventoryMovements).set({ createdBy: null }).where((0, drizzle_orm_1.eq)(schema_1.inventoryMovements.createdBy, req.params.id));
        await tx.update(schema_1.repairStatusHistory).set({ updatedBy: null }).where((0, drizzle_orm_1.eq)(schema_1.repairStatusHistory.updatedBy, req.params.id));
        await tx.update(schema_1.refundHistory).set({ updatedBy: null }).where((0, drizzle_orm_1.eq)(schema_1.refundHistory.updatedBy, req.params.id));
        await tx.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, req.params.id));
    });
    res.json({ message: "Deleted" });
});
exports.default = router;
//# sourceMappingURL=users.js.map