import prisma from "../config/prisma";
import {
  calculateStars,
  calculatePercentage,
  isPassed,
  checkAndAwardMilestoneBadge,
  isValidVideoUrl,
} from "./journeyServiceHelpers";
import NotificationService, { NotificationPayload } from "./notification.service";
type StepType = "lesson_intro" | "lesson_video" | "practice_questions" | "final_journey";

interface SubjectStructureNode {
  id: string;
  subject_id: string;
  parent_id: string | null;
  node_type: "root" | "level" | "unit" | "lesson";
  title: string;
  order_index: number;
  payload?: Record<string, any> | null;
}

interface LessonStep {
  id: string;
  node_id: string;
  step_type: StepType;
  order_index: number;
  lesson_step_content: any[]
}

interface UserLessonStepStatus {
  id: string;
  user_id: string;
  step_id: string;
  is_unlocked: boolean;
  is_completed: boolean;
}

const MIN_INTEGRATION_CHARS_DEFAULT = 50;

class JourneyService {
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Server-authoritative question answer submission
   * Handles both practice and final challenge questions with unified flow
   * Returns immediate feedback: correct/wrong, stars, attempts left, badge if earned
   */
  async submitQuestionAnswer(
    pupilId: string,
    questionId: string,
    payload: {
      answer: string | number | boolean | Record<string, any> | Record<string, any>[];
      response_data?: Record<string, any>;
    }
  ) {
    await this.ensurePupilExists(pupilId);
    const maxAttemptsAllowed = 3; // Max 3 attempts per question

    // Determine if this is a practice or final challenge question
    const practiceQuestion = await prisma.lesson_practice_questions.findUnique({
      where: { id: questionId },
      select: { id: true, node_id: true, points: true, question_json: true },
    });

    let isPracticeQuestion = false;
    let lessonNodeId: string | null = null;
    let questionData: any = null;
    let finalQuestion: any = null;
    if (practiceQuestion) {
      isPracticeQuestion = true;
      lessonNodeId = practiceQuestion.node_id;
      questionData = practiceQuestion;
    } else {
      // Try to find as final challenge question
      finalQuestion = await prisma.lesson_final_challenges.findUnique({
        where: { id: questionId },
        select: { id: true, node_id: true, points: true, challenge_json: true },
      });

      if (!finalQuestion) {
        throw new Error("Question not found");
      }

      lessonNodeId = finalQuestion.node_id;
      questionData = finalQuestion;
    }

    // Get previous attempts for this question
    const prevAttempts = await prisma.user_question_attempts.findMany({
      where: {
        user_id: pupilId,
        ...(isPracticeQuestion
          ? { practice_question_id: questionId }
          : { final_challenge_id: questionId }),
      },
      select: { attempt_number: true, is_correct: true },
      orderBy: { attempt_number: "desc" },
    });

    const currentAttempt = (prevAttempts?.length || 0) + 1;
    const attemptsLeft = Math.max(0, maxAttemptsAllowed - currentAttempt);

    // Check if max attempts exceeded
    if (currentAttempt > maxAttemptsAllowed) {
      throw new Error(
        `Maximum attempts (${maxAttemptsAllowed}) exceeded for this question`
      );
    }

    // Parse the question JSON to get the correct answer
    const questionJSON = isPracticeQuestion
      ? practiceQuestion?.question_json
      : finalQuestion?.challenge_json;

    if (!questionJSON) {
      throw new Error("Question data not found");
    }

    let correctAnswer: string | number | boolean | null;
    // Server-side answer validation
    try {
      if (typeof questionJSON === "string") {
        const parsed = JSON.parse(questionJSON);
        correctAnswer = parsed.correct_answer || parsed.answer;
      } else {
        correctAnswer = questionJSON.correct_answer || questionJSON.answer;
      }
    } catch (parseErr) {
      // If JSON parsing fails, treat answer as incorrect
      correctAnswer = null;
    }
    console.log("Correct Answer:", correctAnswer);

    // Helper function to compare answers of any type
    const compareAnswers = (
      userAnswer: string | number | boolean | Record<string, any> | Record<string, any>[],
      correctAnswer: string | number | boolean | Record<string, any> | Record<string, any>[]
    ): boolean => {
      // Handle primitive types
      if (typeof userAnswer !== 'object' && typeof correctAnswer !== 'object') {
        return String(userAnswer).toLowerCase() === String(correctAnswer).toLowerCase();
      }

      // Handle arrays
      if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
        if (userAnswer.length !== correctAnswer.length) return false;

        // Compare each element
        return userAnswer.every((item, index) => {
          if (typeof item === 'object' || typeof correctAnswer[index] === 'object') {
            return JSON.stringify(item) === JSON.stringify(correctAnswer[index]);
          }
          return String(item).toLowerCase() === String(correctAnswer[index]).toLowerCase();
        });
      }

      // Handle objects
      if (typeof userAnswer === 'object' && typeof correctAnswer === 'object' &&
        !Array.isArray(userAnswer) && !Array.isArray(correctAnswer)) {
        return JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
      }

      // Mixed types or other edge cases
      return false;
    };

    // Compare answer with proper type handling
    const isCorrect = correctAnswer !== null && compareAnswers(payload.answer, correctAnswer);

    // Calculate stars ONLY if answer is correct
    // Stars based on which attempt got it right (3 for 1st, 2 for 2nd, 1 for 3rd, 0 for 4+)
    const stars = isCorrect ? calculateStars(currentAttempt) : 0;

    // Calculate points earned
    const pointsEarned = isCorrect ? (questionData?.points || 0) : 0;

    // INSERT attempt record (use insert, not upsert, to avoid duplicates)
    const insertData: any = {
      user_id: pupilId,
      attempt_number: currentAttempt,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      response_data: {
        answer: payload.answer,
        ...payload.response_data,
      },
      question_type: isPracticeQuestion ? "practice" : "final",
    };

    if (isPracticeQuestion) {
      insertData.practice_question_id = questionId;
    } else {
      insertData.final_challenge_id = questionId;
    }

    await prisma.user_question_attempts.create({
      data: insertData,
    });

    // Update node-level progress
    let nodeStatusResult = null;
    if (lessonNodeId) {
      if (isPracticeQuestion) {
        // ===== PRACTICE QUESTIONS: Update practice section of progress_data =====
        const allPracticeQuestions = await prisma.lesson_practice_questions.findMany({
          where: { node_id: lessonNodeId },
          select: { id: true, points: true },
        });

        if (allPracticeQuestions) {
          const questionIds = allPracticeQuestions.map((q: { id: string }) => q.id);
          let totalQuestions = questionIds.length;
          let correctlyAnswered = 0;
          let totalScore = 0;
          let maxStars: 0 | 1 | 2 | 3 = 0;

          let perQuestion: Record<
            string,
            {
              latest_attempt_number: number;
              is_correct: boolean | null;
              points_earned: number | null;
              stars: 0 | 1 | 2 | 3;
              first_correct_attempt?: number | null;
            }
          > = {};

          if (totalQuestions > 0) {
            // Fetch all attempts for all questions in this lesson
            const attempts = await prisma.user_question_attempts.findMany({
              where: { user_id: pupilId, practice_question_id: { in: questionIds } },
              select: {
                practice_question_id: true,
                attempt_number: true,
                is_correct: true,
                points_earned: true,
              },
              orderBy: { attempt_number: "asc" },
            });

            if (attempts) {
              const latestByQuestion = new Map<
                string,
                {
                  latest_attempt_number: number;
                  is_correct: boolean | null;
                  points_earned: number | null;
                }
              >();

              // Find FIRST correct attempt for each question (for star calculation)
              const firstCorrectAttempt = new Map<string, number>();

              (attempts || []).forEach((a: { practice_question_id: string; attempt_number: number; is_correct: boolean | null; points_earned: number | null }) => {
                const qId = a.practice_question_id;

                // Track latest attempt
                latestByQuestion.set(qId, {
                  latest_attempt_number: a.attempt_number,
                  is_correct: a.is_correct,
                  points_earned: a.points_earned,
                });

                // Track first correct attempt for star calculation
                if (a.is_correct && !firstCorrectAttempt.has(qId)) {
                  firstCorrectAttempt.set(qId, a.attempt_number);
                }
              });

              latestByQuestion.forEach((val, qId) => {
                // Calculate stars based on FIRST correct attempt, not latest
                const firstCorrectAttemptNum = firstCorrectAttempt.get(qId);
                const qStars = (val.is_correct && firstCorrectAttemptNum)
                  ? calculateStars(firstCorrectAttemptNum)
                  : 0;

                perQuestion[qId] = {
                  ...val,
                  stars: qStars,
                  first_correct_attempt: firstCorrectAttemptNum || null,
                };

                if (val.is_correct) {
                  correctlyAnswered += 1;
                }
                if (typeof val.points_earned === "number") {
                  totalScore += val.points_earned;
                }
                if (qStars > maxStars) {
                  maxStars = qStars;
                }
              });
            }
          }

          // Load existing node status to preserve other sections (final_challenge, etc.)
          const existingNodeStatus = await prisma.user_node_status.findUnique({
            where: { user_id_node_id: { user_id: pupilId, node_id: lessonNodeId } },
            select: { progress_data: true, completed_at: true, is_completed: true },
          });

          const existingProgress = existingNodeStatus?.progress_data || {};

          // Check if node should be marked completed
          // Node is completed only if final challenge are passed
          const practiceCompleted = totalQuestions > 0 && correctlyAnswered === totalQuestions;
          const finalChallengeData = existingProgress?.final_challenge;
          const shouldMarkCompleted = finalChallengeData?.is_passed === true;

          // Merge with existing progress_data to preserve final_challenge and other sections
          const progressData = {
            ...existingProgress,
            practice: {
              total_questions: totalQuestions,
              correctly_answered: correctlyAnswered,
              total_score: totalScore,
              stars: maxStars,
              questions: perQuestion,
            },
          };

          // Determine completion timestamp: keep existing if already completed, set new if completing now
          const now = new Date().toISOString();
          const completedAt =
            shouldMarkCompleted && !existingNodeStatus?.completed_at
              ? now
              : existingNodeStatus?.completed_at || null;

          // Upsert to ensure no duplicates - will update if exists, insert if new
          nodeStatusResult = await prisma.user_node_status.upsert({
            where: { user_id_node_id: { user_id: pupilId, node_id: lessonNodeId } },
            update: {
              is_completed: shouldMarkCompleted,
              progress_data: progressData,
              completed_at: completedAt,
            },
            create: {
              user_id: pupilId,
              node_id: lessonNodeId,
              is_completed: shouldMarkCompleted,
              progress_data: progressData,
              completed_at: completedAt,
            },
          });
        }
      } else {
        // ===== FINAL CHALLENGE QUESTIONS: Update final_challenge section of progress_data =====
        const allFinalQuestions = await prisma.lesson_final_challenges.findMany({
          where: { node_id: lessonNodeId },
          select: { id: true, points: true },
        });

        if (allFinalQuestions) {
          const questionIds = allFinalQuestions.map((q: { id: string }) => q.id);
          let totalQuestions = questionIds.length;
          let correctlyAnswered = 0;
          let totalScore = 0;
          let maxStars: 0 | 1 | 2 | 3 = 0;

          let perQuestion: Record<
            string,
            {
              latest_attempt_number: number;
              is_correct: boolean | null;
              points_earned: number | null;
              stars: 0 | 1 | 2 | 3;
              first_correct_attempt?: number | null;
            }
          > = {};

          if (totalQuestions > 0) {
            // Fetch all attempts for all final challenge questions in this lesson
            const attempts = await prisma.user_question_attempts.findMany({
              where: { user_id: pupilId, final_challenge_id: { in: questionIds } },
              select: {
                final_challenge_id: true,
                attempt_number: true,
                is_correct: true,
                points_earned: true,
              },
              orderBy: { attempt_number: "asc" },
            });

            if (attempts) {
              const latestByQuestion = new Map<
                string,
                {
                  latest_attempt_number: number;
                  is_correct: boolean | null;
                  points_earned: number | null;
                }
              >();

              // Track first correct attempt for star calculation
              const firstCorrectAttempt = new Map<string, number>();

              (attempts || []).forEach((a: { final_challenge_id: string; attempt_number: number; is_correct: boolean | null; points_earned: number | null }) => {
                const qId = a.final_challenge_id;

                // Track latest attempt
                latestByQuestion.set(qId, {
                  latest_attempt_number: a.attempt_number,
                  is_correct: a.is_correct,
                  points_earned: a.points_earned,
                });

                // Track first correct attempt
                if (a.is_correct && !firstCorrectAttempt.has(qId)) {
                  firstCorrectAttempt.set(qId, a.attempt_number);
                }
              });

              latestByQuestion.forEach((val, qId) => {
                // Calculate stars based on FIRST correct attempt
                const firstCorrectAttemptNum = firstCorrectAttempt.get(qId);
                const qStars = (val.is_correct && firstCorrectAttemptNum)
                  ? calculateStars(firstCorrectAttemptNum)
                  : 0;

                perQuestion[qId] = {
                  ...val,
                  stars: qStars,
                  first_correct_attempt: firstCorrectAttemptNum || null,
                };

                if (val.is_correct) {
                  correctlyAnswered += 1;
                }
                if (typeof val.points_earned === "number") {
                  totalScore += val.points_earned;
                }
                if (qStars > maxStars) {
                  maxStars = qStars;
                }
              });
            }
          }

          // Load existing node status to preserve other sections (practice, etc.)
          const existingNodeStatus = await prisma.user_node_status.findUnique({
            where: { user_id_node_id: { user_id: pupilId, node_id: lessonNodeId } },
            select: { progress_data: true, completed_at: true, is_completed: true },
          });

          const existingProgress = existingNodeStatus?.progress_data || {};

          // Calculate pass percentage and determine if passed (>= 70%)
          const passPercentage = calculatePercentage(correctlyAnswered, totalQuestions);
          const finalChallengePassed = isPassed(passPercentage);

          // Calculate stars based on pass threshold
          let stars: 0 | 1 | 2 | 3 = 0;
          if (finalChallengePassed) {
            // If passed, award stars based on percentage
            if (passPercentage >= 90) stars = 3;
            else if (passPercentage >= 80) stars = 2;
            else stars = 1;
          }

          // Check if node should be marked completed
          // Node is completed only if BOTH practice and final challenge are passed
          const finalChallengeData = {
            is_passed: finalChallengePassed,
            total_questions: totalQuestions,
            correctly_answered: correctlyAnswered,
            pass_percentage: passPercentage,
            stars,
            total_score: totalScore,
            questions: perQuestion,
            recorded_at: new Date().toISOString(),
          };

          // Merge existing final challenge data
          const existingFinal = existingProgress?.final_challenge || {};
          const existingQuestions = existingFinal?.questions || [];

          // Convert old questions array to Map for easy merging
          const existingMap = new Map(
            existingQuestions.map((q: any) => [q.final_challenge_id, q])
          );

          // Merge new results (update questions that were attempted)
          Object.values(perQuestion).forEach((val: any, idx) => {
            const qId = Object.keys(perQuestion)[idx];
            existingMap.set(qId, {
              final_challenge_id: qId,
              ...val,
            });
          });

          // Final merged array
          const mergedQuestions = Array.from(existingMap.values());

          // Final merged final_challenge object
          const mergedFinalChallenge = {
            ...existingFinal,
            ...finalChallengeData,
            questions: mergedQuestions,
          };

          const practiceData = existingProgress?.practice;
          const practicePassed = practiceData?.correctly_answered === practiceData?.total_questions && practiceData?.total_questions > 0;

          // For node completion: require BOTH practice passed AND final challenge passed (>= 70%)
          // Also verify that all final challenge questions have been attempted at least once
          const allFinalQuestionsAttempted = totalQuestions > 0 && mergedQuestions.length === totalQuestions;
          const shouldMarkCompleted = finalChallengePassed && allFinalQuestionsAttempted;

          // Merge with existing progress_data
          const progressData = {
            ...existingProgress,
            final_challenge: {
              ...mergedFinalChallenge,
              all_questions_attempted: allFinalQuestionsAttempted,
            },
          };

          // Determine completion timestamp
          const now = new Date().toISOString();
          const completedAt =
            shouldMarkCompleted && !existingNodeStatus?.completed_at
              ? now
              : existingNodeStatus?.completed_at || null;

          // Upsert to ensure no duplicates - will update if exists, insert if new
          nodeStatusResult = await prisma.user_node_status.upsert({
            where: { user_id_node_id: { user_id: pupilId, node_id: lessonNodeId } },
            update: {
              is_completed: shouldMarkCompleted,
              progress_data: progressData,
              completed_at: completedAt,
            },
            create: {
              user_id: pupilId,
              node_id: lessonNodeId,
              is_completed: shouldMarkCompleted,
              progress_data: progressData,
              completed_at: completedAt,
            },
          });
        }
      }
    }

