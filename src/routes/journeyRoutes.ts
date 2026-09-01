import { Router } from "express";
import { journeyController } from "../controllers/journeyController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Journeys
 *   description: Learning journey and progress tracking
 */

/**
 * @swagger
 * /journeys/subjects:
 *   get:
 *     summary: Get all subjects with their journey type
 *     tags: [Journeys]
 *     responses:
 *       200:
 *         description: List of subjects
 */
router.get("/subjects", journeyController.getSubjects);

/**
 * @swagger
 * /journeys/pupils/{pupilId}/subjects:
 *   get:
 *     summary: Get the full list of subjects for a given pupil
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of Subjects of the pupil
 */
router.get(
  "/pupils/:pupilId/subjects",
  journeyController.getPupilSubjects
);

/**
 * @swagger
 * /journeys/pupils/{pupilId}/subjects/{subjectId}/journey-map:
 *   get:
 *     summary: Get the full journey map for a subject for a given pupil
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Journey map with first-view flag and progress
 */
router.get(
  "/pupils/:pupilId/subjects/:subjectId/journey-map",
  journeyController.getSubjectJourneyMap
);

/**
 * @swagger
 * /journeys/pupils/{pupilId}/lessons/{lessonId}/cards:
 *   get:
 *     summary: Get the 4-card journey state for a lesson for a given pupil
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 4-step journey cards with lock/unlock and completion states
 */
router.get(
  "/pupils/:pupilId/lessons/:lessonId/cards",
  journeyController.getLessonCards
);

/**
 * @swagger
 * /journeys/pupils/{pupilId}/steps/{stepId}/complete:
 *   post:
 *     summary: Mark a lesson step as completed for a pupil, enforcing unlock rules
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Step marked as completed
 */
router.post(
  "/pupils/:pupilId/steps/:stepId/complete",
  journeyController.completeStep
);

/**
 * @swagger
 * /journeys/pupils/{pupilId}/steps/{stepId}:
 *   get:
 *     summary: Get full data for a specific lesson step for a given pupil (including status)
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Step details and the pupil's unlock/completion status
 */
router.get(
  "/pupils/:pupilId/steps/:stepId",
  journeyController.getStepDetailsForPupil
);

/**
 * @swagger
 * /journeys/steps/{stepId}:
 *   get:
 *     summary: Get full data for a specific lesson step (intro, video, practice, or final)
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Step details including media and question/challenge content
 */
router.get("/steps/:stepId", journeyController.getStepDetails);


/**
 * @swagger
 * /journeys/pupils/{pupilId}/practice-question/{questionId}/attempts:
 *   get:
 *     summary: Get full Information of Practice attempts
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User Practice Attempts Information
 */
router.get("/pupils/:pupilId/practice-question/:questionId/attempts", journeyController.getPracticeQuestionProgress);


/**
 * @swagger
 * /journeys/pupils/{pupilId}/lessons/{lessonId}/progress:
 *   get:
 *     summary: Get full Information of User Progress for questions with detailed final challenge data
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User Progress for Practice/Final Questions with detailed final challenge info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 progress_data:
 *                   type: object
 *                   properties:
 *                     practice:
 *                       type: object
 *                     final_challenge:
 *                       type: object
 *                       properties:
 *                         total_questions:
 *                           type: integer
 *                         correctly_answered:
 *                           type: integer
 *                         stars:
 *                           type: integer
 *                         questions:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               lesson_id:
 *                                 type: string
 *                               question_id:
 *                                 type: string
 *                               question_type:
 *                                 type: string
 *                                 example: "final_challenge"
 *                               difficulty:
 *                                 type: string
 *                                 enum: [easy, medium, hard]
 *                               isCorrect:
 *                                 type: boolean
 *                               correctAnswer:
 *                                 description: The correct answer
 *                               yourAnswer:
 *                                 description: The user's answer
 *                               starsEarned:
 *                                 type: integer
 *                                 enum: [0, 1, 2, 3]
 *                               pointsEarned:
 *                                 type: integer
 *                               currentAttempt:
 *                                 type: integer
 *                               attemptsLeft:
 *                                 type: integer
 *                               maxAttemptsAllowed:
 *                                 type: integer
 *                                 example: 3
 */
