import { Router } from "express";
import { db } from "../db";
import { notifications } from "../schema";
import { eq, desc } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";
const router = Router();
router.use(authenticate);
router.get("/", async (req, res) => {
    const rows = await db.select().from(notifications).where(eq(notifications.userId, req.user.id)).orderBy(desc(notifications.createdAt));
    res.json(rows);
});
router.patch("/:id/read", async (req, res) => {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, req.params.id));
    res.json({ message: "OK" });
});
router.post("/", async (req, res) => {
    const { userId, title, message } = req.body;
    const [n] = await db.insert(notifications).values({ userId, title, message }).returning();
    res.status(201).json(n);
});
export default router;
//# sourceMappingURL=notifications.js.map