    // Check if level should get milestone badge (only if answer is correct and practice question)
    let badgeAwarded = false;
    let badgeInfo = null;
    console.log("isCorrect, lessonNodeId", isCorrect, lessonNodeId);
    if (isCorrect && lessonNodeId) {
      // Only check for Final questions and only after correct answer
      badgeInfo = await checkAndAwardMilestoneBadge(pupilId, lessonNodeId);
      badgeAwarded = badgeInfo !== null;
    }

    // If final challenge is passed, mark the final_journey lesson step as completed
    let stepStatusResult = null;
    if (!isPracticeQuestion && nodeStatusResult?.is_completed && lessonNodeId) {
      // Find the final_journey step for this lesson
      const finalJourneyStep = await prisma.lesson_steps.findFirst({
        where: { node_id: lessonNodeId, step_type: "final_journey" as any },
        select: { id: true },
      });

      if (finalJourneyStep) {
        const now = new Date().toISOString();
        // Upsert user_lesson_step_status for the final_journey step
        stepStatusResult = await prisma.user_lesson_step_status.upsert({
          where: { user_id_step_id: { user_id: pupilId, step_id: finalJourneyStep.id } },
          update: {
            is_unlocked: true,
            is_completed: true,
            completed_at: now,
          },
          create: {
            user_id: pupilId,
            step_id: finalJourneyStep.id,
            is_unlocked: true,
            is_completed: true,
            unlocked_at: now,
            completed_at: now,
          },
        });
      }
    }

    // Check if node is now completed to trigger next level unlock for final challenge
    let nextLevelInfo = null;
    if (!isPracticeQuestion && nodeStatusResult?.is_completed && lessonNodeId) {
      // For final challenge, if node is now marked completed, unlock next level
      nextLevelInfo = await this.unlockNextLevel(pupilId, lessonNodeId);
    }



    // Get current progress summary for this lesson
    const progressSummary = await this.getQuestionProgressSummary(pupilId, lessonNodeId, isPracticeQuestion);

