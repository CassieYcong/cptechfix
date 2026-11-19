import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const comparePassword = (p: string, h: string) => bcrypt.compare(p, h);

export interface JwtPayload {
  id: string;
  role: string;
  email: string;
}

export const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any });

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
