import { verifyToken } from "../utils/auth";
export const authenticate = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        req.user = verifyToken(header.slice(7));
        next();
    }
    catch {
        return res.status(401).json({ message: "Invalid token" });
    }
};
export const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
};
//# sourceMappingURL=auth.js.map