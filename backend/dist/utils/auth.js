"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.signToken = exports.comparePassword = exports.hashPassword = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const hashPassword = (p) => bcryptjs_1.default.hash(p, 10);
exports.hashPassword = hashPassword;
const comparePassword = (p, h) => bcryptjs_1.default.compare(p, h);
exports.comparePassword = comparePassword;
const signToken = (payload) => jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") });
exports.signToken = signToken;
const verifyToken = (token) => jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
exports.verifyToken = verifyToken;
//# sourceMappingURL=auth.js.map