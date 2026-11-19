"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const uploadDir = path_1.default.join(process.cwd(), "uploads");
fs_1.default.mkdirSync(uploadDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase() || ".jpg";
        cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});
const fileFilter = (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/"))
        return cb(new Error("Only image files are allowed"));
    cb(null, true);
};
const upload = (0, multer_1.default)({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
router.post("/", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN", "STAFF", "CUSTOMER"), (req, res) => {
    upload.single("file")(req, res, (err) => {
        if (err)
            return res.status(400).json({ message: err.message || "Upload failed" });
        if (!req.file)
            return res.status(400).json({ message: "No file" });
        res.json({ url: `/uploads/${req.file.filename}` });
    });
});
exports.default = router;
//# sourceMappingURL=uploads.js.map