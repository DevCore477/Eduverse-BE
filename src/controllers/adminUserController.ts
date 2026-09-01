import { Request, Response } from "express";
import adminUserService from "../services/adminUserService";
import { sendSuccess, sendError } from "../utils/response";
import { AdminUserListDto } from "../dto/admin-user-list.dto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { formatValidationErrors } from "../utils/validation";
import { AdminRequest } from "../middlewares/adminAuthMiddleware";

class AdminUserController {
  /**
   * GET /admin/users
   * Get list of registered users (parents) for admin
   * Requires admin authentication
   */
  async getUserList(req: Request, res: Response) {
    try {
      const admin = (req as AdminRequest).admin;
      if (!admin) {
        return sendError(res, "Your session has expired. Please log in again.", 401);
      }

      // Convert query parameters to DTO
      // Handle number conversion manually (query params come as strings)
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      // Validate page and limit
      if (isNaN(page) || page < 1) {
        return sendError(res, "Page must be a positive integer", 400);
      }
      if (isNaN(limit) || limit < 1) {
        return sendError(res, "Limit must be a positive integer", 400);
      }

      const dto = plainToInstance(AdminUserListDto, {
        ...req.query,
        page,
        limit,
      });
      const errors = await validate(dto);

      if (errors.length > 0) {
        return sendError(
          res,
          "Validation failed",
          400,
          formatValidationErrors(errors)
        );
      }

      // Log admin access
      console.log(`[ADMIN USER LIST] Admin ${admin.email} accessed user list with filters:`, {
        search: dto.search,
        status: dto.status,
        page: dto.page,
        limit: dto.limit,
      });

      const result = await adminUserService.getUserList(dto);

      // Handle empty result
      if (result.users.length === 0) {
        return sendSuccess(
          res,
          result,
          "No users found matching your search criteria."
        );
      }

      return sendSuccess(res, result, "Users retrieved successfully");
    } catch (err: any) {
      console.error("[ADMIN USER LIST] Error:", err.message);
      return sendError(
        res,
        "Unable to load users at the moment. Please try again later.",
        500
      );
    }
  }

  /**
   * GET /admin/users/analytics
   * Get analytics for users and subscriptions
   * Requires admin authentication
   * Query params: dateFilter (optional) - "all", "last_30_days", "last_7_days", "today"
   */
  async getAnalytics(req: Request, res: Response) {
    try {
      const admin = (req as AdminRequest).admin;
      if (!admin) {
        return sendError(res, "Your session has expired. Please log in again.", 401);
      }

      // Get and validate date filter
      const dateFilter = (req.query.dateFilter as string) || "all";
      const validFilters = ["all", "last_30_days", "last_7_days", "today"];
      
      if (!validFilters.includes(dateFilter)) {
        return sendError(
          res,
          `Invalid dateFilter. Must be one of: ${validFilters.join(", ")}`,
          400
        );
      }

      const analytics = await adminUserService.getAnalytics(
        dateFilter as "all" | "last_30_days" | "last_7_days" | "today"
      );

      return sendSuccess(res, analytics, "Analytics retrieved successfully");
    } catch (err: any) {
      console.error("[ADMIN ANALYTICS] Error:", err.message);
      return sendError(
        res,
        "Unable to load analytics at the moment. Please try again later.",
        500
      );
    }
  }
}

export default new AdminUserController();
