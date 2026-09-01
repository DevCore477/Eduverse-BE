import { Request, Response } from "express";
import { sendError, sendSuccess } from "../utils/response";
import { journeyService } from "../services/journeyService";

class JourneyController {
  async getSubjects(req: Request, res: Response) {
    try {
      const subjects = await journeyService.getAllSubjects();
      return sendSuccess(res, subjects, "Subjects retrieved successfully");
    } catch (err: any) {
      return sendError(res, err.message || "Failed to retrieve subjects", 400);
    }
  }


  async getPupilSubjects(req: Request, res: Response) {
    try {
      const pupilId = req.params.pupilId;
      if (!pupilId) return sendError(res, "Pupil id not found", 400);
      const subjects = await journeyService.getPupilAllSubjects(req.params.pupilId as string);

      return sendSuccess(res, subjects, "Subjects retrieved successfully");
    } catch (err: any) {
      return sendError(res, err.message || "Failed to retrieve subjects", 400);

    }
  }

  async getSubjectJourneyMap(req: Request, res: Response) {
    try {
      const { pupilId, subjectId } = req.params;

      if (!pupilId || !subjectId) {
        return sendError(res, "pupilId and subjectId are required", 400);
      }

      const result = await journeyService.getSubjectJourneyMap(pupilId as string, subjectId as string);
      return sendSuccess(res, result, "Journey map retrieved successfully");
    } catch (err: any) {
      return sendError(res, err.message || "Failed to retrieve journey map", 400);
    }
  }

  async getLessonCards(req: Request, res: Response) {
    try {
      const { pupilId, lessonId } = req.params;

      if (!pupilId || !lessonId) {
        return sendError(res, "pupilId and lessonId are required", 400);
      }

      const result = await journeyService.getLessonCards(pupilId as string, lessonId as string);
      return sendSuccess(res, result, "Lesson cards retrieved successfully");
    } catch (err: any) {
      return sendError(res, err.message || "Failed to retrieve lesson cards", 400);
    }
  }

  async completeStep(req: Request, res: Response) {
    try {
      const { pupilId, stepId } = req.params;

      if (!pupilId || !stepId) {
        return sendError(res, "pupilId and stepId are required", 400);
      }

      const result = await journeyService.completeStep(pupilId as string, stepId as string);
      return sendSuccess(res, result, "Step marked as completed");
    } catch (err: any) {
      return sendError(res, err.message || "Failed to complete step", 400);
    }
  }

  async getStepDetails(req: Request, res: Response) {
    try {
      const { stepId } = req.params;

      if (!stepId) {
        return sendError(res, "stepId is required", 400);
      }

      const result = await journeyService.getStepDetails(stepId as string);
      return sendSuccess(res, result, "Step details retrieved successfully");
    } catch (err: any) {
      return sendError(res, err.message || "Failed to retrieve step details", 400);
    }
  }


  async getPracticeQuestionProgress(req: Request, res: Response) {
    try {
      const { pupilId, questionId } = req.params;
      if (!pupilId || !questionId) {
        return sendError(res, "pupilId and questionId are required", 400);
      }
      const result = await journeyService.getPracticeQuestionProgress(pupilId as string, questionId as string);
      return sendSuccess(res, result, "Question progress retrieved successfully");

    } catch (err: any) {
      return sendError(res, err.message || "Failed to retrieve practice question progress", 400);
    }
  }


  async getFinalChallengeQuestionProgress(req: Request, res: Response) {
    try {
      const { pupilId, lessonId } = req.params;
      if (!pupilId || !lessonId) {
        return sendError(res, "pupilId and lessonId are required", 400);
      }
      const result = await journeyService.getFinalChallengeQuestionProgress(pupilId as string, lessonId as string);
      return sendSuccess(res, result, "Question progress retrieved successfully");

    } catch (err: any) {
      return sendError(res, err.message || "Failed to retrieve final challenge progress", 400);
    }
  }


  async getStepDetailsForPupil(req: Request, res: Response) {
    try {
      const { pupilId, stepId } = req.params;

      if (!pupilId || !stepId) {
        return sendError(res, "pupilId and stepId are required", 400);
      }

      const result = await journeyService.getStepDetailsForPupil(pupilId as string, stepId as string);
      return sendSuccess(res, result, "Step details for pupil retrieved successfully");
    } catch (err: any) {
      return sendError(
        res,
        err.message || "Failed to retrieve step details for pupil",
        400
      );
    }
  }

