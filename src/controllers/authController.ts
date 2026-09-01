import { Request, Response } from "express";
import authService from "../services/authService";
import { sendSuccess, sendError } from "../utils/response";
import { SignUpDto, SignInDto, ForgotPasswordDto, VerifyOtpDto, ResendOtpDto, ResetPasswordDto } from "../dto/auth.dto";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { formatValidationErrors } from "../utils/validation";

class AuthController {
  async signUp(req: Request, res: Response) {
    const dto = plainToInstance(SignUpDto, req.body);
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
      const { identifier, password, first_name, last_name } = dto;
      const user = await authService.signUp({
        identifier,
        password,
        first_name,
        last_name,
      });

      return sendSuccess(res, user, "Signup successful", 201);
    } catch (err: any) {
        console.log(err, err.message, err.stack, err.status);
      return sendError(res, err.message, 400);
    }
  }

    async signIn(req: Request, res: Response) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return sendError(res, "Authorization token missing", 401);
            }

            const token = authHeader.split(" ")[1];
            const user = await authService.signIn(token);

            return sendSuccess(res, { user }, "Login successful");
        } catch (error: any) {
            return sendError(res, error.message || "Login failed", 401);
        }
    }

  async forgotPassword(req: Request, res: Response) {
    const dto = plainToInstance(ForgotPasswordDto, req.body);
    const errors = await validate(dto);
    if (errors.length > 0) {
      return sendError(res, "Validation failed", 400, formatValidationErrors(errors));
    }

    try {
      const result = await authService.sendResetPasswordEmail(dto);
      return sendSuccess(res, result, "Reset Password link sent successfully", 200);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async verifyOtp(req: Request, res: Response) {
    const dto = plainToInstance(VerifyOtpDto, req.body);
    const errors = await validate(dto);
    if (errors.length > 0) {
      return sendError(res, "Validation failed", 400, formatValidationErrors(errors));
    }

    try {
      const result = await authService.verifyOtp(dto);
      return sendSuccess(res, result, "OTP verified successfully", 200);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async resendOtp(req: Request, res: Response) {
    const dto = plainToInstance(ResendOtpDto, req.body);
    const errors = await validate(dto);
    if (errors.length > 0) {
      return sendError(res, "Validation failed", 400, formatValidationErrors(errors));
    }

    try {
      const result = await authService.resendOtp(dto);
      return sendSuccess(res, result, "OTP resent successfully", 200);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async resetPassword(req: Request, res: Response) {
    const dto = plainToInstance(ResetPasswordDto, req.body);
    const errors = await validate(dto);
    if (errors.length > 0) {
      return sendError(res, "Validation failed", 400, formatValidationErrors(errors));
    }

    try {
      const result = await authService.resetPassword(dto);
      return sendSuccess(res, result, "Password reset successfully", 200);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }


  async revokeTokens(req: Request, res: Response) {
    try {
      const parentId = (req as any).user?.uid;
      if (!parentId) {
        return sendError(res, "User not authenticated", 401);
      }
      await authService.revokeTokens(parentId);
      return sendSuccess(res, null, "Tokens revoked successfully", 200);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  async deleteAccount(req: Request, res: Response) {
    try {
        const parentId = (req as any).user?.uid;
        if (!parentId) {
            return sendError(res, "User not authenticated", 401);
        }
        await authService.deleteAccount(parentId);
        return sendSuccess(res, null, "Account deleted successfully", 204);
    } catch (err: any) {
        return sendError(res, err.message, 400);
    }
  }

}

export default new AuthController();
