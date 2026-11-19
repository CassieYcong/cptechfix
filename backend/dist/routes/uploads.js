import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticate, requireRole } from "../middlewares/auth";
const router = Router();
const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
        cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});
const fileFilter = (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/"))
        return cb(new Error("Only image files are allowed"));
    cb(null, true);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
router.post("/", authenticate, requireRole("ADMIN", "STAFF", "CUSTOMER"), (req, res) => {
    upload.single("file")(req, res, (err) => {
        if (err)
            return res.status(400).json({ message: err.message || "Upload failed" });
        if (!req.file)
            return res.status(400).json({ message: "No file" });
        res.json({ url: `/uploads/${req.file.filename}` });
    });
});
export default router;
//# sourceMappingURL=uploads.js.map