    // Build response with immediate feedback
    return {
      question_id: questionId,
      question_type: isPracticeQuestion ? "practice" : "final_challenge",
      isCorrect,
      correctAnswer,
      yourAnswer: payload.answer,
      starsEarned: stars,
      pointsEarned,
      currentAttempt,
      attemptsLeft,
      maxAttemptsAllowed,
      badgeAwarded,
      badge: badgeInfo || undefined,
      progress: progressSummary,
      node_status: nodeStatusResult || undefined,
      step_status: stepStatusResult || undefined,
      next_level: nextLevelInfo || undefined,
      feedback: this.generateFeedback(isCorrect, currentAttempt, stars),
      message: isCorrect
        ? `Correct! You earned ${stars} star${stars !== 1 ? "s" : ""}!${pointsEarned > 0 ? ` +${pointsEarned} points` : ""}`
        : `Incorrect. Attempts left: ${attemptsLeft}`,
    };
  }

  /**
   * Generate feedback message based on correctness and attempt
   */
  private generateFeedback(
    isCorrect: boolean,
    attemptNumber: number,
    starsEarned: 0 | 1 | 2 | 3
  ): string {
    if (!isCorrect) {
      return `Try again! This is attempt ${attemptNumber}.`;
    }

    switch (starsEarned) {
      case 3:
        return "Excellent! Perfect on first try!";
      case 2:
        return "Great job! You got it on the second try.";
      case 1:
        return "Good effort! You got it on the third try.";
      default:
        return "You answered correctly, but it took a few tries.";
    }
  }

  /**
   * Get progress summary for a lesson after question submission
   * Includes combined points from both practice and final challenge
   */
  private async getQuestionProgressSummary(
    pupilId: string,
    lessonNodeId: string | null,
    isPracticeQuestion: boolean
  ) {
    if (!lessonNodeId) return null;

    const nodeStatus = await prisma.user_node_status.findUnique({
      where: { user_id_node_id: { user_id: pupilId, node_id: lessonNodeId } },
      select: { progress_data: true, is_completed: true },
    });

    if (!nodeStatus) return null;

    const progressData = nodeStatus.progress_data || {};
    const practice = progressData.practice || {};
    const finalChallenge = progressData.final_challenge || {};

    // Calculate total points from BOTH practice and final challenge
    const practicePoints = practice.total_score || 0;
    const finalChallengePoints = finalChallenge.total_score || 0;
    const totalPoints = practicePoints + finalChallengePoints;

    // Get max possible points for this lesson
    const [practiceQuestions, finalQuestions] = await Promise.all([
      prisma.lesson_practice_questions.findMany({
        where: { node_id: lessonNodeId },
        select: { points: true },
      }),
      prisma.lesson_final_challenges.findMany({
        where: { node_id: lessonNodeId },
        select: { points: true },
      }),
    ]);

    const maxPracticePoints = practiceQuestions.reduce((sum: number, q: any) => sum + (q.points || 0), 0);
    const maxFinalPoints = finalQuestions.reduce((sum: number, q: any) => sum + (q.points || 0), 0);
    const maxPossiblePoints = maxPracticePoints + maxFinalPoints;

    if (isPracticeQuestion) {
      return {
        section: "practice",
        practice: {
          total_questions: practice.total_questions || 0,
          correctly_answered: practice.correctly_answered || 0,
          total_score: practicePoints,
          max_score: maxPracticePoints,
          stars: practice.stars || 0,
        },
        final_challenge: {
          total_questions: finalChallenge.total_questions || 0,
          correctly_answered: finalChallenge.correctly_answered || 0,
          total_score: finalChallengePoints,
          max_score: maxFinalPoints,
          is_passed: finalChallenge.is_passed || false,
          stars: finalChallenge.stars || 0,
        },
        combined: {
          total_points: totalPoints,
          max_possible_points: maxPossiblePoints,
          percentage: maxPossiblePoints > 0 ? Math.round((totalPoints / maxPossiblePoints) * 100) : 0,
        },
        lesson_completed: nodeStatus.is_completed || false,
      };
    } else {
      return {
        section: "final_challenge",
        practice: {
          total_questions: practice.total_questions || 0,
          correctly_answered: practice.correctly_answered || 0,
          total_score: practicePoints,
          max_score: maxPracticePoints,
          stars: practice.stars || 0,
        },
        final_challenge: {
          total_questions: finalChallenge.total_questions || 0,
          correctly_answered: finalChallenge.correctly_answered || 0,
          total_score: finalChallengePoints,
          max_score: maxFinalPoints,
          pass_percentage: finalChallenge.pass_percentage || 0,
          is_passed: finalChallenge.is_passed || false,
          stars: finalChallenge.stars || 0,
        },
        combined: {
          total_points: totalPoints,
          max_possible_points: maxPossiblePoints,
          percentage: maxPossiblePoints > 0 ? Math.round((totalPoints / maxPossiblePoints) * 100) : 0,
        },
        lesson_completed: nodeStatus.is_completed || false,
      };
    }
  }

  /**
   * Group questions by difficulty level
   */
  private groupQuestionsByDifficulty(questions: any[]) {
    const grouped = {
      easy: [] as any[],
      medium: [] as any[],
      hard: [] as any[],
    };

    questions.forEach((q) => {
      const difficulty = q.difficulty || 'medium';
      if (difficulty in grouped) {
        grouped[difficulty as 'easy' | 'medium' | 'hard'].push(q);
      } else {
        // Default to medium if unknown difficulty
        grouped.medium.push(q);
      }
    });

    return grouped;
  }

  private extractIntegrationMeta(payload?: Record<string, any> | null) {
    if (!payload) return null;
    if (payload.is_integration_lesson) return payload;
    return null;
  }

  private async notifyParentOfIntegrationCompletion(
    pupilId: string,
    lessonNode: { id: string; title: string; parent_id: string | null },
    questionId: string,
    integrationMeta: any,
    stats: { word_count?: number; character_count?: number; is_correct?: boolean },
    integrationType: 'writing' | 'ordering' = 'writing',
  ) {
    const pupil = await prisma.pupils.findUnique({
      where: { id: pupilId },
      select: { id: true, first_name: true, last_name: true, parent_id: true },
    });

    if (!pupil?.parent_id) return null;

    const unitNode = lessonNode.parent_id
      ? await prisma.subject_structure.findUnique({
        where: { id: lessonNode.parent_id },
        select: { id: true, title: true, parent_id: true },
      })
      : null;

    const segmentNode = unitNode?.parent_id
      ? await prisma.subject_structure.findUnique({
        where: { id: unitNode.parent_id },
        select: { id: true, title: true },
      })
      : null;

    const pupilName = `${pupil.first_name} ${pupil.last_name}`.trim();
    const segmentName = segmentNode?.title || "this segment";

    let message: string;
    let title: string;

    if (integrationType === 'writing') {
      const rubricText = (integrationMeta?.rubric_points || []).join(", ");
      title = 'Writing Assessment Completed';
      message = `Your child ${pupilName} has completed the integration writing assessment in ${segmentName}. Please review their work and evaluate it on the following points: ${rubricText}`;
    } else {
      title = 'Ordering Assessment Completed';
      const resultText = stats.is_correct ? 'correctly' : 'but needs review';
      message = `Your child ${pupilName} has completed the integration ordering assessment in ${segmentName} ${resultText}.`;
    }

    const payload: NotificationPayload = {
      type: "integration_assessment_completed",
      notify: "parent",
      meta: {
        integration_type: integrationType,
        lesson_id: lessonNode.id,
        unit_id: unitNode?.id,
        segment_id: segmentNode?.id,
        question_id: questionId,
        rubric_points: integrationMeta?.rubric_points || [],
        stats,
      }
    };

    // Create notification in database
    const notification = await NotificationService.createNotification(
      title,
      pupil.parent_id,
      pupil.id,
      message,
      payload
    );

    // Send push notification to parent's devices
    try {
      const parentDevices = await prisma.parent_device_tokens.findMany({
        where: { parent_id: pupil.parent_id },
        select: { token: true, platform: true },
      });

      if (parentDevices && parentDevices.length > 0) {
        // Send to all registered devices
        await Promise.all(
          parentDevices.map((device: any) =>
            NotificationService.sendPushNotification(
              device.token,
              title,
              message,
              {
                type: 'integration_assessment',
                lesson_id: lessonNode.id,
                pupil_id: pupilId,
                integration_type: integrationType,
              }
            ).catch(err => {
              console.error('Failed to send push notification to device:', device.token, err);
              return null; // Don't fail the whole operation if one device fails
            })
          )
        );

        console.log(`✅ Sent integration notification to ${parentDevices.length} device(s)`);
      } else {
        console.log('⚠️  No parent devices registered for push notifications');
      }
    } catch (err) {
      console.error('Error sending push notifications:', err);
      // Don't fail the integration submission if push notification fails
    }

    return notification;
  }

  private async ensurePupilExists(pupilId: string) {
    const pupil = await prisma.pupils.findUnique({
      where: { id: pupilId },
      select: { id: true },
    });

    if (!pupil) throw new Error("Pupil not found");
  }

  private async ensureSubjectExists(subjectId: string) {
    const subject = await prisma.subjects.findUnique({
      where: { id: subjectId },
    });

    if (!subject) throw new Error("Subject not found");
    return subject;
  }

  private resolveJourneyType(subject: { name?: string | null; journey_type?: string | null }) {
    if (subject.journey_type) return subject.journey_type;

    const name = (subject.name || "").toLowerCase();
    if (name.includes("arabic")) return "arabic_nested";
    if (name.includes("french")) return "french_projects";
    if (name.includes("math")) return "math_linear";
    if (name.includes("science")) return "science_linear";
    return "linear";
  }

  // ---------------------------------------------------------------------------
  // Public APIs
  // ---------------------------------------------------------------------------

  /**
   * Get all subjects (simple list) – frontend can display subject cards.
   */
  async getAllSubjects() {
    const subjects = await prisma.subjects.findMany({
      select: { id: true, name: true, code: true, description: true, journey_type: true },
      orderBy: { name: "asc" },
    });

    return subjects.map((s: typeof subjects[number]) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      description: s.description,
      journey_type: this.resolveJourneyType(s),
    }));
  }

  /**
   * Complete list of all subjects for a specific pupil.
   */

  async getPupilAllSubjects(pupilId: string) {
    const pupil = await prisma.pupils.findUnique({
      where: { id: pupilId },
      select: { current_year_id: true },
    });

    if (!pupil) throw new Error("Pupil not found");

    const yearId = pupil.current_year_id;

    return prisma.subjects.findMany({
      where: { academic_year_id: yearId || undefined },
    });
  }


  /**
   * Journey map for a subject for a specific pupil.
   * Includes:
   *  - full hierarchical structure (root → level → unit → lesson)
   *  - per-lesson progress (completed steps / total)
   *  - first-view flag (showJourneyMapOnThisVisit)
   */
  async getSubjectJourneyMap(pupilId: string, subjectId: string) {
    await this.ensurePupilExists(pupilId);
    const subject = await this.ensureSubjectExists(subjectId);

    // First-view tracking: pupil_subject_states(pupil_id, subject_id, has_seen_journey_map)
    /** commented this piece of code for later purpose */
    // const { data: stateRow, error: stateError } = await supabase
    //   .from("pupil_subject_states")
    //   .select("id, has_seen_journey_map")
    //   .eq("pupil_id", pupilId)
    //   .eq("subject_id", subjectId)
    //   .maybeSingle();
    //
    // if (stateError) throw new Error(stateError.message);
    //
    // const isFirstVisit = !stateRow || !stateRow.has_seen_journey_map;
    //
    // // If first time, mark as seen so subsequent calls won't show it again
    // if (isFirstVisit) {
    //   const { error: upsertError } = await supabase.from("pupil_subject_states").upsert(
    //     {
    //       pupil_id: pupilId,
    //       subject_id: subjectId,
    //       has_seen_journey_map: true,
    //       first_seen_at: new Date().toISOString(),
    //       last_opened_at: new Date().toISOString(),
    //     },
    //     {
    //       onConflict: "pupil_id,subject_id",
    //     }
    //   );
    //
    //   if (upsertError) throw new Error(upsertError.message);
    // } else {
    //   const { error: updateError } = await supabase
    //     .from("pupil_subject_states")
    //     .update({ last_opened_at: new Date().toISOString() })
    //     .eq("id", stateRow.id);
    //
    //   if (updateError) throw new Error(updateError.message);
    // }

    // Fetch all structure nodes for this subject
    const allNodes = (await prisma.subject_structure.findMany({
      where: { subject_id: subjectId },
      select: {
        id: true,
        subject_id: true,
        parent_id: true,
        node_type: true,
        title: true,
        order_index: true,
        payload: true,
      },
      orderBy: { order_index: "asc" },
    })) as unknown as SubjectStructureNode[];

    // Collect lesson nodes for progress computation
    const lessonNodes = allNodes.filter((n) => n.node_type === "lesson");
    const lessonNodeIds = lessonNodes.map((n) => n.id);

    let lessonSteps: LessonStep[] = [];
    let userSteps: UserLessonStepStatus[] = [];

    if (lessonNodeIds.length > 0) {
      lessonSteps = (await prisma.lesson_steps.findMany({
        where: { node_id: { in: lessonNodeIds } },
        select: { id: true, node_id: true, step_type: true, order_index: true },
        orderBy: { order_index: "asc" },
      })) as unknown as LessonStep[];

      const stepIds = lessonSteps.map((s: LessonStep) => s.id);

      if (stepIds.length > 0) {
        userSteps = (await prisma.user_lesson_step_status.findMany({
          where: { user_id: pupilId, step_id: { in: stepIds } },
          select: {
            id: true,
            user_id: true,
            step_id: true,
            is_unlocked: true,
            is_completed: true,
          },
        })) as unknown as UserLessonStepStatus[];
      }
    }

    // Build lookup maps
    const stepsByLessonId: Record<string, LessonStep[]> = {};
    lessonSteps.forEach((step: LessonStep) => {
      if (!stepsByLessonId[step.node_id]) stepsByLessonId[step.node_id] = [];
      stepsByLessonId[step.node_id].push(step);
    });

    const userStepsByStepId = new Map<string, UserLessonStepStatus>();
    userSteps.forEach((us: UserLessonStepStatus) => {
      userStepsByStepId.set(us.step_id, us);
    });

    // Build tree
    const nodesById: Record<string, SubjectStructureNode & { children: any[] }> = {};
    allNodes.forEach((n) => {
      nodesById[n.id] = { ...n, children: [] };
    });

    const roots: any[] = [];
    allNodes.forEach((n) => {
      const node = nodesById[n.id];
      if (n.parent_id && nodesById[n.parent_id]) {
        nodesById[n.parent_id].children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Helper function to calculate stars from final_challenge points
    const calculateStars = (progressData: any): number => {
      const finalChallenge = progressData?.final_challenge;
      const practiceQuestion = progressData?.practice;
      if (
        !finalChallenge ||
        !finalChallenge.questions ||
        !Array.isArray(finalChallenge.questions)
      ) {
        return 0;
      }

      let totalStarsEarned = 0;
      finalChallenge.questions.forEach((q: any) => {
        if (q.starsEarned && typeof q.starsEarned === "number" && q.starsEarned >= 0 || q.stars && typeof q.stars === "number" && q.stars >= 0) {
          totalStarsEarned += q.starsEarned || q.stars;
        }
      })

      Object.values(practiceQuestion.questions).forEach((q: any) => {
        if (q.starsEarned && typeof q.starsEarned === "number" && q.starsEarned >= 0 || q.stars && typeof q.stars === "number" && q.stars >= 0) {
          totalStarsEarned += q.starsEarned || q.stars;
        }
      })

      return totalStarsEarned;

    }

    // Attach per-lesson progress info
    for (const lesson of lessonNodes) {
      const node = nodesById[lesson.id] as SubjectStructureNode & { children: any[]; progress?: any };
      const steps = stepsByLessonId[lesson.id] || [];
      const totalSteps = steps.length;
      const completedSteps = steps.filter((s: LessonStep) => {
        const us = userStepsByStepId.get(s.id);
        return us && us.is_completed;
      }).length;

      // Fetch user progress data for this lesson
      const nodeProgress: Array<{ progress_data: any }> = await prisma.user_node_status.findMany({
        where: { user_id: pupilId, node_id: lesson.id },
        select: { progress_data: true },
      });

      const totalFinalQuestions = await prisma.lesson_final_challenges.count({
        where: { node_id: lesson.id },
      });

      const totalPracticeQuestions = await prisma.lesson_practice_questions.count({
        where: { node_id: lesson.id },
      });
      const totalStars = totalFinalQuestions * 3 + totalPracticeQuestions * 3;

      // Calculate total stars earned for this lesson
      const starsEarned = nodeProgress.reduce((sum: number, row: { progress_data: any }) => {
        return sum + calculateStars(row.progress_data);
      }, 0);

      // Attach the stars info in progress
      node.progress = {
        total_steps: totalSteps,
        completed_steps: completedSteps,
        stars: { earned: starsEarned, total: totalStars },
      };
    }
    // Propagate progress to parent nodes (level/unit nodes)
    const propagateProgress = (node: any) => {
      if (node.node_type === 'lesson') {
        return node.progress;
      }

      let totalStarsEarned = 0;
      let totalSteps = 0;
      let completedSteps = 0;
      let starsTotal = 0;

      node.children.forEach((child: any) => {
        const childProgress = propagateProgress(child);
        totalStarsEarned += childProgress?.stars?.earned || 0;
        starsTotal += childProgress?.stars?.total || 0;
        totalSteps += childProgress?.total_steps || 0;
        completedSteps += childProgress?.completed_steps || 0;
      });

      node.progress = {
        total_steps: totalSteps,
        completed_steps: completedSteps,
        stars: {
          earned: totalStarsEarned,
          total: starsTotal, // Assuming each lesson can earn 3 stars max
        },
      };
      return node.progress;
    }

    roots.forEach(propagateProgress);

    return {
      subject: {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        description: subject.description,
        journey_type: this.resolveJourneyType(subject),
      },
      // TODO: wire real first-view flag once a suitable tracking table/column is decided
      showJourneyMapOnThisVisit: false,
      structure: roots,
    };
  }

  /**
   * Get the 4-card journey state for a given lesson node.
   * Enforces server-side locking rules.
   */
  async getLessonCards(pupilId: string, lessonNodeId: string) {
    await this.ensurePupilExists(pupilId);

    // Verify lesson node
    const lessonNode = await prisma.subject_structure.findUnique({
      where: { id: lessonNodeId },
      select: { id: true, node_type: true, title: true, subject_id: true, payload: true },
    });

    if (!lessonNode) throw new Error("Lesson not found");
    if (lessonNode.node_type !== "lesson") {
      throw new Error("Provided node is not a lesson");
    }

    const isIntegrationLesson =
      this.extractIntegrationMeta(lessonNode.payload as Record<string, any>) !== null;

    // Steps for this lesson
    const steps = (await prisma.lesson_steps.findMany({
      where: { node_id: lessonNodeId },
      select: { id: true, node_id: true, step_type: true, order_index: true, lesson_step_content: true },
      orderBy: { order_index: "asc" },
    })) as unknown as LessonStep[];
    if (!steps.length) {
      throw new Error("No steps configured for this lesson");
    }

    // Check lesson video and validate video URL
    const lessonVideoStep = steps.find((s) => s.step_type === "lesson_video");
    const lessonIntroStep = steps.find((s) => s.step_type === "lesson_intro");

    let lessonVideo: { video_url: string } | null = null;
    let hasLessonIntro = (lessonIntroStep?.lesson_step_content?.length ?? 0) > 0;
    if (lessonVideoStep) {
      // Check if video_url exists and is a valid URL
      const videoContent = lessonVideoStep.lesson_step_content[0]; // assuming the video is at index 0
      if (videoContent && videoContent.video_url && isValidVideoUrl(videoContent.video_url)) {
        lessonVideo = { video_url: videoContent.video_url };
      }
    }
    if (lessonIntroStep) {

    }
    const stepIds = steps.map((s: LessonStep) => s.id);

    const userStepsData = await prisma.user_lesson_step_status.findMany({
      where: { user_id: pupilId, step_id: { in: stepIds } },
      select: {
        id: true,
        user_id: true,
        step_id: true,
        is_unlocked: true,
        is_completed: true,
      },
    });

    const userStepsByStepId = new Map<string, UserLessonStepStatus>();
    userStepsData.forEach((us: UserLessonStepStatus) => {
      userStepsByStepId.set(us.step_id, us as UserLessonStepStatus);
    });

    const stepByType: Record<StepType, LessonStep | undefined> = {
      lesson_intro: steps.find((s) => s.step_type === "lesson_intro"),
      lesson_video: steps.find((s) => s.step_type === "lesson_video"),
      practice_questions: steps.find((s) => s.step_type === "practice_questions"),
      final_journey: steps.find((s) => s.step_type === "final_journey"),
    };

    const isCompleted = (step?: LessonStep) => {
      if (!step) return false;
      const us = userStepsByStepId.get(step.id);
      return !!us && us.is_completed;
    };

    const introCompleted = isCompleted(stepByType.lesson_intro);
    const videoCompleted = isCompleted(stepByType.lesson_video);

    const cards: any[] = []
    
    if (hasLessonIntro) {
      cards.push({
        key: "lesson_intro",
        title: "Lesson Intro",
        step_id: stepByType.lesson_intro?.id || null,
        unlocked: !!stepByType.lesson_intro, // always unlocked if configured
        completed: introCompleted,
        lockedReason: stepByType.lesson_intro ? null : "Lesson intro not configured",
      })
    }

    if (lessonVideo) {
      cards.push({
        key: "lesson_video",
        title: "Lesson Video",
        step_id: stepByType.lesson_video?.id || null,
        unlocked: !!stepByType.lesson_video && (introCompleted || isIntegrationLesson),
        completed: videoCompleted,
        lesson_video: lessonVideo, // Add the lesson video to the response here
        lockedReason: !stepByType.lesson_video
          ? "Lesson video not configured"
          : isIntegrationLesson
            ? null
            : !introCompleted
              ? "Complete Lesson Intro first"
              : null,
      })
    }

    cards.push(
      {
        key: "practice_questions",
        title: "Practice Questions",
        step_id: stepByType.practice_questions?.id || null,
        // Always accessible, even at the very beginning
        unlocked: !!stepByType.practice_questions,
        completed: isCompleted(stepByType.practice_questions),
        lockedReason: stepByType.practice_questions ? null : "Practice questions not configured",
      },
      {
        key: "final_journey",
        title: isIntegrationLesson ? "Integrations Assessment" : "Let’s Start Journey",
        step_id: stepByType.final_journey?.id || null,
        unlocked: !!stepByType.final_journey && (videoCompleted || isIntegrationLesson),
        completed: isCompleted(stepByType.final_journey),
        lockedReason: !stepByType.final_journey
          ? "Final journey not configured"
          : isIntegrationLesson
            ? null
            : !videoCompleted
              ? "Complete Lesson Video first"
              : null,
      },
    )

    return {
      lesson: {
        id: lessonNode.id,
        title: lessonNode.title,
        subject_id: lessonNode.subject_id,
      },
      cards,
    };
  }

  private async tryCompleteNode(
    pupilId: string,
    nodeId: string
  ): Promise<{ completed: boolean; blockedAt?: { nodeId: string, nodeType: string } }> {

    // 1. Get node
    const node = await prisma.subject_structure.findUnique({
      where: { id: nodeId },
      select: { id: true, parent_id: true, node_type: true },
    });

    if (!node) return { completed: false };

    // 2. Determine children
    let allChildrenCompleted = false;

    if (node.node_type === "lesson") {
      // Lesson → steps
      const steps = await prisma.lesson_steps.findMany({
        where: { node_id: node.id },
        select: { id: true },
      });

      const completedSteps = await prisma.user_lesson_step_status.count({
        where: {
          user_id: pupilId,
          step_id: { in: steps.map((s: { id: string }) => s.id) },
          is_completed: true
        },
      });

      allChildrenCompleted = steps.length > 0 && (completedSteps === steps.length || completedSteps === steps.length - 1);
    } else {
      // Topic / Unit / Segment → child nodes
      const children = await prisma.subject_structure.findMany({
        where: { parent_id: node.id },
        select: { id: true },
      });

      const completedChildren = await prisma.user_node_status.count({
        where: {
          user_id: pupilId,
          node_id: { in: children.map((c: { id: string }) => c.id) },
          is_completed: true,
        },
      });

      allChildrenCompleted = children.length > 0 && completedChildren === children.length;
    }

    // 3. If not completed → stop here
    if (!allChildrenCompleted) {
      return {
        completed: false,
        blockedAt: {
          nodeId: node.id,
          nodeType: node.node_type,
        },
      };
    }

    // 4. Mark node completed
    await prisma.user_node_status.upsert({
      where: {
        user_id_node_id: {
          user_id: pupilId,
          node_id: node.id,
        },
      },
      update: {
        is_completed: true,
        completed_at: new Date(),
      },
      create: {
        user_id: pupilId,
        node_id: node.id,
        is_completed: true,
        completed_at: new Date(),
      },
    });

    // 5. Recurse to parent
    if (!node.parent_id) {
      return { completed: true };
    }

    return this.tryCompleteNode(pupilId, node.parent_id);
  }

  /**
   * Mark a step as completed for a pupil, enforcing sequential unlock rules.
   */
  async completeStep(pupilId: string, stepId: string) {
    await this.ensurePupilExists(pupilId);

    // Fetch the step and its lesson
    const step = await prisma.lesson_steps.findUnique({
      where: { id: stepId },
      select: { id: true, node_id: true, step_type: true },
    });

    if (!step) throw new Error("Step not found");

    const stepType = step.step_type as StepType;

    if (stepType === "final_journey") {
      const videoStep = await prisma.lesson_steps.findFirst({
        where: { node_id: step.node_id, step_type: "lesson_video" as any },
        select: { id: true, lesson_step_content: true },
      });

      const introStep = await prisma.lesson_steps.findFirst({
        where: { node_id: step.node_id, step_type: "lesson_intro" as any },
        select: { id: true, lesson_step_content: true },
      });

      const videoProgress = await prisma.user_lesson_step_status.findUnique({
        where: { user_id_step_id: { user_id: pupilId, step_id: videoStep.id } },
        select: { is_completed: true, step_id: true },
      });

      const now = new Date().toISOString();
      const newVideoUpdated = await prisma.user_lesson_step_status.upsert({
        where: { user_id_step_id: { user_id: pupilId, step_id: videoStep.id } },
        update: {
          is_unlocked: true,
          is_completed: true,
          completed_at: now,
        },
        create: {
          user_id: pupilId,
          step_id: videoStep.id,
          is_unlocked: true,
          is_completed: true,
          unlocked_at: now,
          completed_at: now,
        },
      });
      const newIntroUpdated = await prisma.user_lesson_step_status.upsert({
        where: { user_id_step_id: { user_id: pupilId, step_id: introStep.id } },
        update: {
          is_unlocked: true,
          is_completed: true,
          completed_at: now,
        },
        create: {
          user_id: pupilId,
          step_id: introStep.id,
          is_unlocked: true,
          is_completed: true,
          unlocked_at: now,
          completed_at: now,
        },
      });

      const stepId = videoProgress.step_id
      const lessonStep = await prisma.lesson_steps.findUnique({ where: { id: stepId } })
      const updated_node = await prisma.user_node_status.update({
        where: {
          user_id_node_id: {
            user_id: pupilId,
            node_id: lessonStep.node_id,
          },
        },
        data: { is_completed: true },
      });
    }

    const now = new Date().toISOString();
    const updated = await prisma.user_lesson_step_status.upsert({
      where: { user_id_step_id: { user_id: pupilId, step_id: stepId } },
      update: {
        is_unlocked: true,
        is_completed: true,
        completed_at: now,
      },
      create: {
        user_id: pupilId,
        step_id: stepId,
        is_unlocked: true,
        is_completed: true,
        unlocked_at: now,
        completed_at: now,
      },
    });

    const hierarchyResult = await this.tryCompleteNode(pupilId, step.node_id);
    return {
      stepCompleted: true,
      navigateTo: hierarchyResult.blockedAt ?? null,
    };
  }

  /**
   * Get full data for a specific step (intro/video/practice/final) including media and questions.
   */
  async getStepDetails(stepId: string) {
    // Fetch step + its lesson node
    const step = await prisma.lesson_steps.findUnique({
      where: { id: stepId },
      select: { id: true, node_id: true, step_type: true, order_index: true },
    });

    if (!step) throw new Error("Step not found");

    const stepType = step.step_type as StepType;

    const lessonNode = await prisma.subject_structure.findUnique({
      where: { id: step.node_id },
      select: { id: true, subject_id: true, title: true, node_type: true, payload: true },
    });

    if (!lessonNode) throw new Error("Lesson not found for this step");

    // Common media content for intro/video
    const mediaContent = await prisma.lesson_step_content.findFirst({
      where: { step_id: stepId },
      select: {
        id: true,
        background_image_url: true,
        tts_audio_url: true,
        karaoke_json: true,
        video_url: true,
        skip_available_after_seconds: true,
        extras: true,
      },
    });

    return {
      step: {
        id: step.id,
        step_type: stepType,
        order_index: step.order_index,
      },
      lesson: {
        id: lessonNode.id,
        title: lessonNode.title,
        subject_id: lessonNode.subject_id,
      },
      content: {
        media: mediaContent || null,
      },
    };
  }


  /**
   * Get Practice Questions Attempts details
   */
  async getPracticeQuestionProgress(pupilId: string, questionId: string) {
    await this.ensurePupilExists(pupilId);

    return prisma.user_question_attempts.findMany({
      where: { practice_question_id: questionId, user_id: pupilId },
      select: {
        id: true,
        is_correct: true,
        attempt_number: true,
        points_earned: true,
        response_data: true,
        created_at: true,
      },
      orderBy: { created_at: "asc" },
    });
  }

  /**
   * Ensure a user_node_status exists for a lesson and that progress_data contains
   * practice and final_challenge question placeholders for every question in the lesson.
   * Returns the upserted/updated user_node_status row.
   */
  private async ensureNodeStatusWithQuestions(pupilId: string, lessonNodeId: string) {
    const maxAttemptsAllowed = 3;

    // Load all practice and final-challenge questions for this lesson with additional details
    const [practiceQuestions, finalQuestions] = await Promise.all([
      prisma.lesson_practice_questions.findMany({
        where: { node_id: lessonNodeId },
        select: { id: true, difficulty: true, question_json: true, points: true },
      }),
      prisma.lesson_final_challenges.findMany({
        where: { node_id: lessonNodeId },
        select: { id: true, difficulty: true, challenge_json: true, points: true },
      }),
    ]);

    // Fetch existing status (if any)
    const existingStatus = await prisma.user_node_status.findUnique({
      where: { user_id_node_id: { user_id: pupilId, node_id: lessonNodeId } },
      select: { id: true, progress_data: true, is_completed: true, completed_at: true },
    });

    const practiceQuestionIds = (practiceQuestions || []).map((q: any) => q.id);
    const finalQuestionIds = (finalQuestions || []).map((q: any) => q.id);

    const existingProgress = existingStatus?.progress_data || {};

    // ----- Practice section with detailed progress -----
    const existingPractice = existingProgress.practice || {};

    // Fetch all attempts for practice questions
    const practiceAttempts = await prisma.user_question_attempts.findMany({
      where: {
        user_id: pupilId,
        practice_question_id: { in: practiceQuestionIds },
      },
      select: {
        practice_question_id: true,
        attempt_number: true,
        is_correct: true,
        points_earned: true,
        response_data: true,
      },
      orderBy: { attempt_number: "desc" },
    });

    // Group attempts by question_id
    const practiceAttemptsByQuestion = new Map<string, any[]>();
    practiceAttempts.forEach((attempt: any) => {
      const qId = attempt.practice_question_id;
      if (!practiceAttemptsByQuestion.has(qId)) {
        practiceAttemptsByQuestion.set(qId, []);
      }
      practiceAttemptsByQuestion.get(qId)!.push(attempt);
    });

    // Build detailed question data with all submission info
    const enrichedPracticeQuestions = practiceQuestions.map((question: any) => {
      const qId = question.id;
      const attempts = practiceAttemptsByQuestion.get(qId) || [];
      const latestAttempt = attempts[0]; // already sorted desc

      // Find first correct attempt for star calculation
      const correctAttempts = attempts.filter((a: any) => a.is_correct === true);
      const firstCorrectAttempt = correctAttempts.length > 0
        ? correctAttempts[correctAttempts.length - 1] // last in desc order = first chronologically
        : null;

      const currentAttempt = attempts.length;
      const attemptsLeft = Math.max(0, maxAttemptsAllowed - currentAttempt);
      const isCorrect = latestAttempt?.is_correct === true;
      const starsEarned = firstCorrectAttempt ? calculateStars(firstCorrectAttempt.attempt_number) : 0;

      // Extract correct answer from question JSON
      let correctAnswer: any = null;
      try {
        const questionJson = typeof question.question_json === 'string'
          ? JSON.parse(question.question_json)
          : question.question_json;
        correctAnswer = questionJson?.correct_answer || questionJson?.answer || null;
      } catch (e) {
        correctAnswer = null;
      }

      // Extract user's answer from response_data
      const yourAnswer = latestAttempt?.response_data?.answer || null;

      return {
        lesson_id: lessonNodeId,
        question_id: qId,
        question_type: "practice",
        difficulty: question.difficulty || "medium",
        isCorrect: isCorrect,
        correctAnswer: correctAnswer,
        yourAnswer: yourAnswer,
        starsEarned: starsEarned,
        pointsEarned: latestAttempt?.points_earned || 0,
        currentAttempt: currentAttempt,
        attemptsLeft: attemptsLeft,
        maxAttemptsAllowed: maxAttemptsAllowed,
        latest_attempt_number: latestAttempt?.attempt_number || null,
        response_data: latestAttempt?.response_data || null,
      };
    });

    const practiceCorrectlyAnswered = enrichedPracticeQuestions.filter((q: any) => q.isCorrect).length;
    const practiceTotalScore = enrichedPracticeQuestions.reduce(
      (sum: number, q: any) => sum + (q.pointsEarned || 0),
      0
    );
    const practiceMaxStars = enrichedPracticeQuestions.reduce((max: number, q: any) => {
      const current = (q.starsEarned ?? 0) as number;
      return Math.max(max, current);
    }, 0) as 0 | 1 | 2 | 3;

    const practiceSection = {
      ...existingPractice,
      total_questions: practiceQuestionIds.length,
      correctly_answered: practiceCorrectlyAnswered,
      total_score: practiceTotalScore,
      stars: practiceMaxStars,
      questions: enrichedPracticeQuestions,
    };

    // ----- Final challenge section with detailed progress -----
    const existingFinal = existingProgress.final_challenge || {};

    // Fetch all attempts for final challenge questions
    const finalAttempts = await prisma.user_question_attempts.findMany({
      where: {
        user_id: pupilId,
        final_challenge_id: { in: finalQuestionIds },
      },
      select: {
        final_challenge_id: true,
        attempt_number: true,
        is_correct: true,
        points_earned: true,
        response_data: true,
      },
      orderBy: { attempt_number: "desc" },
    });

    // Group attempts by question_id
    const attemptsByQuestion = new Map<string, any[]>();
    finalAttempts.forEach((attempt: any) => {
      const qId = attempt.final_challenge_id;
      if (!attemptsByQuestion.has(qId)) {
        attemptsByQuestion.set(qId, []);
      }
      attemptsByQuestion.get(qId)!.push(attempt);
    });

    // Build detailed question data with all submission info
    const enrichedFinalQuestions = finalQuestions.map((question: any) => {
      const qId = question.id;
      const attempts = attemptsByQuestion.get(qId) || [];
      const latestAttempt = attempts[0]; // already sorted desc

      // Find first correct attempt for star calculation
      const correctAttempts = attempts.filter((a: any) => a.is_correct === true);
      const firstCorrectAttempt = correctAttempts.length > 0
        ? correctAttempts[correctAttempts.length - 1] // last in desc order = first chronologically
        : null;

      const currentAttempt = attempts.length;
      const attemptsLeft = Math.max(0, maxAttemptsAllowed - currentAttempt);
      const isCorrect = latestAttempt?.is_correct === true;
      const starsEarned = firstCorrectAttempt ? calculateStars(firstCorrectAttempt.attempt_number) : 0;

      // Extract correct answer from question JSON
      let correctAnswer: any = null;
      try {
        const challengeJson = typeof question.challenge_json === 'string'
          ? JSON.parse(question.challenge_json)
          : question.challenge_json;
        correctAnswer = challengeJson?.correct_answer || challengeJson?.answer || null;
      } catch (e) {
        correctAnswer = null;
      }

      // Extract user's answer from response_data
      const yourAnswer = latestAttempt?.response_data?.answer || null;

      return {
        lesson_id: lessonNodeId,
        question_id: qId,
        question_type: "final_challenge",
        difficulty: question.difficulty || "medium",
        isCorrect: isCorrect,
        correctAnswer: correctAnswer,
        yourAnswer: yourAnswer,
        starsEarned: starsEarned,
        pointsEarned: latestAttempt?.points_earned || 0,
        currentAttempt: currentAttempt,
        attemptsLeft: attemptsLeft,
        maxAttemptsAllowed: maxAttemptsAllowed,
        latest_attempt_number: latestAttempt?.attempt_number || null,
        response_data: latestAttempt?.response_data || null,
      };
    });

    const finalCorrectlyAnswered = enrichedFinalQuestions.filter((q: any) => q.isCorrect).length;
    const finalTotalScore = enrichedFinalQuestions.reduce(
      (sum: number, q: any) => sum + (q.pointsEarned || 0),
      0
    );
    const finalMaxStars = enrichedFinalQuestions.reduce((max: number, q: any) => {
      const current = (q.starsEarned ?? 0) as number;
      return Math.max(max, current);
    }, 0) as 0 | 1 | 2 | 3;

    const finalSection = {
      ...existingFinal,
      is_passed: existingFinal.is_passed === true,
      total_questions: finalQuestionIds.length,
      correctly_answered:
        typeof existingFinal.correctly_answered === "number"
          ? existingFinal.correctly_answered
          : finalCorrectlyAnswered,
      pass_percentage:
        typeof existingFinal.pass_percentage === "number"
          ? existingFinal.pass_percentage
          : calculatePercentage(finalCorrectlyAnswered, finalQuestionIds.length),
      stars: existingFinal.stars ?? finalMaxStars,
      total_score:
        typeof existingFinal.total_score === "number" ? existingFinal.total_score : finalTotalScore,
      questions: enrichedFinalQuestions,
      recorded_at: existingFinal.recorded_at || new Date().toISOString(),
      extra_data: existingFinal.extra_data ?? null,
    };

    const mergedProgress = {
      ...existingProgress,
      practice: practiceSection,
      final_challenge: finalSection,
    };

    return prisma.user_node_status.upsert({
      where: { user_id_node_id: { user_id: pupilId, node_id: lessonNodeId } },
      update: {
        is_completed: existingStatus?.is_completed ?? false,
        progress_data: mergedProgress,
        completed_at: existingStatus?.completed_at ?? null,
      },
      create: {
        user_id: pupilId,
        node_id: lessonNodeId,
        is_completed: existingStatus?.is_completed ?? false,
        progress_data: mergedProgress,
        completed_at: existingStatus?.completed_at ?? null,
      },
      select: {
        id: true,
        node_id: true,
        progress_data: true,
        is_completed: true,
        user_id: true,
        completed_at: true,
      },
    });
  }

  /**
   * Get Final Challenge Questions Current Node and Progress of User
   * Returns user_node_status with progress_data for all questions (practice and final)
   * If progress_data doesn't exist, it initializes it with all questions from the lesson node
   */
  async getFinalChallengeQuestionProgress(pupilId: string, lessonNodeId: string) {
    await this.ensurePupilExists(pupilId);

    // Validate lesson exists before creating/updating status
    const lessonNode = await prisma.subject_structure.findUnique({
      where: { id: lessonNodeId },
      select: { id: true, node_type: true },
    });

    if (!lessonNode || lessonNode.node_type !== "lesson") {
      throw new Error("Lesson not found or is not a lesson node");
    }

    return this.ensureNodeStatusWithQuestions(pupilId, lessonNodeId);
  }


  /**
   * Get step data plus the specific pupil's status (unlocked/completed) for that step.
   */
  async getStepDetailsForPupil(pupilId: string, stepId: string) {
    await this.ensurePupilExists(pupilId);

    const base = await this.getStepDetails(stepId);

    const statusRow = await prisma.user_lesson_step_status.findUnique({
      where: { user_id_step_id: { user_id: pupilId, step_id: stepId } },
      select: {
        id: true,
        is_unlocked: true,
        is_completed: true,
        unlocked_at: true,
        completed_at: true,
        extra_data: true,
      },
    });

    return {
      ...base,
      pupil: {
        id: pupilId,
        step_status: statusRow
          ? {
            id: statusRow.id,
            is_unlocked: statusRow.is_unlocked,
            is_completed: statusRow.is_completed,
            unlocked_at: statusRow.unlocked_at,
            completed_at: statusRow.completed_at,
            extra_data: statusRow.extra_data ?? null,
          }
          : {
            id: null,
            is_unlocked: false,
            is_completed: false,
            unlocked_at: null,
            completed_at: null,
            extra_data: null,
          },
      },
    };
  }

  /**
   * Record a practice question attempt for a pupil and update node-level progress.
   * Calculates stars based on attempt number.
   */
  async submitPracticeAttempt(
    pupilId: string,
    questionId: string,
    payload: { is_correct?: boolean; points_earned?: number; response_data?: any }
  ) {
    await this.ensurePupilExists(pupilId);

    // Find question to get its lesson node
    const question = await prisma.lesson_practice_questions.findUnique({
      where: { id: questionId },
      select: { id: true, node_id: true, points: true },
    });

    if (!question) throw new Error("Practice question not found");

    // Compute next attempt number
    const attemptsAgg = await prisma.user_question_attempts.findMany({
      where: { user_id: pupilId, practice_question_id: questionId },
      select: { attempt_number: true },
      orderBy: { attempt_number: "desc" },
      take: 1,
    });

    const nextAttemptNumber =
      attemptsAgg && attemptsAgg.length > 0 ? attemptsAgg[0].attempt_number + 1 : 1;

    const isCorrect =
      typeof payload.is_correct === "boolean" ? payload.is_correct : null;
    const pointsEarned =
      typeof payload.points_earned === "number"
        ? payload.points_earned
        : isCorrect
          ? question.points || 0
          : 0;

    // Calculate stars based on attempt number
    const stars = calculateStars(nextAttemptNumber);

    // Insert attempt (create new row, not upsert)
    const attempt = await prisma.user_question_attempts.create({
      data: {
        user_id: pupilId,
        practice_question_id: questionId,
        attempt_number: nextAttemptNumber,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        response_data: payload.response_data ?? null,
        question_type: "practice",
      },
    });

    // Recompute node-level progress for this lesson node
    const nodeId = question.node_id;

    const allQuestions = await prisma.lesson_practice_questions.findMany({
      where: { node_id: nodeId },
      select: { id: true, points: true },
    });

    const questionIds = allQuestions.map((q: { id: string }) => q.id);

    let totalQuestions = questionIds.length;
    let correctlyAnswered = 0;
    let totalScore = 0;
    let maxStars: 0 | 1 | 2 | 3 = 0;

    let perQuestion: Record<
      string,
      {
        latest_attempt_number: number;
        is_correct: boolean | null;
        points_earned: number | null;
        stars: 0 | 1 | 2 | 3;
        first_correct_attempt?: number | null;
      }
    > = {};

    if (totalQuestions > 0) {
      // For each question, find latest attempt AND first correct attempt
      const attempts = await prisma.user_question_attempts.findMany({
        where: { user_id: pupilId, practice_question_id: { in: questionIds } },
        select: {
          practice_question_id: true,
          attempt_number: true,
          is_correct: true,
          points_earned: true,
        },
        orderBy: { attempt_number: "asc" },
      });

      const latestByQuestion = new Map<
        string,
        {
          latest_attempt_number: number;
          is_correct: boolean | null;
          points_earned: number | null;
        }
      >();

      // Track first correct attempt for star calculation
      const firstCorrectAttempt = new Map<string, number>();

      (attempts || []).forEach((a: { practice_question_id: string; attempt_number: number; is_correct: boolean | null; points_earned: number | null }) => {
        const qId = a.practice_question_id;

        // Track latest attempt
        latestByQuestion.set(qId, {
          latest_attempt_number: a.attempt_number,
          is_correct: a.is_correct,
          points_earned: a.points_earned,
        });

        // Track first correct attempt
        if (a.is_correct && !firstCorrectAttempt.has(qId)) {
          firstCorrectAttempt.set(qId, a.attempt_number);
        }
      });

      latestByQuestion.forEach((val, qId: string) => {
        // Calculate stars based on FIRST correct attempt, not latest
        const firstCorrectAttemptNum = firstCorrectAttempt.get(qId);
        const qStars = (val.is_correct && firstCorrectAttemptNum)
          ? calculateStars(firstCorrectAttemptNum)
          : 0;

        perQuestion[qId] = {
          ...val,
          stars: qStars,
          first_correct_attempt: firstCorrectAttemptNum || null,
        };

        if (val.is_correct) {
          correctlyAnswered += 1;
        }
        if (typeof val.points_earned === "number") {
          totalScore += val.points_earned;
        }
        // Track max stars across all questions
        if (qStars > maxStars) {
          maxStars = qStars;
        }
      });
    }

    const isNodeCompleted = totalQuestions > 0 && correctlyAnswered === totalQuestions;

    // Query existing node status to get current completed_at and progress_data
    const existingNodeStatus = await prisma.user_node_status.findUnique({
      where: { user_id_node_id: { user_id: pupilId, node_id: nodeId } },
      select: { progress_data: true, completed_at: true },
    });

    // Merge with existing progress_data to preserve other sections (final_challenge, etc.)
    const progressData = {
      ...(existingNodeStatus?.progress_data || {}),
      practice: {
        total_questions: totalQuestions,
        correctly_answered: correctlyAnswered,
        total_score: totalScore,
        stars: maxStars,
        questions: perQuestion,
      },
    };

    // Determine completion timestamp: keep existing if already completed, set new if completing now
    const completedAt = isNodeCompleted
      ? existingNodeStatus?.completed_at || new Date().toISOString()
      : existingNodeStatus?.completed_at || null;

    // Upsert to ensure no duplicates - will update if exists, insert if new
    const updated = await prisma.user_node_status.upsert({
      where: { user_id_node_id: { user_id: pupilId, node_id: nodeId } },
      update: {
        is_completed: isNodeCompleted,
        progress_data: progressData,
        completed_at: completedAt,
      },
      create: {
        user_id: pupilId,
        node_id: nodeId,
        is_completed: isNodeCompleted,
        progress_data: progressData,
        completed_at: completedAt,
      },
    });

    return { attempt: { ...attempt, stars }, node_status: updated };
  }

  /**
   * Record final challenge summary for a lesson node and update user_node_status.
   * Calculates stars, checks 70% pass threshold, and unlocks next level if passed.
   */
  async submitFinalChallengeResult(
    pupilId: string,
    lessonNodeId: string,
    payload: {
      results: {
        question_id: string;
        is_correct: boolean;
        points_earned?: number;
        response_data?: any;
      }[];
      is_passed?: boolean;
      score?: number;
      max_score?: number;
      extra_data?: any;
    }
  ) {
    await this.ensurePupilExists(pupilId);

    // Ensure lesson node exists
    const lessonNode = await prisma.subject_structure.findUnique({
      where: { id: lessonNodeId },
      select: { id: true, node_type: true, title: true, parent_id: true, subject_id: true },
    });

    if (!lessonNode) throw new Error("Lesson not found");
    if (lessonNode.node_type !== "lesson") {
      throw new Error("Provided node is not a lesson");
    }

    // Load final challenge questions for this lesson node
    const finalQuestions = await prisma.lesson_final_challenges.findMany({
      where: { node_id: lessonNodeId },
      select: { id: true, points: true },
    });

    const totalFinalQuestions = finalQuestions.length;
    const maxScoreFromQuestions = finalQuestions.reduce(
      (sum: number, q: { points?: number }) => sum + (q.points || 0),
      0
    );

    // Map of valid question IDs for this lesson
    const validQuestionIds = new Set(finalQuestions.map((q: any) => q.id));

    // Normalize results: only keep results for this lesson's final-challenge questions
    const normalizedResults =
      payload.results?.filter((r) => validQuestionIds.has(r.question_id)) || [];

    let totalScoreFromResults = 0;
    let correctlyAnsweredFinal = 0;

    const perQuestionFinal = normalizedResults.map((r) => {
      const questionMeta = finalQuestions.find((q: any) => q.id === r.question_id);
      const defaultPoints = questionMeta?.points || 0;
      const pointsEarned =
        typeof r.points_earned === "number"
          ? r.points_earned
          : r.is_correct
            ? defaultPoints
            : 0;

      if (r.is_correct) correctlyAnsweredFinal += 1;
      totalScoreFromResults += pointsEarned;

      return {
        final_challenge_id: r.question_id,
        is_correct: r.is_correct,
        points_earned: pointsEarned,
        response_data: r.response_data ?? null,
      };
    });

    // Load existing node status
    const existingNodeStatus = await prisma.user_node_status.findUnique({
      where: { user_id_node_id: { user_id: pupilId, node_id: lessonNodeId } },
      select: { id: true, is_completed: true, progress_data: true, completed_at: true },
    });

    const existingProgress = existingNodeStatus?.progress_data || {};

    const effectiveScore =
      typeof payload.score === "number" ? payload.score : totalScoreFromResults;

    const effectiveMaxScore =
      typeof payload.max_score === "number" ? payload.max_score : maxScoreFromQuestions || null;

    // Calculate pass percentage and determine if passed (>= 70%)
    const passPercentage = calculatePercentage(correctlyAnsweredFinal, totalFinalQuestions);
    const effectiveIsPassed =
      typeof payload.is_passed === "boolean"
        ? payload.is_passed
        : isPassed(passPercentage);

    // Calculate stars based on pass threshold and correct answers
    let stars: 0 | 1 | 2 | 3 = 0;
    if (effectiveIsPassed) {
      // If passed, award stars based on percentage
      if (passPercentage >= 90) stars = 3;
      else if (passPercentage >= 80) stars = 2;
      else stars = 1;
    }

    const finalData = {
      is_passed: effectiveIsPassed,
      score: effectiveScore,
      max_score: effectiveMaxScore,
      total_questions: totalFinalQuestions,
      correctly_answered: correctlyAnsweredFinal,
      pass_percentage: passPercentage,
      stars,
      questions: perQuestionFinal,
      extra_data: payload.extra_data ?? null,
      recorded_at: new Date().toISOString(),
    };

    // --- Merge existing + new final challenge results ---
    const existingFinal = existingProgress?.final_challenge || {};
    const existingQuestions = existingFinal?.questions || [];

    // Convert old array to Map for easy merging
    const existingMap = new Map(
      existingQuestions.map((q: any) => [q.final_challenge_id, q])
    );

    // Merge new results (overwrite old for same final_challenge_id)
    perQuestionFinal.forEach((newQ) => {
      existingMap.set(newQ.final_challenge_id, newQ);
    });

    // Final merged array
    const mergedQuestions = Array.from(existingMap.values());

    // Final merged final_challenge object
    const mergedFinalChallenge = {
      ...existingFinal,
      ...finalData,
      questions: mergedQuestions,
    };

    // Final merged progress_data stored in DB
    const mergedProgress = {
      ...existingProgress,
      final_challenge: mergedFinalChallenge,
    };


    const now = new Date().toISOString();
    const shouldMarkCompleted = effectiveIsPassed;

    // Upsert to ensure no duplicates - will update if exists, insert if new
    const nodeStatusResult = await prisma.user_node_status.upsert({
      where: { user_id_node_id: { user_id: pupilId, node_id: lessonNodeId } },
      update: {
        is_completed: shouldMarkCompleted,
        progress_data: mergedProgress,
        completed_at:
          shouldMarkCompleted && !existingNodeStatus?.completed_at ? now : existingNodeStatus?.completed_at || null,
      },
      create: {
        user_id: pupilId,
        node_id: lessonNodeId,
        is_completed: shouldMarkCompleted,
        progress_data: mergedProgress,
        completed_at:
          shouldMarkCompleted && !existingNodeStatus?.completed_at ? now : existingNodeStatus?.completed_at || null,
      },
    });

    // If passed, mark the final_journey lesson step as completed
    let stepStatusResult = null;
    if (shouldMarkCompleted) {
      // Find the final_journey step for this lesson
      const finalJourneyStep = await prisma.lesson_steps.findFirst({
        where: { node_id: lessonNodeId, step_type: "final_journey" as any },
        select: { id: true },
      });

      if (finalJourneyStep) {
        // Upsert user_lesson_step_status for the final_journey step
        stepStatusResult = await prisma.user_lesson_step_status.upsert({
          where: { user_id_step_id: { user_id: pupilId, step_id: finalJourneyStep.id } },
          update: {
            is_unlocked: true,
            is_completed: true,
            completed_at: now,
          },
          create: {
            user_id: pupilId,
            step_id: finalJourneyStep.id,
            is_unlocked: true,
            is_completed: true,
            unlocked_at: now,
            completed_at: now,
          },
        });
      }
    }

    // If passed, attempt to unlock next level
    let nextLevelInfo = null;
    if (shouldMarkCompleted) {
      nextLevelInfo = await this.unlockNextLevel(pupilId, lessonNodeId);
    }

    return {
      node_status: nodeStatusResult,
      final_challenge_data: finalData,
      step_status: stepStatusResult,
      next_level: nextLevelInfo,
    };
  }

  /**
   * Submit an "Integrations" assessment (writing or ordering).
   * Saves the response, marks the lesson completed, and notifies the parent.
   */
  async submitIntegrationAssessment(
    pupilId: string,
    lessonNodeId: string,
    questionId: string,
    payload: {
      response_text?: string;  // For writing assessment
      answer?: any;  // For ordering assessment or other types
      response_data?: Record<string, any>;
    }
  ) {
    await this.ensurePupilExists(pupilId);

    const lessonNode = await prisma.subject_structure.findUnique({
      where: { id: lessonNodeId },
      select: { id: true, node_type: true, title: true, parent_id: true, subject_id: true, payload: true },
    });

    let finalChallenge = await prisma.lesson_final_challenges.findUnique({
      where: { id: questionId, node_id: lessonNodeId }
    })

    if (!finalChallenge) throw new Error("Final Challenge not found");

    const challengeData = typeof finalChallenge.challenge_json === 'string'
      ? JSON.parse(finalChallenge.challenge_json)
      : finalChallenge.challenge_json;

    const integrationMeta = this.extractIntegrationMeta(challengeData.payload);
    if (!integrationMeta) {
      throw new Error("This lesson is not configured as an Integrations assessment");
    }

    const integrationType = integrationMeta.integration_type || 'writing';
    let isCorrect = false;
    let responseData: any = {};
    let wordCount = 0;
    let characterCount = 0;

    if (integrationType === 'writing') {
      // Writing assessment validation
      const responseText = (payload?.response_text || "").trim();

      wordCount = responseText.split(/\s+/).filter(Boolean).length;
      characterCount = responseText.length;
      isCorrect = true; // Writing assessments are manually graded, mark as submitted

      responseData = {
        response_text: responseText,
        word_count: wordCount,
        character_count: characterCount,
        lines_required: challengeData.writing_task.length,
        rubric_points: integrationMeta?.rubric_points || [],
      };
    } else if (integrationType === 'ordering') {
      // Ordering assessment validation
      if (!payload?.answer) {
        throw new Error('Answer is required for ordering assessment');
      }

      const correctOrder = challengeData.ordering_task?.correct_order ||
        challengeData.answer ||
        [];

      // Validate ordering answer
      const userOrder = Array.isArray(payload.answer) ? payload.answer : [];
      isCorrect = JSON.stringify(userOrder) === JSON.stringify(correctOrder);

      responseData = {
        user_order: userOrder,
        correct_order: correctOrder,
        is_correct: isCorrect,
        items_count: correctOrder.length,
      };
    } else {
      throw new Error(`Unsupported integration type: ${integrationType}`);
    }


    // Get integration points from the challenge
    const integrationPoints = challengeData.points || 10;

    // Insert attempt record for auditability
    const prevAttempts = await prisma.user_question_attempts.count({
      where: { user_id: pupilId, final_challenge_id: finalChallenge.id },
    });
    const attemptNumber = prevAttempts + 1;

    await prisma.user_question_attempts.create({
      data: {
        user_id: pupilId,
        final_challenge_id: finalChallenge.id,
        attempt_number: attemptNumber,
        is_correct: isCorrect,
        points_earned: isCorrect ? integrationPoints : 0,
        response_data: {
          ...responseData,
          type: integrationType,
          submitted_at: new Date().toISOString(),
        },
        question_type: "final",
      },
    });

    // Load existing node status to merge
    const existingNodeStatus = await prisma.user_node_status.findUnique({
      where: { user_id_node_id: { user_id: pupilId, node_id: lessonNodeId } },
      select: { progress_data: true, is_completed: true, completed_at: true },
    });

    const finalChallengeProgress = {
      is_passed: isCorrect,
      total_questions: 1,
      correctly_answered: isCorrect ? 1 : 0,
      pass_percentage: isCorrect ? 100 : 0,
      stars: isCorrect ? 3 : 0, // Award 3 stars only if correct
      total_score: isCorrect ? integrationPoints : 0,
      questions: [
        {
          final_challenge_id: finalChallenge.id,
          is_correct: isCorrect,
          points_earned: isCorrect ? integrationPoints : 0,
          response_data: responseData,
          latest_attempt_number: attemptNumber,
        },
      ],
      recorded_at: new Date().toISOString(),
      extra_data: { type: `integration_${integrationType}` },
    };

    const mergedProgress = {
      ...(existingNodeStatus?.progress_data || {}),
      integration_assessment: {
        ...integrationMeta,
        type: integrationType,
        ...responseData,
        points_earned: isCorrect ? integrationPoints : 0,
        is_correct: isCorrect,
        submitted_at: new Date().toISOString(),
      },
      final_challenge: {
        ...(existingNodeStatus?.progress_data?.final_challenge || {}),
        ...finalChallengeProgress,
      },
    };

    const now = new Date().toISOString();
    const nodeStatusResult = await prisma.user_node_status.upsert({
      where: { user_id_node_id: { user_id: pupilId, node_id: lessonNodeId } },
      update: {
        is_completed: true,
        progress_data: mergedProgress,
        completed_at: existingNodeStatus?.completed_at || now,
      },
      create: {
        user_id: pupilId,
        node_id: lessonNodeId,
        is_completed: true,
        progress_data: mergedProgress,
        completed_at: now,
      },
    });

    // Mark final_journey step as completed
    const finalJourneyStep = await prisma.lesson_steps.findFirst({
      where: { node_id: lessonNodeId, step_type: "final_journey" as any },
      select: { id: true },
    });

    let stepStatusResult = null;
    if (finalJourneyStep) {
      stepStatusResult = await prisma.user_lesson_step_status.upsert({
        where: { user_id_step_id: { user_id: pupilId, step_id: finalJourneyStep.id } },
        update: {
          is_unlocked: true,
          is_completed: true,
          completed_at: now,
        },
        create: {
          user_id: pupilId,
          step_id: finalJourneyStep.id,
          is_unlocked: true,
          is_completed: true,
          unlocked_at: now,
          completed_at: now,
        },
      });
    }

    // Unlock next level if applicable
    const nextLevelInfo = await this.unlockNextLevel(pupilId, lessonNodeId);

    // Notify parent
    await this.notifyParentOfIntegrationCompletion(
      pupilId,
      lessonNode,
      questionId,
      integrationMeta,
      {
        word_count: wordCount,
        character_count: characterCount,
        is_correct: isCorrect
      },
      integrationType
    );



    return {
      question_id: questionId,
      question_type: integrationType === "ordering" ? "ordering_assessment" : integrationType === "writing" ? "writing_assessment" : integrationType,
      is_correct: isCorrect,
      points_earned: isCorrect ? integrationPoints : 0,
      stars_earned: isCorrect ? 3 : 0,
      node_status: nodeStatusResult,
      step_status: stepStatusResult || undefined,
      next_level: nextLevelInfo || undefined,
      integration_assessment: mergedProgress.integration_assessment,
      response_data: responseData,
    };
  }

  /**
   * Find and unlock the next level in the hierarchy after lesson completion
   */
  private async unlockNextLevel(
    pupilId: string,
    completedLessonNodeId: string
  ) {
    try {
      // Get the lesson's parent (unit)
      const lessonNode = await prisma.subject_structure.findUnique({
        where: { id: completedLessonNodeId },
        select: { id: true, parent_id: true },
      });
      if (!lessonNode) return null;

      // Get the unit's parent (level)
      const unitNode = await prisma.subject_structure.findUnique({
        where: { id: lessonNode.parent_id as string },
        select: { id: true, parent_id: true },
      });
      if (!unitNode) return null;

      // Get siblings of the level (other levels) to find the next one
      const levelNodes = await prisma.subject_structure.findMany({
        where: { parent_id: unitNode.parent_id, node_type: "level" as any },
        select: { id: true, title: true, order_index: true, parent_id: true },
        orderBy: { order_index: "asc" },
      });
      if (!levelNodes || levelNodes.length === 0) return null;

      // Find current level's position
      const currentLevelIndex = levelNodes.findIndex((l: any) => l.parent_id === unitNode.parent_id);
      const nextLevel = levelNodes[currentLevelIndex + 1];

      if (!nextLevel) return null; // No more levels

      // Get the first unit of the next level
      const nextLevelUnits = await prisma.subject_structure.findMany({
        where: { parent_id: nextLevel.id, node_type: "unit" as any },
        select: { id: true, title: true, order_index: true },
        orderBy: { order_index: "asc" },
        take: 1,
      });

      if (!nextLevelUnits || nextLevelUnits.length === 0) return null;

      const firstUnit = nextLevelUnits[0];

      // Get the first lesson of that unit
      const lessons = await prisma.subject_structure.findMany({
        where: { parent_id: firstUnit.id, node_type: "lesson" as any },
        select: { id: true, title: true },
        orderBy: { order_index: "asc" },
        take: 1,
      });

      if (!lessons || lessons.length === 0) return null;

      const firstLesson = lessons[0];

      // Get the first step of that lesson (lesson_intro)
      const firstStep = await prisma.lesson_steps.findFirst({
        where: { node_id: firstLesson.id, step_type: "lesson_intro" as any },
        select: { id: true },
      });

      if (!firstStep) return null;

      // Unlock the first step
      const now = new Date().toISOString();
      await prisma.user_lesson_step_status.upsert({
        where: { user_id_step_id: { user_id: pupilId, step_id: firstStep.id } },
        update: {
          is_unlocked: true,
          is_completed: false,
          unlocked_at: now,
        },
        create: {
          user_id: pupilId,
          step_id: firstStep.id,
          is_unlocked: true,
          is_completed: false,
          unlocked_at: now,
        },
      });

      return {
        level_id: nextLevel.id,
        level_title: nextLevel.title,
        unit_id: firstUnit.id,
        lesson_id: firstLesson.id,
        first_step_id: firstStep.id,
      };
    } catch (err) {
      console.error("Error unlocking next level:", err);
      return null;
    }
  }
  /**
   * Get practice card status for a lesson - returns progress with stars and difficulty breakdown
   */
  async getPracticeCardStatus(pupilId: string, lessonNodeId: string) {
    await this.ensurePupilExists(pupilId);

    // Get lesson
    const lessonNode = await prisma.subject_structure.findUnique({
      where: { id: lessonNodeId },
      select: { id: true, node_type: true },
    });

    if (!lessonNode || lessonNode.node_type !== "lesson") {
      throw new Error("Lesson not found or is not a lesson node");
    }

    // Ensure node status is initialized with question placeholders
    const nodeStatus = await this.ensureNodeStatusWithQuestions(pupilId, lessonNodeId);

    // Get the practice_questions step
    const stepData = await prisma.lesson_steps.findFirst({
      where: { node_id: lessonNodeId, step_type: "practice_questions" as any },
      select: { id: true },
    });

    // Get all practice questions with difficulty
    const allQuestions = await prisma.lesson_practice_questions.findMany({
      where: { node_id: lessonNodeId },
      select: { id: true, difficulty: true, points: true },
    });

    // Group by difficulty
    const byDifficulty = {
      easy: allQuestions.filter((q: any) => q.difficulty === 'easy'),
      medium: allQuestions.filter((q: any) => q.difficulty === 'medium'),
      hard: allQuestions.filter((q: any) => q.difficulty === 'hard'),
    };

    // Calculate progress per difficulty
    const practiceProgress = nodeStatus?.progress_data?.practice || {
      total_questions: 0,
      correctly_answered: 0,
      total_score: 0,
      stars: 0,
      questions: {},
    };

    const questionProgress = practiceProgress.questions || {};

    const difficultyStats = {
      easy: {
        total: byDifficulty.easy.length,
        answered: byDifficulty.easy.filter((q: any) => questionProgress[q.id]?.is_correct).length,
      },
      medium: {
        total: byDifficulty.medium.length,
        answered: byDifficulty.medium.filter((q: any) => questionProgress[q.id]?.is_correct).length,
      },
      hard: {
        total: byDifficulty.hard.length,
        answered: byDifficulty.hard.filter((q: any) => questionProgress[q.id]?.is_correct).length,
      },
    };

    return {
      step_id: stepData?.id || null,
      lesson_id: lessonNodeId,
      ...practiceProgress,
      difficulty_breakdown: difficultyStats,
      completed: false, // Practice questions are never "completed", always available
    };
  }

  /**
   * Get final challenge status for a lesson - returns challenge progress with stars, pass/fail data, and difficulty breakdown
   */
  async getFinalChallengeStatus(pupilId: string, lessonNodeId: string) {
    await this.ensurePupilExists(pupilId);

    // Get lesson
    const lessonNode = await prisma.subject_structure.findUnique({
      where: { id: lessonNodeId },
      select: { id: true, node_type: true },
    });

    if (!lessonNode || lessonNode.node_type !== "lesson") {
      throw new Error("Lesson not found or is not a lesson node");
    }

    // Ensure node status is initialized with question placeholders
    const nodeStatus = await this.ensureNodeStatusWithQuestions(pupilId, lessonNodeId);

    // Get the final_journey step
    const stepData = await prisma.lesson_steps.findFirst({
      where: { node_id: lessonNodeId, step_type: "final_journey" as any },
      select: { id: true },
    });

    // Get all final challenges with difficulty
    const allChallenges = await prisma.lesson_final_challenges.findMany({
      where: { node_id: lessonNodeId },
      select: { id: true, difficulty: true, points: true },
    });

    // Group by difficulty
    const byDifficulty = {
      easy: allChallenges.filter((q: any) => q.difficulty === 'easy'),
      medium: allChallenges.filter((q: any) => q.difficulty === 'medium'),
      hard: allChallenges.filter((q: any) => q.difficulty === 'hard'),
    };

    const finalChallengeProgress = nodeStatus?.progress_data?.final_challenge || {
      is_passed: false,
      score: 0,
      max_score: 0,
      total_questions: 0,
      correctly_answered: 0,
      pass_percentage: 0,
      stars: 0,
      questions: {},
    };

    // Calculate progress per difficulty
    const challengeQuestions = Array.isArray(finalChallengeProgress.questions)
      ? finalChallengeProgress.questions
      : Object.values(finalChallengeProgress.questions || {});

    const answeredMap = new Map(
      challengeQuestions.map((q: any) => [q.final_challenge_id, q.is_correct])
    );

    const difficultyStats = {
      easy: {
        total: byDifficulty.easy.length,
        answered: byDifficulty.easy.filter((q: any) => answeredMap.get(q.id) === true).length,
      },
      medium: {
        total: byDifficulty.medium.length,
        answered: byDifficulty.medium.filter((q: any) => answeredMap.get(q.id) === true).length,
      },
      hard: {
        total: byDifficulty.hard.length,
        answered: byDifficulty.hard.filter((q: any) => answeredMap.get(q.id) === true).length,
      },
    };

    return {
      step_id: stepData?.id || null,
      lesson_id: lessonNodeId,
      ...finalChallengeProgress,
      difficulty_breakdown: difficultyStats,
      completed: nodeStatus?.is_completed || false,
    };
  }

  /**
   * Get comprehensive progress for a subject for a specific pupil
   * Returns overall progress with stars, completed lessons, total lessons, and completion percentage
   */
  async getSubjectProgress(pupilId: string, subjectId: string) {
    await this.ensurePupilExists(pupilId);
    await this.ensureSubjectExists(subjectId);

    const pupil = await prisma.pupils.findUnique({
      where: { id: pupilId },
      select: { current_year_id: true },
    });

    const academicYearId = pupil?.current_year_id || null;

    const allNodes = await prisma.subject_structure.findMany({
      where: { subject_id: subjectId },
      select: { id: true, node_type: true },
    });

    const lessonNodeIds = (allNodes || [])
      .filter((n: { node_type: string }) => n.node_type === "lesson")
      .map((n: { id: string }) => n.id);

    const totalLessons = lessonNodeIds.length;

    if (totalLessons === 0) {
      return {
        subject_id: subjectId,
        total_lessons: 0,
        completed_lessons: 0,
        completion_percentage: 0,
        total_stars: 0,
        average_stars: 0,
        lessons_progress: [],
        has_started: false,
        badges: [],
        unstarted_subjects: [],
      };
    }

    const userBadges = await prisma.user_milestone_badges.findMany({
      where: { user_id: pupilId },
      select: {
        id: true,
        badge_name: true,
        badge_icon_url: true,
        level_id: true,
        awarded_at: true,
        description: true,
      },
    });

    const subjectBadges = userBadges.filter((badge: typeof userBadges[number]) => {
      return allNodes.some((node: { id: string }) => node.id === badge.level_id);
    });

    const initializedStatuses = await Promise.all(
      lessonNodeIds.map(async (lessonId: string) => {
        const status = await this.ensureNodeStatusWithQuestions(pupilId, lessonId);
        return { lessonId, status };
      })
    );

    const nodeStatusMap = new Map<string, any>();
    initializedStatuses.forEach(({ lessonId, status }: { lessonId: string; status: any }) => {
      if (status) {
        nodeStatusMap.set(lessonId, status);
      }
    });

    const lessonDetails = await prisma.subject_structure.findMany({
      where: { id: { in: lessonNodeIds } },
      select: { id: true, title: true, order_index: true },
      orderBy: { order_index: "asc" },
    });

    const hasAnyProgress = nodeStatusMap.size > 0;

    let totalStars = 0;
    let completedLessons = 0;
    let currentLessonIndex = 0;
    let totalPointsEarned = 0;
    let maxPossiblePoints = 0;
    const lessonsProgress: any[] = [];

    // Calculate max possible points for all lessons (including integration units)
    const allLessonsWithPoints = await Promise.all(
      lessonNodeIds.map(async (lessonId: string) => {
        const [practiceQuestions, finalChallenges] = await Promise.all([
          prisma.lesson_practice_questions.findMany({
            where: { node_id: lessonId },
            select: { points: true },
          }),
          prisma.lesson_final_challenges.findMany({
            where: { node_id: lessonId },
            select: { points: true },
          }),
        ]);

        const maxPractice = practiceQuestions.reduce((sum: number, q: any) => sum + (q.points || 0), 0);
        const maxFinal = finalChallenges.reduce((sum: number, q: any) => sum + (q.points || 0), 0);

        return {
          lessonId,
          maxPoints: maxPractice + maxFinal,
        };
      })
    );

    const maxPointsMap = new Map(allLessonsWithPoints.map(l => [l.lessonId, l.maxPoints]));

    (lessonDetails || []).forEach((lesson: { id: string; title: string }, index: number) => {
      const status = nodeStatusMap.get(lesson.id);
      const isCompleted = status?.is_completed || false;
      const progressData = status?.progress_data || {};

      // Get stars (highest between practice and final challenge)
      const practiceStars = progressData.practice?.stars || 0;
      const finalStars = progressData.final_challenge?.stars || 0;
      const stars = Math.min(Math.max(practiceStars, finalStars), 3);

      // Calculate points earned from this lesson (practice + final + integration)
      const practicePoints = progressData.practice?.total_score || 0;
      const finalPoints = progressData.final_challenge?.total_score || 0;
      const integrationPoints = progressData.integration_assessment?.points_earned || 0;

      // let starsEarned = 0;
      //
      // progressData.practice.questions.forEach((q: any) => {
      //   // console.log(q.stars, "== q stars");
      //   starsEarned += q.stars
      // });
      // progressData.final_challenge.questions.forEach((q: any) => {
      //   // console.log(q.stars, "== q stars final");
      //   starsEarned += q.starsEarned
      // });

      const lessonPointsEarned = practicePoints + finalPoints + integrationPoints;

      // Get max possible for this lesson
      const lessonMaxPoints = maxPointsMap.get(lesson.id) || 0;

      if (isCompleted) {
        completedLessons += 1;
        totalStars += stars;
      }

      // Always add to total points (even if not completed)
      totalPointsEarned += lessonPointsEarned;
      maxPossiblePoints += lessonMaxPoints;

      let isCurrent: boolean;
      let isLocked: boolean;

      if (!hasAnyProgress) {
        isCurrent = index === 0;
        isLocked = index > 0;
      } else {
        if (!isCompleted && currentLessonIndex === 0) {
          isCurrent = true;
          currentLessonIndex = index;
        } else {
          isCurrent = false;
        }
        isLocked = !isCompleted && index > currentLessonIndex;
      }

      lessonsProgress.push({
        lesson_id: lesson.id,
        lesson_title: lesson.title,
        is_completed: isCompleted,
        is_current: isCurrent,
        is_locked: isLocked,
        stars: stars,
        points_earned: lessonPointsEarned,
        max_points: lessonMaxPoints,
        practice_progress: progressData.practice || null,
        final_challenge_progress: progressData.final_challenge || null,
        integration_progress: progressData.integration_assessment || null,
      });
    });

    const completionPercentage = (completedLessons / totalLessons) * 100;
    const averageStars = completedLessons > 0 ? totalStars / completedLessons : 0;
    const pointsPercentage = maxPossiblePoints > 0 ? (totalPointsEarned / maxPossiblePoints) * 100 : 0;

    let unstartedSubjects: Array<{ id: string; name: string; code: string | null }> = [];

    if (academicYearId) {
      const assignedSubjects = await prisma.subjects.findMany({
        where: { academic_year_id: academicYearId },
        select: { id: true, name: true, code: true },
      });

      const assignedIds = assignedSubjects.map((s: { id: string }) => s.id);

      if (assignedIds.length > 0) {
        const progressedNodeStatuses = await prisma.user_node_status.findMany({
          where: {
            user_id: pupilId,
            subject_structure: {
              subject_id: { in: assignedIds },
            },
          },
          select: {
            subject_structure: {
              select: { subject_id: true },
            },
          },
        });

        const startedSubjectIds = new Set(
          progressedNodeStatuses
            .map(
              (row: { subject_structure: { subject_id: string | null } | null }) =>
                row.subject_structure?.subject_id || null
            )
            .filter((id: string | null): id is string => !!id)
        );

        unstartedSubjects = assignedSubjects.filter(
          (s: { id: string }) => !startedSubjectIds.has(s.id)
        );
      }
    }

    return {
      subject_id: subjectId,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      completion_percentage: Math.round(completionPercentage * 100) / 100,
      total_stars: totalStars,
      average_stars: Math.round(averageStars * 100) / 100,
      points: {
        earned: totalPointsEarned,
        max_possible: maxPossiblePoints,
        percentage: Math.round(pointsPercentage * 100) / 100,
      },
      lessons_progress: lessonsProgress,
      has_started: hasAnyProgress,
      badges: subjectBadges.map((badge: typeof subjectBadges[number]) => ({
        badge_id: badge.id,
        badge_name: badge.badge_name,
        badge_icon_url: badge.badge_icon_url,
        level_id: badge.level_id,
        awarded_at: badge.awarded_at,
        description: badge.description,
      })),
      unstarted_subjects: unstartedSubjects,
    };
  }

  /**
   * Renew attempts for a question or all questions in a lesson
   * Removes all attempt records from user_question_attempts table
   * Resets progress data in user_node_status
   *
   * @param pupilId - The pupil/user ID
   * @param questionId - (Optional) Specific question ID to reset. If not provided, resets all questions in the lesson
   * @param lessonId - The lesson node ID (required)
   * @param type - 'practice' or 'final' (optional, if not specified, resets both)
   * @returns Object with reset status and updated node progress
   */
  async renewQuestionAttempts(
    pupilId: string,
    lessonId: string,
    questionId?: string,
    type?: "practice" | "final"
  ) {
    await this.ensurePupilExists(pupilId);

    // Validate lessonId exists
    const lesson = await prisma.subject_structure.findUnique({
      where: { id: lessonId },
      select: { id: true, node_type: true },
    });

    if (!lesson) {
      throw new Error("Lesson not found");
    }

    if (lesson.node_type !== "lesson") {
      throw new Error("Invalid lesson node - must be of type 'lesson'");
    }

    let deletedCount = 0;

    if (questionId) {
      let isPracticeQuestion = false;
      const practiceQuestion = await prisma.lesson_practice_questions.findFirst({
        where: { id: questionId, node_id: lessonId },
        select: { id: true, node_id: true },
      });

      if (practiceQuestion) {
        isPracticeQuestion = true;
      } else {
        const finalQuestion = await prisma.lesson_final_challenges.findFirst({
          where: { id: questionId, node_id: lessonId },
          select: { id: true, node_id: true },
        });

        if (!finalQuestion) {
          throw new Error("Question not found in this lesson");
        }
      }

      // Delete attempts for this specific question
      const result = await prisma.user_question_attempts.deleteMany({
        where: {
          user_id: pupilId,
          ...(isPracticeQuestion
            ? { practice_question_id: questionId }
            : { final_challenge_id: questionId }),
        },
      });
      deletedCount = result.count;
    } else {
      const filterTypes = type ? [type] : ["practice", "final"];

      for (const qType of filterTypes) {
        if (qType === "practice") {
          const practiceQuestions = await prisma.lesson_practice_questions.findMany({
            where: { node_id: lessonId },
            select: { id: true },
          });

          if (practiceQuestions && practiceQuestions.length > 0) {
            const questionIds = practiceQuestions.map((q: { id: string }) => q.id);
            const result = await prisma.user_question_attempts.deleteMany({
              where: { user_id: pupilId, practice_question_id: { in: questionIds } },
            });
            deletedCount += result.count;
          }
        } else {
          const finalQuestions = await prisma.lesson_final_challenges.findMany({
            where: { node_id: lessonId },
            select: { id: true },
          });

          if (finalQuestions && finalQuestions.length > 0) {
            const questionIds = finalQuestions.map((q: { id: string }) => q.id);
            const result = await prisma.user_question_attempts.deleteMany({
              where: { user_id: pupilId, final_challenge_id: { in: questionIds } },
            });
            deletedCount += result.count;
          }
        }
      }
    }

    const currentNodeStatus = await prisma.user_node_status.findUnique({
      where: { user_id_node_id: { user_id: pupilId, node_id: lessonId } },
      select: { id: true, progress_data: true, is_completed: true, completed_at: true },
    });

    let updatedProgress = currentNodeStatus?.progress_data || {};

    if (questionId) {
      const practiceQuestion = await prisma.lesson_practice_questions.findUnique({
        where: { id: questionId },
        select: { id: true },
      });

      if (practiceQuestion && updatedProgress.practice) {
        const practiceQuestions = updatedProgress.practice.questions || {};
        if (practiceQuestions[questionId]) {
          practiceQuestions[questionId] = {
            latest_attempt_number: 0,
            is_correct: null,
            points_earned: null,
            stars: 0,
          };
        }
        updatedProgress.practice.questions = practiceQuestions;

        let correctCount = 0;
        let totalScore = 0;
        let maxStars: 0 | 1 | 2 | 3 = 0;

        Object.values(practiceQuestions).forEach((q: any) => {
          if (q.is_correct === true) correctCount += 1;
          if (typeof q.points_earned === "number") totalScore += q.points_earned;
          if (typeof q.stars === "number" && q.stars > maxStars) maxStars = q.stars;
        });

        updatedProgress.practice.correctly_answered = correctCount;
        updatedProgress.practice.total_score = totalScore;
        updatedProgress.practice.stars = maxStars;
      } else if (!practiceQuestion && updatedProgress.final_challenge) {
        const finalQuestions = updatedProgress.final_challenge.questions || [];
        const targetQuestionIndex = finalQuestions.findIndex(
          (q: any) => q.final_challenge_id === questionId
        );

        if (targetQuestionIndex !== -1) {
          finalQuestions[targetQuestionIndex] = {
            final_challenge_id: questionId,
            latest_attempt_number: 0,
            is_correct: null,
            points_earned: null,
            stars: 0,
          };
        }
        updatedProgress.final_challenge.questions = finalQuestions;

        let correctCount = 0;
        let totalScore = 0;
        let maxStars: 0 | 1 | 2 | 3 = 0;

        finalQuestions.forEach((q: any) => {
          if (q.is_correct === true) correctCount += 1;
          if (typeof q.points_earned === "number") totalScore += q.points_earned;
          if (typeof q.stars === "number" && q.stars > maxStars) maxStars = q.stars;
        });

        const passPercentage = calculatePercentage(
          correctCount,
          updatedProgress.final_challenge.total_questions || 0
        );

        updatedProgress.final_challenge.correctly_answered = correctCount;
        updatedProgress.final_challenge.total_score = totalScore;
        updatedProgress.final_challenge.stars = maxStars;
        updatedProgress.final_challenge.pass_percentage = passPercentage;
        updatedProgress.final_challenge.is_passed = isPassed(passPercentage);
      }
    } else if (type === "practice" || !type) {
      if (updatedProgress.practice) {
        const practiceQuestions = updatedProgress.practice.questions || {};
        const totalQuestions = updatedProgress.practice.total_questions || 0;

        Object.keys(practiceQuestions).forEach((qId) => {
          practiceQuestions[qId] = {
            latest_attempt_number: 0,
            is_correct: null,
            points_earned: null,
            stars: 0,
          };
        });

        updatedProgress.practice = {
          total_questions: totalQuestions,
          correctly_answered: 0,
          total_score: 0,
          stars: 0,
          questions: practiceQuestions,
        };
      }
    }

    if (type === "final" || !type) {
      if (updatedProgress.final_challenge) {
        const finalQuestions = updatedProgress.final_challenge.questions || [];
        const totalQuestions = updatedProgress.final_challenge.total_questions || 0;

        // Reset all questions to default values
        const resetQuestions = finalQuestions.map((q: any) => ({
          final_challenge_id: q.final_challenge_id,
          latest_attempt_number: 0,
          is_correct: null,
          points_earned: null,
          stars: 0,
        }));

        updatedProgress.final_challenge = {
          is_passed: false,
          total_questions: totalQuestions,
          correctly_answered: 0,
          pass_percentage: 0,
          stars: 0,
          total_score: 0,
          questions: resetQuestions,
          recorded_at: new Date().toISOString(),
        };
      }
    }

    // Update node status - reset completion if necessary
    const shouldBeCompleted = false; // After renewal, lesson is not complete
    const updatedNodeStatus = await prisma.user_node_status.upsert({
      where: { user_id_node_id: { user_id: pupilId, node_id: lessonId } },
      update: {
        is_completed: shouldBeCompleted,
        progress_data: updatedProgress,
        completed_at: null,
      },
      create: {
        user_id: pupilId,
        node_id: lessonId,
        is_completed: shouldBeCompleted,
        progress_data: updatedProgress,
        completed_at: null,
      },
    });

    return {
      message: "Attempts renewed successfully",
      lesson_id: lessonId,
      question_id: questionId || "all",
      type: type || "both",
      attempts_deleted: deletedCount,
      updated_progress: updatedProgress,
      node_status: updatedNodeStatus,
    };
  }

  /**
   * Fetches integration assessment data for a lesson.
   *
   * This service:
   * - Validates that the given node is a lesson
   * - Determines whether the lesson is an integration lesson using payload metadata
   * - Retrieves integration assessment configuration (prompt, instructions, rubric)
   * - Fetches the associated final challenge and the pupil’s latest submission
   * - Returns lesson metadata along with pupil progress and completion status
   *
   * This method is read-only and does not mutate any lesson or progress state.
   * It is designed to be symmetrical with the integration submission service.
   *
   * @param pupilId - ID of the pupil requesting the integration lesson
   * @param lessonNodeId - ID of the lesson node
   * @returns Integration lesson metadata and pupil progress
   */

  /**
   * Get questions for a lesson grouped by difficulty
   * Can filter by question type (practice/final) and specific difficulty level
   */
  async getQuestionsByDifficulty(
    lessonId: string,
    type?: "practice" | "final",
    difficulty?: "easy" | "medium" | "hard"
  ) {
    const lesson = await prisma.subject_structure.findUnique({
      where: { id: lessonId },
      select: { id: true, node_type: true, title: true },
    });

    if (!lesson || lesson.node_type !== "lesson") {
      throw new Error("Lesson not found or invalid node type");
    }

    const result: any = {
      lesson_id: lessonId,
      lesson_title: lesson.title,
    };

    // Get practice questions if requested or no type specified
    if (!type || type === "practice") {
      const practiceQuestions = await prisma.lesson_practice_questions.findMany({
        where: {
          node_id: lessonId,
          ...(difficulty ? { difficulty: difficulty } : {})
        },
        select: {
          id: true,
          question_json: true,
          points: true,
          order_index: true,
          difficulty: true
        },
        orderBy: { order_index: "asc" },
      });

      if (difficulty) {
        // Return specific difficulty only
        result.practice_questions = practiceQuestions;
      } else {
        // Return grouped by difficulty
        result.practice_questions = this.groupQuestionsByDifficulty(practiceQuestions);
      }
    }

    // Get final challenges if requested or no type specified
    if (!type || type === "final") {
      const finalChallenges = await prisma.lesson_final_challenges.findMany({
        where: {
          node_id: lessonId,
          ...(difficulty ? { difficulty: difficulty } : {})
        },
        select: {
          id: true,
          challenge_json: true,
          points: true,
          difficulty: true,
          question_id: true,
          order_index: true
        },
        orderBy: { question_id: "asc" },
      });

      if (difficulty) {
        // Return specific difficulty only
        result.final_challenges = finalChallenges;
      } else {
        // Return grouped by difficulty
        result.final_challenges = this.groupQuestionsByDifficulty(finalChallenges);
      }
    }

    return result;
  }

  async getIntegrationLessonData(
    pupilId: string,
    lessonNodeId: string,
  ) {
    await this.ensurePupilExists(pupilId);

    const lessonNode = await prisma.subject_structure.findUnique({
      where: { id: lessonNodeId },
      select: {
        id: true,
        node_type: true,
        title: true,
        payload: true,
      },
    });

    if (!lessonNode) {
      throw new Error("Lesson not found");
    }

    if (lessonNode.node_type !== "lesson") {
      throw new Error("Provided node is not a lesson");
    }

    console.log("lesson node is ", lessonNode)
    const integrationMeta = this.extractIntegrationMeta(lessonNode.payload);
    if (!integrationMeta) {
      throw new Error("This lesson is not an Integrations assessment");
    }

    console.log("integration meta is ", integrationMeta)

    const finalChallenge = await prisma.lesson_final_challenges.findFirst({
      where: { node_id: lessonNodeId },
      select: {
        id: true,
        points: true,
        user_question_attempts: {
          where: { user_id: pupilId },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    });

    const nodeStatus = await prisma.user_node_status.findUnique({
      where: {
        user_id_node_id: {
          user_id: pupilId,
          node_id: lessonNodeId,
        },
      },
      select: {
        is_completed: true,
        completed_at: true,
        progress_data: true,
      },
    });

    const lastAttempt = finalChallenge?.user_question_attempts?.[0];

    return {
      lesson: {
        id: lessonNode.id,
        title: lessonNode.title,
        is_integration_lesson: true,
      },

      integration_assessment: {
        prompt: integrationMeta.prompt,
        instructions: integrationMeta.instructions,
        rubric_points: integrationMeta.rubric_points,
        min_characters: integrationMeta.min_characters,
        expected_word_count: integrationMeta.expected_word_count,
      },

      final_challenge: finalChallenge
        ? {
          id: finalChallenge.id,
          points: finalChallenge.points,
        }
        : null,

      pupil_progress: {
        is_completed: nodeStatus?.is_completed ?? false,
        completed_at: nodeStatus?.completed_at ?? null,
        last_submission: lastAttempt
          ? {
            response_text: lastAttempt.response_data?.response_text ?? null,
            word_count: lastAttempt.response_data?.word_count ?? null,
            character_count: lastAttempt.response_data?.character_count ?? null,
            submitted_at: lastAttempt.created_at,
          }
          : null,
      },
    };
  }

  /**
   * Get a single question by ID with its details and user's attempt history
   * Returns question in the same format as getQuestionsByDifficulty
   * Supports both practice questions and final challenges
   */
  async getQuestionById(
    pupilId: string,
    questionId: string,
    includeAttempts: boolean = false
  ) {
    await this.ensurePupilExists(pupilId);

    // Try to find as practice question first
    const practiceQuestion = await prisma.lesson_practice_questions.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        node_id: true,
        question_json: true,
        points: true,
        difficulty: true,
        order_index: true,
        created_at: true,
      }
    });

    let isPracticeQuestion = false;
    let question: any = practiceQuestion;

    // If not practice question, try final challenge
    if (!question) {
      const finalChallenge = await prisma.lesson_final_challenges.findUnique({
        where: { id: questionId },
        select: {
          id: true,
          node_id: true,
          challenge_json: true,
          points: true,
          difficulty: true,
          order_index: true,
          created_at: true,
          question_id: true
        }
      });

      if (!finalChallenge) {
        throw new Error("Question not found");
      }

      question = finalChallenge;
      isPracticeQuestion = false;
    } else {
      isPracticeQuestion = true;
    }

    // Parse question JSON - EXACT same format as getQuestionsByDifficulty
    let questionData: any = {};
    try {
      const jsonField = isPracticeQuestion
        ? (practiceQuestion?.question_json as any)
        : (question?.challenge_json as any);

      questionData = typeof jsonField === 'string'
        ? JSON.parse(jsonField)
        : jsonField || {};
    } catch (e) {
      console.error('Failed to parse question JSON:', e);
      questionData = {};
    }

    // Get lesson info for context (optional, can be removed if not needed)
    const lessonNode = await prisma.subject_structure.findUnique({
      where: { id: question.node_id },
      select: {
        id: true,
        title: true,
        node_type: true,
        subject_id: true,
        payload: true
      }
    });

    // Get user's attempts for this question
    let attempts: any[] = [];
    let latestAttempt: any = null;
    let attemptsLeft = 3;
    const maxAttemptsAllowed = 3;

    if (includeAttempts) {
      attempts = await prisma.user_question_attempts.findMany({
        where: {
          user_id: pupilId,
          ...(isPracticeQuestion
            ? { practice_question_id: questionId }
            : { final_challenge_id: questionId })
        },
        select: {
          id: true,
          attempt_number: true,
          is_correct: true,
          points_earned: true,
          response_data: true,
          created_at: true,
          question_type: true
        },
        orderBy: { attempt_number: "asc" }
      });

      latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
      attemptsLeft = Math.max(0, maxAttemptsAllowed - attempts.length);
    }

    // Calculate stars earned based on FIRST correct attempt
    let starsEarned = 0;
    let firstCorrectAttempt: any = null;

    if (attempts.length > 0) {
      const correctAttempts = attempts.filter(a => a.is_correct === true);
      if (correctAttempts.length > 0) {
        firstCorrectAttempt = correctAttempts[0];
        starsEarned = calculateStars(firstCorrectAttempt.attempt_number);
      }
    }

    // Determine if question is answered correctly
    const isCorrect = latestAttempt?.is_correct === true;

    // Check if this is an integration lesson
    const isIntegrationLesson = this.extractIntegrationMeta(lessonNode?.payload as any) !== null;

    // ============= RETURN IN EXACT SAME FORMAT AS getQuestionsByDifficulty =============

    // Base question object - matches the structure from getQuestionsByDifficulty
    const baseQuestion = {
      id: question.id,
      ...(isPracticeQuestion
        ? { question_json: questionData }
        : { challenge_json: questionData }),
      points: question.points || 0,
      difficulty: question.difficulty || 'medium',
      order_index: question.order_index,
      ...(isPracticeQuestion ? {} : { question_id: question.question_id })
    };

    // If includeAttempts is false, return ONLY the question data (no attempts, no lesson info)
    if (!includeAttempts) {
      return baseQuestion;
    }

    // With attempts, return question data + user progress
    return {
      ...baseQuestion,
      user_progress: {
        is_correct: isCorrect,
        stars_earned: starsEarned,
        points_earned: latestAttempt?.points_earned || 0,
        current_attempt: attempts.length + 1,
        attempts_left: attemptsLeft,
        max_attempts: maxAttemptsAllowed,
        first_correct_attempt: firstCorrectAttempt?.attempt_number || null,
        last_attempted_at: latestAttempt?.created_at || null,
        attempts: attempts.map(a => ({
          attempt_number: a.attempt_number,
          is_correct: a.is_correct,
          points_earned: a.points_earned,
          submitted_at: a.created_at,
          response_data: a.response_data
        }))
      }
    };
  }

}


export const journeyService = new JourneyService();