router.get("/pupils/:pupilId/lessons/:lessonId/progress", journeyController.getFinalChallengeQuestionProgress);




/**
 * @swagger
 * /journeys/pupils/{pupilId}/practice-questions/{questionId}/attempts:
 *   post:
 *     summary: Record a practice question attempt for a pupil
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_correct:
 *                 type: boolean
 *               points_earned:
 *                 type: integer
 *               response_data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Practice attempt recorded and node progress updated
 */
router.post(
  "/pupils/:pupilId/practice-questions/:questionId/attempts",
  journeyController.submitPracticeAttempt
);

/**
 * @swagger
 * /journeys/pupils/{pupilId}/lessons/{lessonId}/final-challenge:
 *   post:
 *     summary: Record final challenge result for a lesson node for a pupil
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               results:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - question_id
 *                     - is_correct
 *                   properties:
 *                     question_id:
 *                       type: string
 *                     is_correct:
 *                       type: boolean
 *                     points_earned:
 *                       type: number
 *                     response_data:
 *                       type: object
 *               is_passed:
 *                 type: boolean
 *               score:
 *                 type: number
 *               max_score:
 *                 type: number
 *               extra_data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Final challenge result recorded and node status updated
 */
router.post(
  "/pupils/:pupilId/lessons/:lessonId/final-challenge",
  journeyController.submitFinalChallenge
);


/**
 * @swagger
 * /journeys/pupils/{pupilId}/lessons/{lessonId}/integration-assessment:
 *   get:
 *     summary: Get integration lesson assessment data
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *       - in: path
 *         name: lessonId
 *         required: true
 *     responses:
 *       200:
 *         description: Integration lesson data
 *       404:
 *         description: Lesson not found
 */
router.get(
  "/pupils/:pupilId/lessons/:lessonId/integration-assessment",
  journeyController.getIntegrationAssessment
);


/**
 * @swagger
 * /journeys/pupils/{pupilId}/lessons/{lessonId}/integration-assessment/{questionId}:
 *   post:
 *     summary: Submit Integration assessment (writing or ordering) and mark lesson complete
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [writing, ordering]
 *                 description: Type of integration assessment
 *               response_text:
 *                 type: string
 *                 description: Full writing response (for writing assessment)
 *               answer:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Ordered array of items (for ordering assessment)
 *               response_data:
 *                 type: object
 *                 description: Additional response metadata
 *           examples:
 *             writing:
 *               value:
 *                 type: writing
 *                 response_text: "My comprehensive response about the topic..."
 *             ordering:
 *               value:
 *                 type: ordering
 *                 answer: ["Concept 1", "Concept 2", "Concept 3", "Concept 4"]
 *     responses:
 *       201:
 *         description: Integration assessment submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 integration_type:
 *                   type: string
 *                   enum: [writing, ordering]
 *                 is_correct:
 *                   type: boolean
 *                 points_earned:
 *                   type: number
 *                 stars_earned:
 *                   type: number
 *       400:
 *         description: Validation error
 */
router.post(
  "/pupils/:pupilId/lessons/:lessonId/integration-assessment/:questionId",
  journeyController.submitIntegrationAssessment
);

/**
 * @swagger
 * /journeys/pupils/{pupilId}/lessons/{lessonId}/practice-card-status:
 *   get:
 *     summary: Get practice card status with stars and progress
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Practice card status with stars, questions answered, and progress
 */
router.get(
  "/pupils/:pupilId/lessons/:lessonId/practice-card-status",
  journeyController.getPracticeCardStatus
);

/**
 * @swagger
 * /journeys/pupils/{pupilId}/lessons/{lessonId}/final-challenge-status:
 *   get:
 *     summary: Get final challenge status with stars, pass/fail, and percentage
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Final challenge status with pass/fail, stars, percentage, and completion flag
 */
