"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("./db");
const schema_1 = require("./schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("./utils/auth");
const gen_1 = require("./utils/gen");
const CATEGORIES = ["Laptop Parts", "Desktop Components", "Computer Accessories", "Storage Devices", "Networking Equipment", "Computer Peripherals", "Repair Tools"];
const BRANDS = ["Samsung", "Kingston", "Logitech", "Asus", "Acer", "Dell", "HP", "Lenovo", "Seagate", "Western Digital", "TP-Link", "Razer", "Corsair", "MSI"];
const PRODUCT_NAMES = [
    { name: "Samsung 500 EVO M.2 NVMe SSD 500GB", cat: "Storage Devices", brand: "Samsung", price: 3499, cost: 2800, stock: 25 },
    { name: "Kingston Fury Beast DDR4 16GB RAM", cat: "Desktop Components", brand: "Kingston", price: 2899, cost: 2300, stock: 30 },
    { name: "Logitech G PRO X Superlight Mouse", cat: "Computer Peripherals", brand: "Logitech", price: 6995, cost: 5500, stock: 12 },
    { name: "Razer Huntsman Mini Keyboard", cat: "Computer Peripherals", brand: "Razer", price: 5499, cost: 4200, stock: 8 },
    { name: "Seagate Barracuda 2TB HDD", cat: "Storage Devices", brand: "Seagate", price: 2999, cost: 2400, stock: 18 },
    { name: "WD Blue 1TB SSD", cat: "Storage Devices", brand: "Western Digital", price: 3299, cost: 2600, stock: 20 },
    { name: "TP-Link Archer AX55 Router", cat: "Networking Equipment", brand: "TP-Link", price: 4599, cost: 3700, stock: 10 },
    { name: "Asus TUF Gaming Monitor 24\"", cat: "Computer Peripherals", brand: "Asus", price: 9999, cost: 8200, stock: 6 },
    { name: "Corsair CX650 Power Supply", cat: "Desktop Components", brand: "Corsair", price: 4299, cost: 3500, stock: 14 },
    { name: "Laptop Charger 65W USB-C", cat: "Laptop Parts", brand: "Dell", price: 1299, cost: 900, stock: 25 },
    { name: "Cooling Fan 120mm RGB", cat: "Desktop Components", brand: "MSI", price: 699, cost: 450, stock: 40 },
    { name: "HDMI Cable 2m", cat: "Computer Accessories", brand: "Generic", price: 299, cost: 150, stock: 60 },
    { name: "USB-C to USB-A Adapter", cat: "Computer Accessories", brand: "Generic", price: 199, cost: 100, stock: 80 },
    { name: "Laptop RAM 8GB DDR4", cat: "Laptop Parts", brand: "Kingston", price: 1899, cost: 1500, stock: 22 },
    { name: "NVMe Heatsink", cat: "Laptop Parts", brand: "Generic", price: 349, cost: 200, stock: 35 },
    { name: "Wireless Keyboard and Mouse Combo", cat: "Computer Peripherals", brand: "Logitech", price: 1899, cost: 1400, stock: 15 },
    { name: "Webcam Full HD 1080p", cat: "Computer Peripherals", brand: "Logitech", price: 2199, cost: 1700, stock: 12 },
    { name: "External HDD 1TB", cat: "Storage Devices", brand: "Seagate", price: 2799, cost: 2200, stock: 16 },
    { name: "Ethernet Cable Cat6 5m", cat: "Networking Equipment", brand: "TP-Link", price: 349, cost: 180, stock: 50 },
    { name: "Thermal Paste (5g)", cat: "Repair Tools", brand: "Generic", price: 249, cost: 120, stock: 45 },
    { name: "Screwdriver Set Precision", cat: "Repair Tools", brand: "Generic", price: 499, cost: 280, stock: 20 },
    { name: "Laptop Screen 15.6\" FHD", cat: "Laptop Parts", brand: "Acer", price: 4599, cost: 3600, stock: 5 },
    { name: "Laptop Battery 6-cell", cat: "Laptop Parts", brand: "HP", price: 2999, cost: 2300, stock: 7 },
    { name: "Desktop Motherboard B550", cat: "Desktop Components", brand: "Asus", price: 7499, cost: 6100, stock: 4 },
    { name: "GPU Bracket / Support", cat: "Desktop Components", brand: "Generic", price: 399, cost: 220, stock: 25 },
    { name: "Monitor Stand Adjustable", cat: "Computer Accessories", brand: "Generic", price: 1299, cost: 900, stock: 10 },
    { name: "Surge Protector 6-outlet", cat: "Computer Accessories", brand: "Generic", price: 899, cost: 600, stock: 18 },
    { name: "USB Hub 4-port", cat: "Computer Accessories", brand: "Generic", price: 599, cost: 380, stock: 30 },
    { name: "Bluetooth Adapter", cat: "Computer Accessories", brand: "Generic", price: 449, cost: 260, stock: 28 },
    { name: "Laptop Cooling Pad", cat: "Computer Accessories", brand: "Generic", price: 999, cost: 700, stock: 12 },
];
const CUSTOMERS = [
    "Maria Santos", "Jose Reyes", "Anna Cruz", "Mark Dela Cruz", "Liza Mendoza",
    "Carlos Garcia", "Diana Lopez", "Ramon Torres", "Grace Lim", "Patrick Tan",
    "Sofia Ramos", "Daniel Aquino", "Camille Villanueva", "Kevin Chua", "Jasmine Ong",
    "Michael Go", "Rachel Sy", "Bryan Lee", "Irene Tan", "Nathan Uy",
];
const TECHNICIANS = ["Alex Cruz", "Ben Santos", "Carlo Reyes", "Diana Lim", "Eric Tan"];
const DEVICES = ["Laptop", "Desktop", "Monitor", "Printer", "Tablet"];
const BRANDS_DEV = ["Dell", "HP", "Lenovo", "Asus", "Acer", "Apple"];
const SERVICES = ["Screen Replacement", "Battery Replacement", "Data Recovery", "Hardware Upgrade", "Virus Removal", "Motherboard Repair", "Cleaning", "Diagnostics"];
const PAYMENT_METHODS = ["GCash", "Maya", "Card", "Bank Transfer", "Cash", "COD"];
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
async function seed() {
    // guard
    const existingOrders = await db_1.db.select().from(schema_1.orders);
    if (existingOrders.length >= 20) {
        console.log("Seed already present (orders >= 20). Skipping.");
        process.exit(0);
    }
    // ensure admin/staff/customer exist
    const adminEmail = "admin@cptechfix.com";
    let admin = (await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, adminEmail)))[0];
    if (!admin) {
        [admin] = await db_1.db.insert(schema_1.users).values({ fullName: "CP TechFix Admin", email: adminEmail, phoneNumber: "09000000000", password: await (0, auth_1.hashPassword)("Admin123!"), role: "ADMIN" }).returning();
    }
    const staffEmail = "staff@cptechfix.com";
    let staff = (await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, staffEmail)))[0];
    if (!staff) {
        [staff] = await db_1.db.insert(schema_1.users).values({ fullName: "CP TechFix Staff", email: staffEmail, phoneNumber: "09000000001", password: await (0, auth_1.hashPassword)("Staff123!"), role: "STAFF" }).returning();
    }
    const custEmail = "customer@cptechfix.com";
    let cust0 = (await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, custEmail)))[0];
    if (!cust0) {
        [cust0] = await db_1.db.insert(schema_1.users).values({ fullName: "Juan Dela Cruz", email: custEmail, phoneNumber: "09171234567", password: await (0, auth_1.hashPassword)("Customer123!"), role: "CUSTOMER" }).returning();
    }
    // employees/technicians
    const techUsers = [];
    for (let i = 0; i < TECHNICIANS.length; i++) {
        const email = `tech${i + 1}@cptechfix.com`;
        let u = (await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)))[0];
        if (!u) {
            [u] = await db_1.db.insert(schema_1.users).values({ fullName: TECHNICIANS[i], email, phoneNumber: `0918${1000000 + i}`, password: await (0, auth_1.hashPassword)("Tech123!"), role: "STAFF" }).returning();
        }
        techUsers.push(u);
    }
    // customers
    const customers = [cust0];
    for (let i = 0; i < CUSTOMERS.length; i++) {
        const email = `customer${i + 1}@cptechfix.com`;
        let u = (await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)))[0];
        if (!u) {
            [u] = await db_1.db.insert(schema_1.users).values({ fullName: CUSTOMERS[i], email, phoneNumber: `0917${2000000 + i}`, password: await (0, auth_1.hashPassword)("Customer123!"), role: "CUSTOMER" }).returning();
        }
        customers.push(u);
    }
    // products
    const insertedProducts = [];
    for (let i = 0; i < PRODUCT_NAMES.length; i++) {
        const p = PRODUCT_NAMES[i];
        const sku = `SKU-${String(i + 1).padStart(3, "0")}`;
        let ex = (await db_1.db.select().from(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.sku, sku)))[0];
        if (!ex) {
            [ex] = await db_1.db.insert(schema_1.products).values({
                sku,
                productName: p.name,
                description: `${p.name} - high quality ${p.cat.toLowerCase()} for your setup.`,
                category: p.cat,
                brand: p.brand,
                costPrice: String(p.cost),
                sellingPrice: String(p.price),
                stock: p.stock,
                minimumStock: Math.max(2, Math.floor(p.stock * 0.2)),
                imageUrl: `https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80`,
                rating: "4.5",
                sold: rnd(0, 50),
            }).returning();
        }
        insertedProducts.push(ex);
    }
    // inventory movements for initial stock
    for (const p of insertedProducts) {
        await db_1.db.insert(schema_1.inventoryMovements).values({
            productId: p.id,
            movementType: "STOCK_IN",
            quantity: p.stock,
            previousStock: 0,
            newStock: p.stock,
            referenceType: "SEED",
            remarks: "Initial stock",
            createdBy: admin.id,
        });
    }
    // repairs
    const repairStatuses = ["PENDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    const insertedRepairs = [];
    for (let i = 0; i < 20; i++) {
        const c = pick(customers);
        const status = pick(repairStatuses);
        const cost = rnd(500, 5000);
        const paid = status === "COMPLETED" ? cost : rnd(0, Math.floor(cost * 0.5));
        const [r] = await db_1.db.insert(schema_1.repairs).values({
            referenceNumber: (0, gen_1.genRef)("REP"),
            userId: c.id,
            transactionSource: i % 3 === 0 ? "WALK_IN" : "ONLINE",
            customerName: c.fullName,
            contactNumber: c.phoneNumber,
            deviceType: pick(DEVICES),
            brand: pick(BRANDS_DEV),
            model: `Model-${rnd(1, 9)}`,
            problemDescription: "Device not functioning properly, needs diagnosis and repair.",
            serviceType: pick(SERVICES),
            technician: pick(TECHNICIANS),
            repairCost: String(cost),
            amountPaid: String(paid),
            remainingBalance: String(Math.max(0, cost - paid)),
            preferredDate: daysAgo(rnd(1, 30)),
            expectedCompletionDate: daysAgo(-rnd(1, 14)),
            status: status,
        }).returning();
        insertedRepairs.push(r);
        await db_1.db.insert(schema_1.repairStatusHistory).values({ repairId: r.id, status: r.status, remarks: "Seeded", updatedBy: admin.id });
    }
    // orders + items + payments
    const orderStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"];
    const insertedOrders = [];
    for (let i = 0; i < 30; i++) {
        const c = pick(customers);
        const isWalkIn = i % 4 === 0;
        const numItems = rnd(1, 4);
        const chosen = [];
        for (let j = 0; j < numItems; j++)
            chosen.push(pick(insertedProducts));
        // unique
        const unique = Array.from(new Map(chosen.map((p) => [p.id, p])).values());
        let subtotal = 0;
        const itemsData = [];
        for (const p of unique) {
            const q = rnd(1, 3);
            const sub = Number(p.sellingPrice) * q;
            subtotal += sub;
            itemsData.push({ productId: p.id, quantity: q, unitPrice: p.sellingPrice, subtotal: String(sub) });
        }
        const discount = i % 5 === 0 ? 50 : 0;
        const total = Math.max(0, subtotal - discount);
        const status = pick(orderStatuses);
        const paymentStatus = status === "COMPLETED" ? "PAID" : (status === "CANCELLED" ? "FAILED" : "PENDING");
        const [o] = await db_1.db.insert(schema_1.orders).values({
            orderNumber: (0, gen_1.genRef)("ORD"),
            userId: c.id,
            customerName: c.fullName,
            transactionSource: isWalkIn ? "WALK_IN" : "ONLINE",
            totalAmount: String(total),
            discount: String(discount),
            voucherCode: discount ? "SAVE50" : null,
            deliveryMethod: isWalkIn ? "PICKUP" : (i % 2 === 0 ? "DELIVERY" : "PICKUP"),
            deliveryAddress: isWalkIn ? null : "123 Tech Drive, City, Philippines",
            paymentStatus: paymentStatus,
            orderStatus: status,
            createdAt: daysAgo(rnd(0, 60)),
        }).returning();
        insertedOrders.push(o);
        for (const it of itemsData) {
            await db_1.db.insert(schema_1.orderItems).values({ orderId: o.id, productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice, subtotal: it.subtotal });
        }
        // payment record
        const method = pick(PAYMENT_METHODS);
        const payStatus = paymentStatus === "PAID" ? "PAID" : "PENDING";
        const [pay] = await db_1.db.insert(schema_1.payments).values({
            paymentReference: (0, gen_1.genRef)("PAY"),
            userId: c.id,
            orderId: o.id,
            paymentMethod: method,
            paymentProvider: payStatus === "PAID" ? "PAYMONGO" : "SANDBOX",
            amount: String(total),
            paymentStatus: payStatus,
            paidAt: payStatus === "PAID" ? new Date() : null,
        }).returning();
        // invoice
        const [inv] = await db_1.db.insert(schema_1.invoices).values({
            invoiceNumber: (0, gen_1.genRef)("INV"),
            userId: c.id,
            orderId: o.id,
            totalAmount: String(total),
            amountPaid: String(payStatus === "PAID" ? total : 0),
            balance: String(payStatus === "PAID" ? 0 : total),
        }).returning();
        if (payStatus === "PAID") {
            await db_1.db.insert(schema_1.receipts).values({ receiptNumber: (0, gen_1.genRef)("RCT"), paymentId: pay.id, invoiceId: inv.id });
        }
        // decrement stock for completed
        if (status === "COMPLETED" || status === "PROCESSING" || status === "CONFIRMED") {
            for (const it of itemsData) {
                const [p] = await db_1.db.select().from(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.id, it.productId));
                if (p) {
                    const newStock = Math.max(0, p.stock - it.quantity);
                    await db_1.db.update(schema_1.products).set({ stock: newStock, sold: (p.sold || 0) + it.quantity, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.products.id, p.id));
                    await db_1.db.insert(schema_1.inventoryMovements).values({
                        productId: p.id,
                        movementType: "SALE",
                        quantity: it.quantity,
                        previousStock: p.stock,
                        newStock,
                        referenceType: "ORDER",
                        referenceId: o.id,
                        remarks: "Order sale",
                        createdBy: admin.id,
                    });
                }
            }
        }
    }
    // walk-in repairs already included as repairs with WALK_IN source
    // refunds (3)
    for (let i = 0; i < 3; i++) {
        const o = insertedOrders[i];
        const [pay] = await db_1.db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.orderId, o.id));
        if (pay) {
            await db_1.db.insert(schema_1.refunds).values({
                refundReference: (0, gen_1.genRef)("REF"),
                paymentId: pay.id,
                orderId: o.id,
                refundAmount: String(Math.floor(Number(o.totalAmount) * 0.5)),
                refundMethod: "ORIGINAL",
                refundReason: "Customer requested refund",
                refundStatus: pick(["REQUESTED", "APPROVED", "REFUNDED"]),
                processedBy: admin.id,
            });
        }
    }
    // notifications for customers
    for (const c of customers.slice(0, 5)) {
        await db_1.db.insert(schema_1.notifications).values({ userId: c.id, title: "Welcome to CP TechFix", message: "Thanks for joining. Start shopping for accessories and repair services.", isRead: false });
        await db_1.db.insert(schema_1.notifications).values({ userId: c.id, title: "Order Update", message: "Your recent order has been confirmed.", isRead: false });
    }
    console.log("Full seed complete.");
    console.log(`Customers: ${customers.length}, Products: ${insertedProducts.length}, Orders: ${insertedOrders.length}, Repairs: ${insertedRepairs.length}`);
    process.exit(0);
}
seed().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=seed_full.js.map