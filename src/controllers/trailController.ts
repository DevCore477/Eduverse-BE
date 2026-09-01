import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { trialService } from "../services/trailService";

class TrialController {
  /**
   * Start a free trial for a parent
   * POST /api/trials/start
   */
  async startFreeTrial(req: Request, res: Response) {
    try {
      const parentId = (req as any).user?.uid;

      if (!parentId) {
        return sendError(res, "User not authenticated", 401);
      }

      const result = await trialService.startFreeTrial(parentId);

      return sendSuccess(res, result, "Free trial started successfully");
    } catch (error: any) {
      return sendError(
        res,
        error?.message ?? "Failed to start free trial",
        400
      );
    }
  }

  /**
   * Check trial status for the authenticated parent
   * GET /api/trials/status
   */
  async checkTrialStatus(req: Request, res: Response) {
    try {
      const parentId = (req as any).user?.uid;

      if (!parentId) {
        return sendError(res, "User not authenticated", 401);
      }

      const result = await trialService.checkTrialStatus(parentId);

      return sendSuccess(res, result, "Trial status fetched successfully");
    } catch (error: any) {
      return sendError(
        res,
        error?.message ?? "Failed to fetch trial status",
        400
      );
    }
  }

  /**
   * Validate if parent can add a pupil during trial
   * GET /api/trials/can-add-pupil
   */
  async canAddPupil(req: Request, res: Response) {
    try {
      const parentId = (req as any).user?.uid;

      if (!parentId) {
        return sendError(res, "User not authenticated", 401);
      }

      const result = await trialService.validateAddPupil(parentId);

      return sendSuccess(res, result, "Validation successful");
    } catch (error: any) {
      return sendError(
        res,
        error?.message ?? "Cannot add pupil during trial",
        400
      );
    }
  }

  /**
   * Convert trial to paid subscription
   * POST /api/trials/convert
   */
  async convertTrialToPaid(req: Request, res: Response) {
    try {
      const parentId = (req as any).user?.uid;
      const { plan_id } = req.body;

      if (!parentId) {
        return sendError(res, "User not authenticated", 401);
      }

      if (!plan_id) {
        return sendError(res, "plan_id is required", 400);
      }

      const result = await trialService.convertTrialToPaid(parentId, plan_id);

      return sendSuccess(res, result, "Trial converted to paid subscription successfully");
    } catch (error: any) {
      return sendError(
        res,
        error?.message ?? "Failed to convert trial",
        400
      );
    }
  }
}

export const trialController = new TrialController();