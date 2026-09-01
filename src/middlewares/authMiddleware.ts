import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";
import { firebaseService } from "../services/firebase.service";

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, "Authorization token missing", 401);
    }

    const token = authHeader.replace("Bearer ", "");

    if (!firebaseService.isAvailable) {
      return sendError(
        res,
        "Authentication service unavailable",
        503
      );
    }

    const user = await firebaseService.verifyIdToken(token);

    (req as any).user = user;
    next();

  } catch (err: any) {
    console.error("Auth middleware error:", err);
    return sendError(res, "Invalid or expired token", 401);
  }
};