router.get(
  "/pupils/:pupilId/lessons/:lessonId/final-challenge-status",
  journeyController.getFinalChallengeStatus
);

/**
 * @swagger
 * /journeys/pupils/{pupilId}/subjects/{subjectId}/progress:
 *   get:
 *     summary: Get comprehensive subject progress for a pupil with stars, completed lessons, and detailed final challenge data
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subject progress including total lessons, completed lessons, stars earned, average stars, and per-lesson progress details with detailed final challenge info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subject_id:
 *                   type: string
 *                 total_lessons:
 *                   type: integer
 *                 completed_lessons:
 *                   type: integer
 *                 completion_percentage:
 *                   type: number
 *                 total_stars:
 *                   type: integer
 *                 average_stars:
 *                   type: number
 *                 lessons_progress:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       lesson_id:
 *                         type: string
 *                       lesson_title:
 *                         type: string
 *                       is_completed:
 *                         type: boolean
 *                       stars:
 *                         type: integer
 *                       final_challenge_progress:
 *                         type: object
 *                         properties:
 *                           total_questions:
 *                             type: integer
 *                           correctly_answered:
 *                             type: integer
 *                           stars:
 *                             type: integer
 *                           questions:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 lesson_id:
 *                                   type: string
 *                                 question_id:
 *                                   type: string
 *                                 question_type:
 *                                   type: string
 *                                   example: "final_challenge"
 *                                 difficulty:
 *                                   type: string
 *                                   enum: [easy, medium, hard]
 *                                 isCorrect:
 *                                   type: boolean
 *                                 correctAnswer:
 *                                   description: The correct answer
 *                                 yourAnswer:
 *                                   description: The user's answer
 *                                 starsEarned:
 *                                   type: integer
 *                                   enum: [0, 1, 2, 3]
 *                                 pointsEarned:
 *                                   type: integer
 *                                 currentAttempt:
 *                                   type: integer
 *                                 attemptsLeft:
 *                                   type: integer
 *                                 maxAttemptsAllowed:
 *                                   type: integer
 *                                   example: 3
 */
router.get(
  "/pupils/:pupilId/subjects/:subjectId/progress",
  journeyController.getSubjectProgress
);

