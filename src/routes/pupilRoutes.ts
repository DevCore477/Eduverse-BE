import { Router } from "express";
import { pupilController } from "../controllers/pupilController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Pupils
 *   description: Pupil management endpoints
 */

/**
 * @swagger
 * /pupils:
 *   post:
 *     summary: Create a new pupil
 *     tags: [Pupils]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parent_id
 *               - first_name
 *               - last_name
 *             properties:
 *               parent_id:
 *                 type: string
 *                 format: uuid
 *                 example: "a3f1e8c0-1234-5678-abcd-9876543210ef"
 *               first_name:
 *                 type: string
 *                 example: "John"
 *               last_name:
 *                 type: string
 *                 example: "Doe"
 *               age:
 *                 type: integer
 *                 example: 10
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *                 example: "male"
 *               avatar_url:
 *                 type: string
 *                 example: "https://example.com/avatar.jpg"
 *               pin_code:
 *                 type: string
 *                 example: "1234"
 *               current_year_id:
 *                 type: string
 *                 format: uuid
 *                 example: "b1c2d3e4-5678-1234-abcd-9876543210ff"
 *     responses:
 *       201:
 *         description: Pupil created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 parent_id:
 *                   type: string
 *                   format: uuid
 *                 first_name:
 *                   type: string
 *                 last_name:
 *                   type: string
 *                 age:
 *                   type: integer
 *                 gender:
 *                   type: string
 *                 avatar_url:
 *                   type: string
 *                 pin_code:
 *                   type: string
 *                 current_year_id:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation or creation error
 */
router.post("/", pupilController.create);

/**
 * @swagger
 * /pupils/{id}:
 *   patch:
 *     summary: Update an existing pupil
 *     tags: [Pupils]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Pupil ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: "Jane"
 *               last_name:
 *                 type: string
 *                 example: "Doe"
 *               age:
 *                 type: integer
 *                 example: 11
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *                 example: "female"
 *               avatar_url:
 *                 type: string
 *                 example: "https://example.com/avatar2.jpg"
 *               pin_code:
 *                 type: string
 *                 example: "5678"
 *               current_year_id:
 *                 type: string
 *                 format: uuid
 *                 example: "c1d2e3f4-5678-1234-abcd-9876543210aa"
 *     responses:
 *       200:
 *         description: Pupil updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 parent_id:
 *                   type: string
 *                   format: uuid
 *                 first_name:
 *                   type: string
 *                 last_name:
 *                   type: string
 *                 age:
 *                   type: integer
 *                 gender:
 *                   type: string
 *                 avatar_url:
 *                   type: string
 *                 pin_code:
 *                   type: string
 *                 current_year_id:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation or update error
 */
router.patch("/:id", pupilController.update);

/**
 * @swagger
 * /pupils/{id}/dashboard:
 *   get:
 *     summary: Get dashboard stats for a pupil (levels, stars, badges)
 *     tags: [Pupils]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Pupil ID
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved
 *       400:
 *         description: Invalid request
 */
router.get("/:id/dashboard", pupilController.getDashboard);

/**
 * @swagger
 * /pupils:
 *   get:
 *     summary: Get all pupils (optionally filtered by parent ID)
 *     tags: [Pupils]
 *     parameters:
 *       - in: query
 *         name: parent_id
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter pupils by parent ID
 *     responses:
 *       200:
 *         description: List of pupils
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   parent_id:
 *                     type: string
 *                     format: uuid
 *                   first_name:
 *                     type: string
 *                   last_name:
 *                     type: string
 *                   age:
 *                     type: integer
 *                   gender:
 *                     type: string
 *                   avatar_url:
 *                     type: string
 *                   pin_code:
 *                     type: string
 *                   current_year_id:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 */
router.get("/", pupilController.getAll);

/**
 * @swagger
 * /pupils/{id}:
 *   get:
 *     summary: Get a single pupil by ID
 *     tags: [Pupils]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Pupil ID
 *     responses:
 *       200:
 *         description: Pupil details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 parent_id:
 *                   type: string
 *                   format: uuid
 *                 first_name:
 *                   type: string
 *                 last_name:
 *                   type: string
 *                 age:
 *                   type: integer
 *                 gender:
 *                   type: string
 *                 avatar_url:
 *                   type: string
 *                 pin_code:
 *                   type: string
 *                 current_year_id:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Pupil not found
 */
router.get("/:id", pupilController.getOne);

/**
 * @swagger
 * /pupils/by-pin:
 *   post:
 *     summary: Get all pupils for a parent after verifying PIN
 *     tags: [Pupils]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parent_id
 *               - pin
 *             properties:
 *               parent_id:
 *                 type: string
 *                 example: "uuid-of-parent"
 *               pin:
 *                 type: string
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: List of pupils retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   first_name:
 *                     type: string
 *                   last_name:
 *                     type: string
 *                   age:
 *                     type: integer
 *                   gender:
 *                     type: string
 *                   avatar_url:
 *                     type: string
 *                   pin_code:
 *                     type: string
 *                   current_year_id:
 *                     type: string
 *                   parent_id:
 *                     type: string
 *                   created_at:
 *                     type: string
 *       400:
 *         description: Invalid PIN or request error
 */
router.post("/by-pin", pupilController.getPupilsByPin);


/**
 * @swagger
 * /pupils/weekly-performance:
 *   post:
 *     summary: Test weekly performance notifications (Development only)
 *     description: Sends weekly progress report notifications to pupils. In production, this runs automatically on Mondays via cron job.
 *     tags: [Pupils]
 *     parameters:
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *           default: false
 *         required: false
 *         description: Force run even if today is not Monday (for testing)
 *         example: true
 *     responses:
 *       200:
 *         description: Weekly performance test completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Weekly performance test completed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     checked:
 *                       type: integer
 *                       description: Number of active pupils checked
 *                       example: 25
 *                     notifications_sent:
 *                       type: integer
 *                       description: Number of notifications actually sent
 *                       example: 18
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-02-13T10:30:00.000Z"
 *                 note:
 *                   type: string
 *                   example: "Forced Monday mode - notifications sent regardless of actual day"
 */
router.post(
    '/weekly-performance',
    pupilController.testWeeklyPerformance
);

/**
 * @swagger
 * /pupils/stalled-lessons:
 *   post:
 *     summary: Test stalled lessons notifications (30-minute reminder) (Development only)
 *     description: Sends reminders for lessons where the last activity was 30+ minutes ago and the lesson is still incomplete. In production, this runs automatically every 30 minutes via cron job.
 *     tags: [Pupils]
 *     responses:
 *       200:
 *         description: Stalled lessons test completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Stalled lessons test completed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     checked:
 *                       type: integer
 *                       description: Number of stalled attempts checked
 *                       example: 45
 *                     notifications_sent:
 *                       type: integer
 *                       description: Number of notifications actually sent
 *                       example: 12
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-02-13T10:30:00.000Z"
 */
router.post(
    '/stalled-lessons',
    pupilController.testStalledLessons
);


export default router;
