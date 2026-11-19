import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "./db";
async function run() {
    await db.execute(sql `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image text`);
    console.log("users.profile_image is ready");
    process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=migrate-profile-image.js.map