  async submitPracticeAttempt(req: Request, res: Response) {
    try {
      const { pupilId, questionId } = req.params;

      if (!pupilId || !questionId) {
        return sendError(res, "pupilId and questionId are required", 400);
      }

      const { is_correct, points_earned, response_data } = req.body || {};

      const result = await journeyService.submitPracticeAttempt(pupilId as string, questionId as string, {
        is_correct,
        points_earned,
        response_data,
      });

      return sendSuccess(res, result, "Practice attempt recorded successfully", 201);
    } catch (err: any) {
      return sendError(
        res,
        err.message || "Failed to record practice attempt",
        400
      );
    }
  }

  async submitFinalChallenge(req: Request, res: Response) {
    try {
      const { pupilId, lessonId } = req.params;

      if (!pupilId || !lessonId) {
        return sendError(res, "pupilId and lessonId are required", 400);
      }

      const { results, is_passed, score, max_score, extra_data } = req.body || {};

      if (!Array.isArray(results) || results.length === 0) {
        return sendError(res, "results (non-empty array) is required", 400);
      }

      const result = await journeyService.submitFinalChallengeResult(pupilId as string, lessonId as string, {
        results,
        is_passed,
        score,
        max_score,
        extra_data,
      });

      return sendSuccess(res, result, "Final challenge result recorded successfully", 201);
    } catch (err: any) {
      return sendError(
        res,
        err.message || "Failed to record final challenge result",
        400
      );
    }
  }

  async submitIntegrationAssessment(req: Request, res: Response) {
    try {
      const { pupilId, lessonId, questionId } = req.params;
      const { response_text, answer, response_data, type } = req.body || {};

      if (!pupilId || !lessonId || !questionId) {
        return sendError(res, "pupilId,questionId and lessonId are required", 400);
      }

      // Validate based on integration type
      if (type === 'writing' || response_text) {
        if (!response_text || typeof response_text !== "string") {
          return sendError(res, "response_text is required for writing assessment", 400);
        }
      } else if (type === 'ordering' || answer) {
        if (!answer) {
          return sendError(res, "answer is required for ordering assessment", 400);
        }
      } else {
        return sendError(res, "Either response_text (writing) or answer (ordering) is required", 400);
      }

      const result = await journeyService.submitIntegrationAssessment(pupilId as string, lessonId as string, questionId as string, {
        response_text,
        answer,
        response_data,
      });

      const message = result.question_type === 'writing_assessment'
        ? "Writing assessment submitted successfully"
        : result.is_correct
          ? "Ordering assessment completed correctly!"
          : "Ordering assessment submitted. Please review the correct order.";

      return sendSuccess(res, result, message, 201);
    } catch (err: any) {
      return sendError(res, err.message || "Failed to submit integration assessment", 400);
    }
  }

  async getIntegrationAssessment(req: Request, res: Response) {
    try {
      const { pupilId, lessonId } = req.params;

      if (!pupilId || !lessonId) {
        return sendError(res, "pupilId and lessonId are required", 400);
      }

      const response = await journeyService.getIntegrationLessonData(pupilId as string, lessonId as string);

      return sendSuccess(res, response, "Integration assessment retrieved successfully", 200);
    } catch (err: any) {
      return sendError(res, err.message || "Failed to get integration lesson", 400);
    }
  }

  async getPracticeCardStatus(req: Request, res: Response) {
    try {
      const { pupilId, lessonId } = req.params;

      if (!pupilId || !lessonId) {
        return sendError(res, "pupilId and lessonId are required", 400);
      }

      const result = await journeyService.getPracticeCardStatus(pupilId as string, lessonId as string);
      return sendSuccess(res, result, "Practice card status retrieved successfully");
    } catch (err: any) {
      return sendError(res, err.message || "Failed to retrieve practice card status", 400);
    }
  }

  async getFinalChallengeStatus(req: Request, res: Response) {
    try {
      const { pupilId, lessonId } = req.params;

      if (!pupilId || !lessonId) {
        return sendError(res, "pupilId and lessonId are required", 400);
      }

      const result = await journeyService.getFinalChallengeStatus(pupilId as string, lessonId as string);
      return sendSuccess(res, result, "Final challenge status retrieved successfully");
    } catch (err: any) {
      return sendError(res, err.message || "Failed to retrieve final challenge status", 400);
    }
  }

