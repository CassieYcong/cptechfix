import { Router } from "express";
import { db } from "../db";
import { invoices } from "../schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";
const router = Router();
router.get("/:id", authenticate, async (req, res) => {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, req.params.id));
    if (!inv)
        return res.status(404).json({ message: "Not found" });
    res.json(inv);
});
export default router;
//# sourceMappingURL=invoices.js.map