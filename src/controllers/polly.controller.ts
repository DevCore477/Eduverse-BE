import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { pollyService } from "../services/polly.service";

class PollyController {
  /**
   * Convert text to speech using AWS Polly
   * POST /api/tts
   */
  async synthesizeSpeech(req: Request, res: Response) {
    try {
      const { text, language } = req.body;

      if (!text || typeof text !== "string") {
        return sendError(res, "text is required", 400);
      }

      // Optional: restrict supported languages
      if (language && !["en", "ar", "fr"].includes(language)) {
        return sendError(res, "Unsupported language", 400);
      }

      const audioBase64 = await pollyService.synthesize(
        text,
        language ?? "en"
      );

      return sendSuccess(
        res,
        { audio: audioBase64 },
        "Speech synthesized successfully"
      );
    } catch (error: any) {
      console.error("PollyController error:", error);

      return sendError(
        res,
        error?.message ?? "Failed to synthesize speech",
        400
      );
    }
  }
}

export const pollyController = new PollyController();