  async getSubjectProgress(req: Request, res: Response) {
    try {
      const { pupilId, subjectId } = req.params;

      if (!pupilId || !subjectId) {
        return sendError(res, "pupilId and subjectId are required", 400);
      }

      const result = await journeyService.getSubjectProgress(pupilId as string, subjectId as string);
      return sendSuccess(res, result, "Subject progress retrieved successfully");
    } catch (err: any) {
      return sendError(res, err.message || "Failed to retrieve subject progress", 400);
    }
  }

  /**
   * Submit a question answer with server-authoritative validation
   * Endpoint: POST /pupils/{pupilId}/questions/{questionId}/submit
   * Immediate feedback: correct/wrong, stars earned, attempts left, badge if earned
   */
  async submitQuestion(req: Request, res: Response) {
    try {
      const { pupilId, questionId } = req.params;

      if (!questionId || !pupilId) {
        return sendError(res, "questionId and pupilId are required", 400);
      }

      const { answer, response_data } = req.body;
      if (answer === undefined || answer === null) {
        return sendError(res, "answer is required", 400);
      }

      const result = await journeyService.submitQuestionAnswer(pupilId as string, questionId as string, {
        answer,
        response_data,
      });

      return sendSuccess(
        res,
        result,
        result.isCorrect ? "Answer correct!" : "Answer incorrect. Try again!",
        200
      );
    } catch (err: any) {
      return sendError(res, err.message || "Failed to submit question answer", 400);
    }
  }

  /**
   * Renew/reset attempts for practice or final challenge questions
   * Can reset a specific question or all questions in a lesson
   * Endpoint: POST /journeys/pupils/{pupilId}/lessons/{lessonId}/renew-attempts
   * Optional query params: ?questionId=xxx&type=practice|final
   */
  async renewAttempts(req: Request, res: Response) {
    try {
      const { pupilId, lessonId } = req.params;
      const { questionId, type } = req.query;

      if (!pupilId || !lessonId) {
        return sendError(res, "pupilId and lessonId are required", 400);
      }

      if (type && !["practice", "final"].includes(type as string)) {
        return sendError(res, "type must be either 'practice' or 'final'", 400);
      }

      const result = await journeyService.renewQuestionAttempts(
        pupilId as string,
        lessonId as string,
        questionId as string | undefined,
        type as "practice" | "final" | undefined
      );

      return sendSuccess(res, result, "Attempts renewed successfully", 200);
    } catch (err: any) {
      return sendError(res, err.message || "Failed to renew attempts", 400);
    }
  }

  /**
   * Get questions for a lesson grouped by difficulty
   */
  async getQuestionsByDifficulty(req: Request, res: Response) {
    try {
      const { lessonId } = req.params;
      const { type, difficulty } = req.query;

      if (!lessonId) {
        return sendError(res, "lessonId is required", 400);
      }

      if (type && !["practice", "final"].includes(type as string)) {
        return sendError(res, "type must be either 'practice' or 'final'", 400);
      }

      if (difficulty && !["easy", "medium", "hard"].includes(difficulty as string)) {
        return sendError(res, "difficulty must be 'easy', 'medium', or 'hard'", 400);
      }

      const result = await journeyService.getQuestionsByDifficulty(
        lessonId as string,
        type as "practice" | "final" | undefined,
        difficulty as "easy" | "medium" | "hard" | undefined
      );

      return sendSuccess(res, result, "Questions retrieved successfully");
    } catch (err: any) {
      return sendError(res, err.message || "Failed to retrieve questions", 400);
    }
  }

  /**
 * Get a single question by ID with its details and user's attempt history
 * Endpoint: GET /journeys/pupils/:pupilId/questions/:questionId
 */
  async getQuestionById(req: Request, res: Response) {
    try {
      const { pupilId, questionId } = req.params;
      const { includeAttempts } = req.query;

      if (!pupilId || !questionId) {
        return sendError(res, "pupilId and questionId are required", 400);
      }

      const result = await journeyService.getQuestionById(
        pupilId as string,
        questionId as string,
        includeAttempts !== 'false' // Default to true
      );

      return sendSuccess(
        res,
        result,
        "Question retrieved successfully",
        200
      );
    } catch (err: any) {
      return sendError(
        res,
        err.message || "Failed to retrieve question",
        err.message.includes("not found") ? 404 : 400
      );
    }
  }
}

export const journeyController = new JourneyController();

