import { Request, Response } from "express";
import { sendError, sendSuccess } from "../utils/response";
import { academicService } from "../services/academicService";
import { validate } from "class-validator";
import {plainToClass, plainToInstance} from "class-transformer";
import { CreateAcademicDto, UpdateAcademicDto } from "../dto/academic.dto";
import { formatValidationErrors } from "../utils/validation";

class AcademicController {
    async getAcademicYears(req: Request, res: Response) {
        try {
            const academicYears = await academicService.getAllAcademicYears();
            return sendSuccess(res, academicYears, "Academic Years retrieved successfully");
        } catch (err: any) {
            return sendError(res, err.message || "Failed to retrieve Academic Years", 400);
        }
    }

    async getAcademicYearById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const academicYear = await academicService.getAcademicYearById(id as string);
            return sendSuccess(res, academicYear, "Academic Year retrieved successfully");
        } catch (err: any) {
            return sendError(res, err.message || "Failed to retrieve Academic Year", 400);
        }
    }

    async createAcademicYear(req: Request, res: Response) {
        try {
            const createAcademicDto = plainToInstance(CreateAcademicDto, req.body);
            const errors = await validate(createAcademicDto);

            if (errors.length > 0) {
                const formattedErrors = formatValidationErrors(errors);
                return sendError(res, "Validation failed", 400, formattedErrors);
            }

            const academicYear = await academicService.createAcademicYear(createAcademicDto);
            return sendSuccess(res, academicYear, "Academic Year created successfully", 201);
        } catch (err: any) {
            return sendError(res, err.message || "Failed to create Academic Year", 400);
        }
    }

    async updateAcademicYear(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updateAcademicDto = plainToInstance(UpdateAcademicDto, req.body);
            const errors = await validate(updateAcademicDto);

            if (errors.length > 0) {
                const formattedErrors = formatValidationErrors(errors);
                return sendError(res, "Validation failed", 400, formattedErrors);
            }

            const academicYear = await academicService.updateAcademicYear(id as string, updateAcademicDto);
            return sendSuccess(res, academicYear, "Academic Year updated successfully");
        } catch (err: any) {
            return sendError(res, err.message || "Failed to update Academic Year", 400);
        }
    }

    async deleteAcademicYear(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const academicYear = await academicService.deleteAcademicYear(id as string);
            return sendSuccess(res, academicYear, "Academic Year deleted successfully");
        } catch (err: any) {
            return sendError(res, err.message || "Failed to delete Academic Year", 400);
        }
    }
}


export const academicController = new AcademicController();
