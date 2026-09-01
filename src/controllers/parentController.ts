import { Request, Response } from "express";
import parentService from "../services/parentService";
import { sendSuccess, sendError } from "../utils/response";
import { UpdateParentDto, ChangePasswordDto } from "../dto/parent.dto";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { formatValidationErrors } from "../utils/validation";

class ParentController {
  async getProfile(req: Request, res: Response) {
    try {
        const parentId = (req as any).user?.uid;

      if (!parentId) {
        return sendError(res, "User not authenticated", 401);
      }

      const profile = await parentService.getParentProfile(parentId);
      return sendSuccess(res, profile, "Profile retrieved successfully", 200);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async updateProfile(req: Request, res: Response) {
    const dto = plainToInstance(UpdateParentDto, req.body);
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
      const parentId = (req as any).user?.uid;
      if (!parentId) {
        return sendError(res, "User not authenticated", 401);
      }

      // Ensure password is never updated
      // if ((req.body as any).password !== undefined) {
      //   return sendError(
      //     res,
      //     "Password cannot be updated",
      //     400
      //   );
      // }

      const updated = await parentService.updateParentProfile(parentId, dto);
      return sendSuccess(
        res,
        updated,
        "Profile updated successfully",
        200
      );
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async getDashboard(req: Request, res: Response) {
    try {
      const parentId = (req as any).user?.uid;
      if (!parentId) {
        return sendError(res, "User not authenticated", 401);
      }

      const stats = await parentService.getDashboardStats(parentId);
      return sendSuccess(res, stats, "Parent dashboard stats retrieved", 200);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async changePassword(req: Request, res: Response) {
    const dto = plainToInstance(ChangePasswordDto, req.body);
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
      const parentId = (req as any).user?.uid;
      if (!parentId) {
        return sendError(res, "User not authenticated", 401);
      }

      await parentService.changePassword(
        parentId,
        dto.current_password,
        dto.new_password,
        dto.confirm_new_password
      );

      return sendSuccess(
        res,
        null,
        "Password changed successfully",
        200
      );
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}

export default new ParentController();

