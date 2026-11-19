"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
// routes
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const products_1 = __importDefault(require("./routes/products"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const repairs_1 = __importDefault(require("./routes/repairs"));
const orders_1 = __importDefault(require("./routes/orders"));
const payments_1 = __importDefault(require("./routes/payments"));
const billing_1 = __importDefault(require("./routes/billing"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const receipts_1 = __importDefault(require("./routes/receipts"));
const cancellations_1 = __importDefault(require("./routes/cancellations"));
const refunds_1 = __importDefault(require("./routes/refunds"));
const reviews_1 = __importDefault(require("./routes/reviews"));
const reports_1 = __importDefault(require("./routes/reports"));
const walkins_1 = __importDefault(require("./routes/walkins"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const cart_1 = __importDefault(require("./routes/cart"));
const uploads_1 = __importDefault(require("./routes/uploads"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(express_1.default.json({ limit: "10mb", verify: (req, _res, buf) => { req.rawBody = buf.toString(); } }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", auth_1.default);
app.use("/api/users", users_1.default);
app.use("/api/products", products_1.default);
app.use("/api/inventory", inventory_1.default);
app.use("/api/repairs", repairs_1.default);
app.use("/api/orders", orders_1.default);
app.use("/api/payments", payments_1.default);
app.use("/api/billing", billing_1.default);
app.use("/api/invoices", invoices_1.default);
app.use("/api/receipts", receipts_1.default);
app.use("/api/cancellations", cancellations_1.default);
app.use("/api/refunds", refunds_1.default);
app.use("/api/reviews", reviews_1.default);
app.use("/api/reports", reports_1.default);
app.use("/api/walk-ins", walkins_1.default);
app.use("/api/notifications", notifications_1.default);
app.use("/api/cart", cart_1.default);
app.use("/api/uploads", uploads_1.default);
// Uploaded media is embedded by the frontend origin, so it must be readable cross-origin.
app.use("/uploads", (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
}, express_1.default.static(path_1.default.join(process.cwd(), "uploads")));
// Unknown API route.
app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));
// Central error handler so database/network failures return a JSON response
// instead of leaving the request hanging.
app.use((err, _req, res, _next) => {
    console.error("[api] error:", err?.message || err);
    if (res.headersSent)
        return;
    res.status(err?.status || 500).json({ message: err?.message || "Internal server error" });
});
exports.default = app;
//# sourceMappingURL=app.js.map