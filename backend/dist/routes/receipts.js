"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.get("/:id", auth_1.authenticate, async (req, res) => {
    const [r] = await db_1.db.select().from(schema_1.receipts).where((0, drizzle_orm_1.eq)(schema_1.receipts.id, req.params.id));
    if (!r)
        return res.status(404).json({ message: "Not found" });
    res.json(r);
});
exports.default = router;
//# sourceMappingURL=receipts.js.map