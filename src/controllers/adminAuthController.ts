import { Request, Response } from "express";
import adminAuthService from "../services/adminAuthService";
import { sendSuccess, sendError } from "../utils/response";
import {
  AdminLoginDto,
  AdminForgotPasswordDto,
  AdminResetPasswordDto,
  AdminCreateDto,
} from "../dto/admin-auth.dto";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { formatValidationErrors } from "../utils/validation";
import { AdminRequest } from "../middlewares/adminAuthMiddleware";

class AdminAuthController {
  /**
   * POST /admin/auth/login
   * Admin login with email and password
   */
  async login(req: Request, res: Response) {
    const dto = plainToInstance(AdminLoginDto, req.body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      return sendError(
        res,
        "Validation failed",
        400,
        formatValidationErrors(errors)
      );
    }

    try {
      const result = await adminAuthService.login(dto);
      return sendSuccess(res, result, "Login successful");
    } catch (err: any) {
      console.error("[ADMIN LOGIN] Error:", err.message);
      return sendError(res, err.message, 401);
    }
  }

  /**
   * POST /admin/auth/forgot-password
   * Request password reset email
   */
  async forgotPassword(req: Request, res: Response) {
    const dto = plainToInstance(AdminForgotPasswordDto, req.body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      return sendError(
        res,
        "Validation failed",
        400,
        formatValidationErrors(errors)
      );
    }

    try {
      const result = await adminAuthService.forgotPassword(dto);
      return sendSuccess(res, result, "Password reset email sent");
    } catch (err: any) {
      console.error("[ADMIN FORGOT PASSWORD] Error:", err.message);
      return sendError(res, err.message, 400);
    }
  }

  /**
   * POST /admin/auth/reset-password
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response) {
    const dto = plainToInstance(AdminResetPasswordDto, req.body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      return sendError(
        res,
        "Validation failed",
        400,
        formatValidationErrors(errors)
      );
    }

    try {
      const result = await adminAuthService.resetPassword(dto);
      return sendSuccess(res, result, "Password reset successful");
    } catch (err: any) {
      console.error("[ADMIN RESET PASSWORD] Error:", err.message);
      return sendError(res, err.message, 400);
    }
  }

  /**
   * POST /admin/auth/logout
   * Logout admin (invalidate session)
   */
  async logout(req: Request, res: Response) {
    try {
      const admin = (req as AdminRequest).admin;
      if (!admin) {
        return sendError(res, "Not authenticated", 401);
      }

      const result = await adminAuthService.logout(admin.id);
      return sendSuccess(res, result, "Logged out successfully");
    } catch (err: any) {
      console.error("[ADMIN LOGOUT] Error:", err.message);
      return sendError(res, err.message, 400);
    }
  }

  /**
   * GET /admin/auth/me
   * Get current admin profile with refreshed token
   */
  async getAdminProfile(req: Request, res: Response) {
    try {
      const admin = (req as AdminRequest).admin;
      if (!admin) {
        return sendError(res, "Not authenticated", 401);
      }

      const result = await adminAuthService.getAdminProfile(admin.id);
      return sendSuccess(res, result, "Profile retrieved successfully");
    } catch (err: any) {
      console.error("[ADMIN PROFILE] Error:", err.message);
      return sendError(res, err.message, 400);
    }
  }

  /**
   * POST /admin/auth/create
   * Create a new admin (super admin only or initial setup)
   */
  async createAdmin(req: Request, res: Response) {
    const dto = plainToInstance(AdminCreateDto, req.body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      return sendError(
        res,
        "Validation failed",
        400,
        formatValidationErrors(errors)
      );
    }

    try {
      const result = await adminAuthService.createAdmin(dto);
      return sendSuccess(res, result, "Admin created successfully", 201);
    } catch (err: any) {
      console.error("[ADMIN CREATE] Error:", err.message);
      return sendError(res, err.message, 400);
    }
  }

  /**
   * PUT /admin/auth/profile
   * Update current admin's profile
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const admin = (req as AdminRequest).admin;
      if (!admin) {
        return sendError(res, "Your session has expired. Please log in again.", 401);
      }

      const { first_name, last_name, email, current_password, new_password } = req.body;

      const result = await adminAuthService.updateProfile({
        adminId: admin.id,
        firstName: first_name,
        lastName: last_name,
        email,
        currentPassword: current_password,
        newPassword: new_password,
      });

      return sendSuccess(res, result, "Profile updated successfully");
    } catch (err: any) {
      console.error("[ADMIN UPDATE PROFILE] Error:", err.message);
      return sendError(res, err.message, 400);
    }
  }
}

export default new AdminAuthController();
