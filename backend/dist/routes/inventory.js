"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get("/", async (_req, res) => {
    const rows = await db_1.db.select().from(schema_1.products);
    res.json(rows);
});
const adjustSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid(),
    quantity: zod_1.z.number().int(),
    movementType: zod_1.z.enum(["STOCK_IN", "STOCK_OUT", "DAMAGED", "ADJUSTMENT", "RETURN"]),
    remarks: zod_1.z.string().optional(),
});
router.post("/adjustments", (0, auth_1.requireRole)("ADMIN", "STAFF"), (0, validate_1.validate)(adjustSchema), async (req, res) => {
    const { productId, quantity, movementType, remarks } = req.body;
    const [p] = await db_1.db.select().from(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.id, productId));
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
    await db_1.db.update(schema_1.products).set({ stock: newStock, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.products.id, productId));
    await db_1.db.insert(schema_1.inventoryMovements).values({
        productId, movementType, quantity: movementType === "ADJUSTMENT" ? quantity : Math.abs(quantity),
        previousStock: p.stock, newStock, referenceType: "MANUAL", remarks, createdBy: req.user.id,
    });
    res.json({ productId, previousStock: p.stock, newStock });
});
router.get("/movements", async (_req, res) => {
    const rows = await db_1.db.select().from(schema_1.inventoryMovements).orderBy((0, drizzle_orm_1.desc)(schema_1.inventoryMovements.createdAt));
    res.json(rows);
});
exports.default = router;
//# sourceMappingURL=inventory.js.map