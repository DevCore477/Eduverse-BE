import prisma from "../config/prisma";

/**
 * Calculate stars based on attempt number (3-attempt star system)
 * Attempt 1 → 3 stars
 * Attempt 2 → 2 stars
 * Attempt 3 → 1 star
 * Attempt 4+ → 0 stars
 */
export function calculateStars(attemptNumber: number): 0 | 1 | 2 | 3 {
  if (attemptNumber <= 1) return 3;
  if (attemptNumber === 2) return 2;
  if (attemptNumber === 3) return 1;
  return 0;
}

/**
 * Calculate passed percentage
 */
export function calculatePercentage(correct: number, total: number): number {
  if (total === 0) return 0;
  return (correct / total) * 100;
}

/**
 * Check if learner passed the final challenge (>= 70%)
 */
export function isPassed(percentage: number, threshold: number = 70): boolean {
  return percentage >= threshold;
}

export function isValidVideoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  // Check if it's a valid http/https URL and not a placeholder
  const isValidFormat = /^(http|https):\/\/[^\s]+/.test(url);
  const isPlaceholder = /placeholder|pending|dummy|test|sample|example|temp|temporary|mock|fake|invalid|coming-?soon|unavailable|missing/i.test(url);

  return isValidFormat && !isPlaceholder;
}

/**
 * Check if level is complete and award milestone badge if so
 * Returns badge info if awarded, null otherwise
 */
