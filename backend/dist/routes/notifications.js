"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get("/", async (req, res) => {
    const rows = await db_1.db.select().from(schema_1.notifications).where((0, drizzle_orm_1.eq)(schema_1.notifications.userId, req.user.id)).orderBy((0, drizzle_orm_1.desc)(schema_1.notifications.createdAt));
    res.json(rows);
});
router.patch("/:id/read", async (req, res) => {
    await db_1.db.update(schema_1.notifications).set({ isRead: true }).where((0, drizzle_orm_1.eq)(schema_1.notifications.id, req.params.id));
    res.json({ message: "OK" });
});
router.post("/", async (req, res) => {
    const { userId, title, message } = req.body;
    const [n] = await db_1.db.insert(schema_1.notifications).values({ userId, title, message }).returning();
    res.status(201).json(n);
});
exports.default = router;
//# sourceMappingURL=notifications.js.map