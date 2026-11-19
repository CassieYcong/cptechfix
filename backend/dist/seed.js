import "dotenv/config";
import { db } from "./db";
import { users, products } from "./schema";
import { hashPassword } from "./utils/auth";
import { eq } from "drizzle-orm";
async function seed() {
    const adminEmail = "admin@cptechfix.com";
    const existing = await db.select().from(users).where(eq(users.email, adminEmail));
    if (!existing.length) {
        await db.insert(users).values({
            fullName: "CP TechFix Admin",
            email: adminEmail,
            phoneNumber: "09000000000",
            password: await hashPassword("Admin123!"),
            role: "ADMIN",
        });
        console.log("Admin created");
    }
    const staffEmail = "staff@cptechfix.com";
    const existingStaff = await db.select().from(users).where(eq(users.email, staffEmail));
    if (!existingStaff.length) {
        await db.insert(users).values({
            fullName: "CP TechFix Staff",
            email: staffEmail,
            phoneNumber: "09000000001",
            password: await hashPassword("Staff123!"),
            role: "STAFF",
        });
        console.log("Staff created");
    }
    const customerEmail = "customer@cptechfix.com";
    const existingC = await db.select().from(users).where(eq(users.email, customerEmail));
    if (!existingC.length) {
        await db.insert(users).values({
            fullName: "Juan Dela Cruz",
            email: customerEmail,
            phoneNumber: "09171234567",
            password: await hashPassword("Customer123!"),
            role: "CUSTOMER",
        });
        console.log("Customer created");
    }
    const sampleProducts = [
        { sku: "ACC-001", productName: "Wireless Mouse", category: "Accessories", sellingPrice: "499.00", stock: 20, minimumStock: 5 },
        { sku: "ACC-002", productName: "Mechanical Keyboard", category: "Accessories", sellingPrice: "2499.00", stock: 10, minimumStock: 3 },
        { sku: "ACC-003", productName: "USB-C Cable", category: "Cables", sellingPrice: "199.00", stock: 50, minimumStock: 10 },
        { sku: "ACC-004", productName: "Laptop Stand", category: "Accessories", sellingPrice: "899.00", stock: 8, minimumStock: 2 },
        { sku: "ACC-005", productName: "Webcam HD", category: "Peripherals", sellingPrice: "1299.00", stock: 6, minimumStock: 2 },
    ];
    for (const p of sampleProducts) {
        const ex = await db.select().from(products).where(eq(products.sku, p.sku));
        if (!ex.length) {
            await db.insert(products).values({ ...p, costPrice: "0", description: p.productName });
        }
    }
    console.log("Seed complete");
    process.exit(0);
}
seed().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=seed.js.map