export async function checkAndAwardMilestoneBadge(
  pupilId: string,
  lessonNodeId: string
): Promise<any | null> {
  try {
    // Get the lesson node to find its parent level
    const lessonNode = await prisma.subject_structure.findUnique({
      where: { id: lessonNodeId },
      select: { id: true, parent_id: true, subject_id: true, title: true },
    });
    if (!lessonNode) return null;

    // Ensure the lesson has all four steps configured
    const lessonSteps = await prisma.lesson_steps.findMany({
      where: {
        node_id: lessonNodeId,
        step_type: { not: "practice_questions" as any }, // Exclude practice cards if needed
      },
      select: { id: true, step_type: true },
    });
    if (!lessonSteps || lessonSteps.length !== 3) return null;
    const lessonStepIds = lessonSteps.map((s: { id: string }) => s.id);

    // Ensure user has entries for all steps; missing ones are created as incomplete
    const stepStatuses = await prisma.user_lesson_step_status.findMany({
      where: { user_id: pupilId, step_id: { in: lessonStepIds } },
      select: { step_id: true, is_completed: true },
    });

    const existingStepMap = new Map<string, { step_id: string; is_completed: boolean }>(
      stepStatuses.map((s: { step_id: string; is_completed: boolean }) => [s.step_id, s])
    );
    const missingStepIds = lessonStepIds.filter((id: string) => !existingStepMap.has(id));

    if (missingStepIds.length) {
      const now = new Date();
      await Promise.all(
        missingStepIds.map((stepId: string) =>
          prisma.user_lesson_step_status.upsert({
            where: { user_id_step_id: { user_id: pupilId, step_id: stepId } },
            update: {},
            create: {
              user_id: pupilId,
              step_id: stepId,
              is_unlocked: false,
              is_completed: false,
              unlocked_at: null,
              completed_at: null,
              created_at: now,
            },
          })
        )
      );
    }

    const allStepsCompleted =
      lessonStepIds.length > 0 &&
      lessonStepIds.every((stepId: string) => {
        const status = existingStepMap.get(stepId);
        return status?.is_completed === true;
      });
    console.log("allStepsCompleted", allStepsCompleted);
    if (!allStepsCompleted) return null;

    // Ensure all final challenge questions exist and were answered correctly
    const finalQuestions = await prisma.lesson_final_challenges.findMany({
      where: { node_id: lessonNodeId },
      select: { id: true, points: true },
    });
    const finalQuestionIds = finalQuestions.map((q: { id: string }) => q.id);
    console.log("finalQuestionIds", finalQuestionIds);
    // Pull node status for detailed progress data
    const lessonStatus = await prisma.user_node_status.findUnique({
      where: { user_id_node_id: { user_id: pupilId, node_id: lessonNodeId } },
      select: { progress_data: true, is_completed: true, completed_at: true },
    });

    const progressQuestionsRaw =
      lessonStatus?.progress_data?.final_challenge?.questions || [];
    const progressQuestions = Array.isArray(progressQuestionsRaw)
      ? progressQuestionsRaw
      : Object.values(progressQuestionsRaw || {});

    const progressQuestionsMap = new Map<string, any>(
      progressQuestions.map((q: any) => [q.final_challenge_id, q])
    );

    // Fetch attempts once to backfill missing progress and check correctness
    const attempts = await prisma.user_question_attempts.findMany({
      where: { user_id: pupilId, final_challenge_id: { in: finalQuestionIds } },
      select: {
        final_challenge_id: true,
        attempt_number: true,
        is_correct: true,
        points_earned: true,
      },
      orderBy: { attempt_number: "asc" },
    });

    const latestAttemptByQuestion = new Map<
      string,
      { attempt_number: number; is_correct: boolean; points_earned: number | null }
    >();
    (attempts || []).forEach((a: { final_challenge_id: string | null; attempt_number: number; is_correct: boolean | null; points_earned: number | null }) => {
      if (!a.final_challenge_id) return;
      const prev = latestAttemptByQuestion.get(a.final_challenge_id);
      if (!prev || a.attempt_number >= prev.attempt_number) {
        latestAttemptByQuestion.set(a.final_challenge_id, {
          attempt_number: a.attempt_number,
          is_correct: a.is_correct === true,
          points_earned: a.points_earned ?? null,
        });
      }
    });

    const finalQuestionMeta = new Map<string, { id: string; points: number }>(
      (finalQuestions || []).map((q: any) => [q.id, q])
    );

    // Build merged questions list, backfilling any missing entries in progress_data
    const mergedQuestions = finalQuestionIds.map((qId: string) => {
      const existing = progressQuestionsMap.get(qId) || {};
      const attempt = latestAttemptByQuestion.get(qId);
      const meta = finalQuestionMeta.get(qId);
      const isCorrect = existing.is_correct === true || attempt?.is_correct === true;
      const pointsEarned =
        existing.points_earned ??
        (typeof attempt?.points_earned === "number"
          ? attempt.points_earned
          : isCorrect
            ? meta?.points || 0
            : 0);

      return {
        final_challenge_id: qId,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        latest_attempt_number: attempt?.attempt_number ?? existing.latest_attempt_number ?? null,
      };
    });

    // If progress_data is missing questions, write them back for consistency
    const progressMissing = mergedQuestions.length !== progressQuestions.length ||
      mergedQuestions.some((q: { final_challenge_id: string }) => !progressQuestionsMap.has(q.final_challenge_id));

    if (progressMissing) {
      const mergedProgress = {
        ...(lessonStatus?.progress_data || {}),
        final_challenge: {
          ...(lessonStatus?.progress_data?.final_challenge || {}),
          questions: mergedQuestions,
        },
      };

      await prisma.user_node_status.upsert({
        where: { user_id_node_id: { user_id: pupilId, node_id: lessonNodeId } },
        update: {
          progress_data: mergedProgress,
          is_completed: lessonStatus?.is_completed ?? false,
          completed_at: lessonStatus?.completed_at ?? null,
        },
        create: {
          user_id: pupilId,
          node_id: lessonNodeId,
          progress_data: mergedProgress,
          is_completed: lessonStatus?.is_completed ?? false,
          completed_at: lessonStatus?.completed_at ?? null,
        },
      });
    }

    const allFinalCorrect = mergedQuestions.every((q: { is_correct: boolean }) => q.is_correct === true);
    if (!allFinalCorrect) return null;

    // Get the unit (parent of lesson)
    const unitNode = await prisma.subject_structure.findUnique({
      where: { id: lessonNode.parent_id ?? lessonNode.id },
      select: { id: true, parent_id: true },
    });
    if (!unitNode) return null;
    // Get the level (parent of unit)
    const levelNode = await prisma.subject_structure.findUnique({
      where: { id: unitNode.parent_id ?? unitNode.id },
      select: { id: true },
    });
    if (!levelNode) return null;

    // Check if badge already awarded for this level
    const existingBadge = await prisma.user_milestone_badges.findFirst({
      where: { user_id: pupilId, level_id: levelNode.id },
      select: { id: true },
    });
    if (existingBadge) return null; // Badge already awarded

    // Award badge
    const badgeName = `${lessonNode.title} Master`;
    const now = new Date().toISOString();

    const badge = await prisma.user_milestone_badges.create({
      data: {
        user_id: pupilId,
        level_id: levelNode.id,
        badge_name: badgeName,
        badge_icon_url: null,
        awarded_at: now,
        description: `Completed all exercises in ${lessonNode.title}`,
      },
    });

    return {
      badge_id: badge?.id,
      badge_name: badge?.badge_name,
      badge_icon_url: badge?.badge_icon_url,
      level_id: levelNode.id,
      level_title: lessonNode.title,
      awarded_at: badge?.awarded_at,
      description: badge?.description,
    };
  } catch (err) {
    console.error("Error awarding milestone badge:", err);
    return null;
  }
}


