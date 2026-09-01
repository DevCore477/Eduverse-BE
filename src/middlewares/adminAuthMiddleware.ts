import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";
import adminAuthService from "../services/adminAuthService";

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    is_active: boolean;
  };
}

/**
 * Middleware to protect admin routes
 * Validates JWT token and attaches admin info to request
 */
export const adminAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, "No token provided", 401);
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return sendError(res, "No token provided", 401);
    }

    const admin = await adminAuthService.verifyToken(token);
    (req as AdminRequest).admin = admin;

    next();
  } catch (err: any) {
    console.error("[ADMIN AUTH MIDDLEWARE] Error:", err.message);
    return sendError(res, err.message || "Authentication failed", 401);
  }
};

/**
 * Middleware to check for super admin role
 * Must be used after adminAuthMiddleware
 */
export const superAdminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const admin = (req as AdminRequest).admin;

  if (!admin) {
    return sendError(res, "Authentication required", 401);
  }

  if (admin.role !== "super_admin") {
    return sendError(res, "Super admin privileges required", 403);
  }

  next();
};
