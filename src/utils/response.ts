import { Response } from "express";
import { SuccessResponse, ErrorResponse } from "../types/response";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): Response<SuccessResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

export const sendError = (
  res: Response,
  error: string,
  statusCode = 500,
  details?: unknown
): Response<ErrorResponse> => {
  return res.status(statusCode).json({
    success: false,
    error,
    details,
  });
};
