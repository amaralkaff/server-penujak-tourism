import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ error: "No token, authorization denied" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number;
      role: string;
    };
    (req as AuthRequest).userId = decoded.userId;
    (req as AuthRequest).userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token is not valid" });
  }
};

export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if ((req as AuthRequest).userRole !== "ADMIN") {
    res.status(403).json({ error: "Access denied. Admin only." });
    return;
  }
  next();
};
