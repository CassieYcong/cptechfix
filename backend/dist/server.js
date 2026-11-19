import "dotenv/config";
import app from "./app";
// A transient database/network failure (e.g. Neon DNS or idle-connection reset)
// must not take the whole API down. Log it and keep serving.
process.on("unhandledRejection", (reason) => {
    console.error("[server] unhandled rejection:", reason instanceof Error ? reason.message : reason);
});
process.on("uncaughtException", (err) => {
    console.error("[server] uncaught exception:", err.message);
});
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`CP TechFix backend running on port ${port}`));
//# sourceMappingURL=server.js.map