import { Request, Response } from "express";
import ratingService from "../services/ratingService";
import { sendSuccess, sendError } from "../utils/response";
import { CreateRatingDto } from "../dto/rating.dto";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { formatValidationErrors } from "../utils/validation";

class RatingController {
  async createRating(req: Request, res: Response) {
    const dto = plainToInstance(CreateRatingDto, req.body);
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

      const rating = await ratingService.createRating(parentId, dto);
      return sendSuccess(
        res,
        rating,
        "Rating created successfully",
        201
      );
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async getRatings(req: Request, res: Response) {
    try {
      const parentId = (req as any).user?.uid;
      if (!parentId) {
        return sendError(res, "User not authenticated", 401);
      }

      // Only allow parents to see their own ratings
      const ratings = await ratingService.getRatings(parentId);
      return sendSuccess(
        res,
        ratings,
        "Ratings retrieved successfully",
        200
      );
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async getRatingById(req: Request, res: Response) {
    try {
      const parentId = (req as any).user?.uid;
      if (!parentId) {
        return sendError(res, "User not authenticated", 401);
      }

      const { id } = req.params;
      const rating = await ratingService.getRatingById(id as string);

      // Ensure the rating belongs to the authenticated parent
      if (rating.parent_id !== parentId) {
        return sendError(res, "Unauthorized to access this rating", 403);
      }

      return sendSuccess(
        res,
        rating,
        "Rating retrieved successfully",
        200
      );
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async getRatingStats(req: Request, res: Response) {
    try {
      const stats = await ratingService.getRatingStats();
      return sendSuccess(
        res,
        stats,
        "Rating statistics retrieved successfully",
        200
      );
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}

export default new RatingController();

