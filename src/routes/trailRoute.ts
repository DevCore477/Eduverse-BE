import { Router } from "express";
import { trialController } from "../controllers/trailController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Trials
 *   description: Free trial management endpoints
 */

/**
 * @swagger
 * /trials/start:
 *   post:
 *     summary: Start a free trial for the authenticated parent
 *     tags: [Trials]
 *     responses:
 *       200:
 *         description: Free trial started successfully
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
 *                   example: "Free trial started successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *                     trial:
 *                       type: object
 *                       properties:
 *                         start_date:
 *                           type: string
 *                           format: date-time
 *                         end_date:
 *                           type: string
 *                           format: date-time
 *                         days_remaining:
 *                           type: number
 *                         max_pupils:
 *                           type: number
 *       400:
 *         description: Failed to start free trial
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "You already have an active trial"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.post(
  "/start",
  trialController.startFreeTrial
);

/**
 * @swagger
 * /trials/status:
 *   get:
 *     summary: Check trial status for the authenticated parent
 *     tags: [Trials]
 *     responses:
 *       200:
 *         description: Trial status fetched successfully
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
 *                   example: "Trial status fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     trial_status:
 *                       type: string
 *                       enum: [not_started, active, expired, converted]
 *                     start_date:
 *                       type: string
 *                       format: date-time
 *                     end_date:
 *                       type: string
 *                       format: date-time
 *                     days_remaining:
 *                       type: number
 *                     max_pupils_allowed:
 *                       type: number
 *                     current_pupils:
 *                       type: number
 *                     can_add_pupil:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.get(
  "/status",
  trialController.checkTrialStatus
);

export default router