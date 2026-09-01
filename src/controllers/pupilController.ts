import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { CreatePupilDto, UpdatePupilDto, PupilResponseDto } from "../dto/pupil.dto";

import { sendSuccess, sendError } from "../utils/response";
import { formatValidationErrors } from "../utils/validation";
import { pupilService } from "../services/pupilService";

class PupilController {

  async create(req: Request, res: Response) {
    const dto = plainToInstance(CreatePupilDto, req.body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      return sendError(res, "Validation failed", 400, formatValidationErrors(errors));
    }

    try {
      const created = await pupilService.createPupil(dto);

      const response = plainToInstance(PupilResponseDto, created, {
        excludeExtraneousValues: true,
      });

      return sendSuccess(res, response, "Pupil created successfully", 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;

    const dto = plainToInstance(UpdatePupilDto, req.body);
    const errors = await validate(dto);

    if (errors.length > 0) {
      return sendError(res, "Validation failed", 400, formatValidationErrors(errors));
    }

    try {
      const updated = await pupilService.updatePupil(id as string, dto);

      const response = plainToInstance(PupilResponseDto, updated);

      return sendSuccess(res, response, "Pupil updated successfully", 200);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const parentId = req.query.parent_id as string | undefined;

      const pupils = await pupilService.getPupils(parentId);
      const response = plainToInstance(PupilResponseDto, pupils);

      return sendSuccess(res, response, "Pupils retrieved successfully", 200);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async getOne(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const pupil = await pupilService.getPupilById(id as string);

      const response = plainToInstance(PupilResponseDto, pupil);

      return sendSuccess(res, response, "Pupil retrieved successfully", 200);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async getPupilsByPin(req: Request, res: Response) {
    try {
      const { parent_id, pin } = req.body;

      if (!parent_id || !pin) {
        return sendError(res, "parent_id and pin are required", 400);
      }

      const pupils = await pupilService.getPupilsByParentPin(parent_id, pin);
      const response = plainToInstance(PupilResponseDto, pupils);


      return sendSuccess(res, response, "Pupils retrieved successfully", 200);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async getDashboard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, "Pupil id is required", 400);
      }

      const stats = await pupilService.getDashboardStats(id as string);
      return sendSuccess(res, stats, "Pupil dashboard stats retrieved", 200);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  /**
  * Test weekly performance notifications
  * POST /api/test/notifications/weekly-performance
  */
  async testWeeklyPerformance(req: Request, res: Response) {
    try {
      console.log('🧪 Testing weekly performance notifications...');
      const firebaseUser = (req as any).user;
      const userId = firebaseUser.uid

      // Optional: Override the day check for testing
      const forceRun = req.query.force === 'true';

      if (forceRun) {
        // Temporarily override the day check by mocking
        const originalGetDay = Date.prototype.getDay;
        Date.prototype.getDay = () => 1; // Force Monday

        const result = await pupilService.checkAndNotifyWeeklyPerformance(userId as string);

        // Restore original method
        Date.prototype.getDay = originalGetDay;

        return res.status(200).json({
          success: true,
          message: 'Weekly performance test completed',
          data: result,
          note: 'Forced Monday mode - notifications sent regardless of actual day'
        });
      }

      const result = await pupilService.checkAndNotifyWeeklyPerformance(userId as string);

      return res.status(200).json({
        success: true,
        message: 'Weekly performance test completed',
        data: result
      });

    } catch (error) {
      console.error('❌ Weekly performance test failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Weekly performance test failed',
        error: (error as Error).message
      });
    }
  }

  /**
   * Test stalled lessons notifications (30-minute reminder)
   * POST /api/test/notifications/stalled-lessons
   */
  async testStalledLessons(req: Request, res: Response) {
    try {
      console.log('🧪 Testing stalled lessons notifications...');
      const firebaseUser = (req as any).user;
      const userId = firebaseUser.uid

      const result = await pupilService.checkAndNotifyStalledLessons(userId);

      return res.status(200).json({
        success: true,
        message: 'Stalled lessons test completed',
        data: result
      });

    } catch (error) {
      console.error('❌ Stalled lessons test failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Stalled lessons test failed',
        error: (error as Error).message
      });
    }
  }
}

export const pupilController = new PupilController();
