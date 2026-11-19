import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { products, inventoryMovements, orderItems } from "../schema";
import { eq, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
const router = Router();
const productSchema = z.object({
    sku: z.string().min(1),
    productName: z.string().min(1),
    description: z.string().optional(),
    category: z.string().optional(),
    brand: z.string().optional(),
    supplier: z.string().optional(),
    costPrice: z.number().min(0).optional(),
    sellingPrice: z.number().min(0),
    stock: z.number().int().min(0).optional(),
    minimumStock: z.number().int().min(0).optional(),
    imageUrl: z.string().optional(),
    isActive: z.boolean().optional(),
});
router.get("/", async (req, res) => {
    const q = req.query.q;
    const category = req.query.category;
    let rows = await db.select().from(products);
    if (q)
        rows = rows.filter((p) => p.productName.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()));
    if (category)
        rows = rows.filter((p) => p.category === category);
    res.json(rows);
});
// movements (must be before /:id)
router.get("/movements", authenticate, async (req, res) => {
    const rows = await db.select().from(inventoryMovements).orderBy(inventoryMovements.createdAt);
    res.json(rows);
});
// low stock (must be before /:id)
router.get("/low-stock", authenticate, async (_req, res) => {
    const rows = await db.select().from(products);
    res.json(rows.filter((p) => p.stock <= p.minimumStock));
});
router.post("/:id/views", async (req, res) => {
    const [p] = await db.update(products).set({ viewsCount: sql `${products.viewsCount} + 1` }).where(eq(products.id, req.params.id)).returning();
    if (!p)
        return res.status(404).json({ message: "Not found" });
    res.json({ id: p.id, viewsCount: p.viewsCount });
});
router.get("/:id", async (req, res) => {
    const [p] = await db.select().from(products).where(eq(products.id, req.params.id));
    if (!p)
        return res.status(404).json({ message: "Not found" });
    res.json(p);
});
router.post("/", authenticate, requireRole("ADMIN", "STAFF"), validate(productSchema), async (req, res) => {
    const data = req.body;
    const dupe = await db.select().from(products).where(eq(products.sku, data.sku));
    if (dupe.length)
        return res.status(409).json({ message: "SKU already exists" });
    const [p] = await db.insert(products).values({
        sku: data.sku,
        productName: data.productName,
        description: data.description,
        category: data.category,
        brand: data.brand,
        supplier: data.supplier,
        costPrice: String(data.costPrice ?? 0),
        sellingPrice: String(data.sellingPrice),
        stock: data.stock ?? 0,
        minimumStock: data.minimumStock ?? 5,
        imageUrl: data.imageUrl,
        isActive: data.isActive ?? true,
    }).returning();
    // initial movement
    await db.insert(inventoryMovements).values({
        productId: p.id,
        movementType: "STOCK_IN",
        quantity: p.stock,
        previousStock: 0,
        newStock: p.stock,
        referenceType: "PRODUCT",
        referenceId: p.id,
        remarks: "Initial stock",
        createdBy: req.user.id,
    });
    res.status(201).json(p);
});
router.put("/:id", authenticate, requireRole("ADMIN", "STAFF"), async (req, res) => {
    const data = req.body;
    if (data.sku !== undefined) {
        const dupe = await db.select().from(products).where(eq(products.sku, data.sku));
        if (dupe.length && dupe[0].id !== req.params.id)
            return res.status(409).json({ message: "SKU already exists" });
    }
    const [existing] = await db.select().from(products).where(eq(products.id, req.params.id));
    if (!existing)
        return res.status(404).json({ message: "Product not found" });
    const [p] = await db.update(products).set({
        sku: data.sku,
        productName: data.productName,
        description: data.description,
        category: data.category,
        brand: data.brand,
        supplier: data.supplier,
        costPrice: data.costPrice !== undefined ? String(data.costPrice) : undefined,
        sellingPrice: data.sellingPrice !== undefined ? String(data.sellingPrice) : undefined,
        stock: data.stock !== undefined ? Number(data.stock) : undefined,
        minimumStock: data.minimumStock !== undefined ? Number(data.minimumStock) : undefined,
        imageUrl: data.imageUrl,
        isActive: data.isActive,
        updatedAt: new Date(),
    }).where(eq(products.id, req.params.id)).returning();
    if (data.stock !== undefined && Number(data.stock) !== existing.stock) {
        await db.insert(inventoryMovements).values({
            productId: existing.id,
            movementType: "ADJUSTMENT",
            quantity: Number(data.stock) - existing.stock,
            previousStock: existing.stock,
            newStock: Number(data.stock),
            referenceType: "PRODUCT_UPDATE",
            referenceId: existing.id,
            remarks: "Stock edited in product form",
            createdBy: req.user.id,
        });
    }
    res.json(p);
});
router.delete("/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
    // check order history
    const used = await db.select().from(orderItems).where(eq(orderItems.productId, req.params.id));
    // check inventory movements (created on product creation and stock adjustments)
    const moves = await db.select().from(inventoryMovements).where(eq(inventoryMovements.productId, req.params.id));
    if (used.length || moves.length) {
        await db.update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, req.params.id));
        return res.json({ message: "Product deactivated (has related records)" });
    }
    await db.delete(products).where(eq(products.id, req.params.id));
    res.json({ message: "Deleted" });
});
// stock adjustment
const adjustSchema = z.object({
    productId: z.string().uuid(),
    quantity: z.number().int(),
    movementType: z.enum(["STOCK_IN", "STOCK_OUT", "DAMAGED", "ADJUSTMENT", "RETURN"]),
    remarks: z.string().optional(),
});
router.post("/adjustments", authenticate, requireRole("ADMIN", "STAFF"), validate(adjustSchema), async (req, res) => {
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
        newStock += quantity; // adjustment can be +/- 
    if (newStock < 0)
        return res.status(400).json({ message: "Insufficient stock" });
    await db.update(products).set({ stock: newStock, updatedAt: new Date() }).where(eq(products.id, productId));
    await db.insert(inventoryMovements).values({
        productId,
        movementType,
        quantity: movementType === "ADJUSTMENT" ? quantity : Math.abs(quantity),
        previousStock: p.stock,
        newStock,
        referenceType: "MANUAL",
        remarks,
        createdBy: req.user.id,
    });
    res.json({ productId, previousStock: p.stock, newStock });
});
export default router;
//# sourceMappingURL=products.js.map