/**
 * @swagger
 * /journeys/pupils/{pupilId}/questions/{questionId}/submit:
 *   post:
 *     summary: Submit question answer with server-authoritative validation and immediate feedback
 *     description: Unified endpoint for both practice and final challenge questions. Returns immediate feedback including correctness, stars earned, attempts left, and milestone badge if earned.
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the question (practice or final challenge)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answer
 *             properties:
 *               answer:
 *                 description: The answer to the question (string, number, boolean, or object)
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *                   - type: boolean
 *                   - type: object
 *               response_data:
 *                 type: object
 *                 description: Additional response metadata
 *           example:
 *             answer: "Paris"
 *             response_data:
 *               answered_at: "2025-12-08T10:30:00Z"
 *     responses:
 *       200:
 *         description: Immediate feedback with correctness, stars, attempts, and badge info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 question_id:
 *                   type: string
 *                   example: "q_123"
 *                 isCorrect:
 *                   type: boolean
 *                   example: true
 *                 correctAnswer:
 *                   description: The correct answer
 *                   oneOf:
 *                     - type: string
 *                     - type: number
 *                     - type: boolean
 *                     - type: object
 *                   example: "Paris"
 *                 yourAnswer:
 *                   description: The submitted answer
 *                   oneOf:
 *                     - type: string
 *                     - type: number
 *                     - type: boolean
 *                     - type: object
 *                   example: "Paris"
 *                 starsEarned:
 *                   type: integer
 *                   enum: [0, 1, 2, 3]
 *                   description: "3=first attempt, 2=second attempt, 1=third attempt, 0=fourth+ attempt"
 *                   example: 3
 *                 currentAttempt:
 *                   type: integer
 *                   example: 1
 *                 attemptsLeft:
 *                   type: integer
 *                   example: 3
 *                 maxAttemptsAllowed:
 *                   type: integer
 *                   example: 4
 *                 badgeAwarded:
 *                   type: boolean
 *                   example: false
 *                 badge:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     badge_id:
 *                       type: string
 *                     badge_name:
 *                       type: string
 *                       example: "Level 1 Master"
 *                     badge_icon_url:
 *                       type: string
 *                       nullable: true
 *                     level_id:
 *                       type: string
 *                     level_title:
 *                       type: string
 *                       example: "Beginner"
 *                     awarded_at:
 *                       type: string
 *                       format: date-time
 *                     description:
 *                       type: string
 *                 feedback:
 *                   type: string
 *                   example: "Excellent! Perfect on first try!"
 *                 message:
 *                   type: string
 *                   example: "Correct! You earned 3 stars!"
 *       400:
 *         description: Bad request (invalid answer, max attempts exceeded, question not found, etc.)
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/pupils/:pupilId/questions/:questionId/submit",
  journeyController.submitQuestion
);

/**
 * @swagger
 * /journeys/lessons/{lessonId}/questions-by-difficulty:
 *   get:
 *     summary: Get questions for a lesson grouped by difficulty (easy, medium, hard)
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [practice, final]
 *         description: Question type filter (practice or final). If not specified, returns both
 *       - in: query
 *         name: difficulty
 *         required: false
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *         description: Specific difficulty level. If specified, returns only that difficulty
 *     responses:
 *       200:
 *         description: Questions grouped by difficulty
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lesson_id:
 *                   type: string
 *                 lesson_title:
 *                   type: string
 *                 practice_questions:
 *                   type: object
 *                   properties:
 *                     easy:
 *                       type: array
 *                       items:
 *                         type: object
 *                     medium:
 *                       type: array
 *                       items:
 *                         type: object
 *                     hard:
 *                       type: array
 *                       items:
 *                         type: object
 *                 final_challenges:
 *                   type: object
 *                   properties:
 *                     easy:
 *                       type: array
 *                     medium:
 *                       type: array
 *                     hard:
 *                       type: array
 */
router.get(
  "/lessons/:lessonId/questions-by-difficulty",
  journeyController.getQuestionsByDifficulty
);

