"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("./db");
async function run() {
    await db_1.db.execute((0, drizzle_orm_1.sql) `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image text`);
    console.log("users.profile_image is ready");
    process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=migrate-profile-image.js.map