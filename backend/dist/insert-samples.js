"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("./db");
const schema_1 = require("./schema");
const drizzle_orm_1 = require("drizzle-orm");
const samples = [
    { ref: "RT-001", customer: "Mhegz Albarico", device: "Laptop", status: "IN_PROGRESS", tech: "John Reyes", cost: 1500 },
    { ref: "RT-002", customer: "Argel Padilla", device: "Desktop", status: "IN_PROGRESS", tech: "Norman Lim", cost: 1500 },
    { ref: "RT-003", customer: "Casandra Ycong", device: "Desktop", status: "PENDING", tech: "John Reyes", cost: 1500 },
    { ref: "RT-004", customer: "Harvey Baja", device: "Laptop", status: "APPROVED", tech: "Luis Santos", cost: 1500 },
    { ref: "RT-005", customer: "Binoy binay", device: "Desktop", status: "COMPLETED", tech: "Ana Cruz", cost: 1500 },
    { ref: "RT-006", customer: "Juan dela cruz", device: "Laptop", status: "COMPLETED", tech: "John Reyes", cost: 1500 },
    { ref: "RT-007", customer: "jusmeyo marimar", device: "Laptop", status: "COMPLETED", tech: "John Reyes", cost: 1500 },
];
async function run() {
    for (const s of samples) {
        const existing = await db_1.db.select().from(schema_1.repairs).where((0, drizzle_orm_1.eq)(schema_1.repairs.referenceNumber, s.ref));
        if (existing.length) {
            console.log("exists", s.ref);
            continue;
        }
        await db_1.db.insert(schema_1.repairs).values({
            referenceNumber: s.ref,
            transactionSource: "ONLINE",
            customerName: s.customer,
            deviceType: s.device,
            problemDescription: "Sample repair request",
            repairCost: String(s.cost),
            amountPaid: "0",
            remainingBalance: String(s.cost),
            status: s.status,
            technician: s.tech,
        });
        console.log("inserted", s.ref);
    }
    process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=insert-samples.js.map