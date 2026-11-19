import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
export const hashPassword = (p) => bcrypt.hash(p, 10);
export const comparePassword = (p, h) => bcrypt.compare(p, h);
export const signToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") });
export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);
//# sourceMappingURL=auth.js.map