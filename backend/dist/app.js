import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
// routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import productRoutes from "./routes/products";
import inventoryRoutes from "./routes/inventory";
import repairRoutes from "./routes/repairs";
import orderRoutes from "./routes/orders";
import paymentRoutes from "./routes/payments";
import billingRoutes from "./routes/billing";
import invoiceRoutes from "./routes/invoices";
import receiptRoutes from "./routes/receipts";
import cancellationRoutes from "./routes/cancellations";
import refundRoutes from "./routes/refunds";
import reviewRoutes from "./routes/reviews";
import reportRoutes from "./routes/reports";
import walkinRoutes from "./routes/walkins";
import notificationRoutes from "./routes/notifications";
import cartRoutes from "./routes/cart";
import uploadRoutes from "./routes/uploads";
const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(express.json({ limit: "10mb", verify: (req, _res, buf) => { req.rawBody = buf.toString(); } }));
app.use(express.urlencoded({ extended: true }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/repairs", repairRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/cancellations", cancellationRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/walk-ins", walkinRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/uploads", uploadRoutes);
// Uploaded media is embedded by the frontend origin, so it must be readable cross-origin.
app.use("/uploads", (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
}, express.static(path.join(process.cwd(), "uploads")));
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
export default app;
//# sourceMappingURL=app.js.map