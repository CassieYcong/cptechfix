import { Router } from "express";
import { db } from "../db";
import { products, inventoryMovements } from "../schema";
import { eq, desc } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { z } from "zod";
const router = Router();
router.use(authenticate);
router.get("/", async (_req, res) => {
    const rows = await db.select().from(products);
    res.json(rows);
});
const adjustSchema = z.object({
    productId: z.string().uuid(),
    quantity: z.number().int(),
    movementType: z.enum(["STOCK_IN", "STOCK_OUT", "DAMAGED", "ADJUSTMENT", "RETURN"]),
    remarks: z.string().optional(),
});
router.post("/adjustments", requireRole("ADMIN", "STAFF"), validate(adjustSchema), async (req, res) => {
    const { productId, quantity, movementType, remarks } = req.body;
    const [p] = await db.select().from(products).where(eq(products.id, productId));
    if (!p)
        return res.status(404).json({ message: "Product not found" });
    let newStock = p.stock;
    if (movementType === "STOCK_IN" || movementType === "RETURN")
        newStock += Math.abs(quantity);
    else if (movementType === "STOCK_OUT" || movementType === "DAMAGED")
        newStock -= Math.abs(quantity);
    else
        newStock += quantity;
    if (newStock < 0)
        return res.status(400).json({ message: "Insufficient stock" });
    await db.update(products).set({ stock: newStock, updatedAt: new Date() }).where(eq(products.id, productId));
    await db.insert(inventoryMovements).values({
        productId, movementType, quantity: movementType === "ADJUSTMENT" ? quantity : Math.abs(quantity),
        previousStock: p.stock, newStock, referenceType: "MANUAL", remarks, createdBy: req.user.id,
    });
    res.json({ productId, previousStock: p.stock, newStock });
});
router.get("/movements", async (_req, res) => {
    const rows = await db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt));
    res.json(rows);
});
export default router;
//# sourceMappingURL=inventory.js.map