/**
 * @swagger
 * /journeys/pupils/{pupilId}/lessons/{lessonId}/renew-attempts:
 *   post:
 *     summary: Renew/reset attempts for practice or final challenge questions
 *     description: Removes all attempt records and resets progress data for a lesson or specific question. Can target practice questions, final challenge questions, or both.
 *     tags: [Journeys]
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: questionId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional - specific question ID to reset. If not provided, resets all questions in the lesson
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [practice, final]
 *         description: Optional - question type to reset. Can be 'practice' or 'final'. If not provided, resets both types
 *     responses:
 *       200:
 *         description: Attempts renewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Attempts renewed successfully"
 *                 lesson_id:
 *                   type: string
 *                 question_id:
 *                   type: string
 *                   example: "all"
 *                 type:
 *                   type: string
 *                   enum: [practice, final, both]
 *                   example: "both"
 *                 attempts_deleted:
 *                   type: integer
 *                   description: Number of attempt records deleted
 *                   example: 5
 *                 updated_progress:
 *                   type: object
 *                   description: Updated progress data for the node
 *                 node_status:
 *                   type: object
 *                   description: Updated node status after renewal
 *       400:
 *         description: Bad request (invalid parameters, lesson/question not found, etc.)
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/pupils/:pupilId/lessons/:lessonId/renew-attempts",
  journeyController.renewAttempts
);


/**
 * @swagger
 * /journeys/pupils/{pupilId}/questions/{questionId}:
 *   get:
 *     summary: Get a single question by ID with user's attempt history
 *     description: |
 *       Retrieves a question (practice or final challenge) with its details and the pupil's attempt history.
 *       
 *       - Works for both practice questions and final challenges
 *       - Returns question content, lesson info, and user progress
 *       - Does NOT return the correct answer to the client (security)
 *       - Attempt history includes attempt numbers, correctness, points earned
 *       
 *       The correct answer is NEVER sent to the client. Answer validation happens server-side
 *       via the submit endpoint. This endpoint only returns question content and user progress.
 *     tags: [Journeys]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pupilId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the pupil
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the question (practice question or final challenge)
 *         example: "550e8400-e29b-41d4-a716-446655441111"
 *       - in: query
 *         name: includeAttempts
 *         required: false
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Whether to include attempt history (set to false to reduce payload size)
 *         example: true
 *     responses:
 *       200:
 *         description: Question retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     question:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "550e8400-e29b-41d4-a716-446655441111"
 *                         type:
 *                           type: string
 *                           enum: [practice, final_challenge]
 *                           example: "practice"
 *                         difficulty:
 *                           type: string
 *                           enum: [easy, medium, hard]
 *                           example: "medium"
 *                         points:
 *                           type: integer
 *                           example: 3
 *                         question_text:
 *                           type: string
 *                           example: "What is the capital of France?"
 *                         instructions:
 *                           type: string
 *                           nullable: true
 *                           example: "Select the correct answer from the options below"
 *                         options:
 *                           type: array
 *                           nullable: true
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               text:
 *                                 type: string
 *                           example: [
 *                             {"id": "a", "text": "London"},
 *                             {"id": "b", "text": "Paris"},
 *                             {"id": "c", "text": "Berlin"}
 *                           ]
 *                         is_integration_lesson:
 *                           type: boolean
 *                           example: false
 *                         integration_type:
 *                           type: string
 *                           nullable: true
 *                           enum: [writing, ordering]
 *                         image_url:
 *                           type: string
 *                           nullable: true
 *                         audio_url:
 *                           type: string
 *                           nullable: true
 *                         video_url:
 *                           type: string
 *                           nullable: true
 *                         has_correct_answer:
 *                           type: boolean
 *                           description: Indicates if the question has a correct answer (for validation)
 *                           example: true
 *                         answer_type:
 *                           type: string
 *                           example: "string"
 *                     lesson:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         node_type:
 *                           type: string
 *                         subject_id:
 *                           type: string
 *                         subject:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             code:
 *                               type: string
 *                     attempts:
 *                       type: object
 *                       properties:
 *                         total_attempts:
 *                           type: integer
 *                           example: 1
 *                         attempts_left:
 *                           type: integer
 *                           example: 2
 *                         max_attempts:
 *                           type: integer
 *                           example: 3
 *                         latest_attempt:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             attempt_number:
 *                               type: integer
 *                               example: 1
 *                             is_correct:
 *                               type: boolean
 *                               example: true
 *                             points_earned:
 *                               type: integer
 *                               example: 3
 *                             submitted_at:
 *                               type: string
 *                               format: date-time
 *                         history:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               attempt_number:
 *                                 type: integer
 *                               is_correct:
 *                                 type: boolean
 *                               points_earned:
 *                                 type: integer
 *                               submitted_at:
 *                                 type: string
 *                                 format: date-time
 *                     user_progress:
 *                       type: object
 *                       properties:
 *                         is_correct:
 *                           type: boolean
 *                           example: true
 *                         stars_earned:
 *                           type: integer
 *                           enum: [0, 1, 2, 3]
 *                           example: 3
 *                         points_earned:
 *                           type: integer
 *                           example: 3
 *                         first_correct_attempt:
 *                           type: integer
 *                           nullable: true
 *                           example: 1
 *                         last_attempted_at:
 *                           type: string
 *                           nullable: true
 *                           format: date-time
 *                     progress:
 *                       type: object
 *                       properties:
 *                         is_lesson_completed:
 *                           type: boolean
 *                           example: false
 *                         lesson_completed_at:
 *                           type: string
 *                           nullable: true
 *                           format: date-time
 *                 message:
 *                   type: string
 *                   example: "Question retrieved successfully"
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *       400:
 *         description: Bad request (missing parameters)
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       404:
 *         description: Question not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/pupils/:pupilId/questions/:questionId",
  journeyController.getQuestionById
);

export default router;

