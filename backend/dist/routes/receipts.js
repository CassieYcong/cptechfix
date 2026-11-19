import { Router } from "express";
import { db } from "../db";
import { receipts } from "../schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";
const router = Router();
router.get("/:id", authenticate, async (req, res) => {
    const [r] = await db.select().from(receipts).where(eq(receipts.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    res.json(r);
});
export default router;
//# sourceMappingURL=receipts.js.map