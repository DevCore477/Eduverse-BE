import { Router } from "express";
import adminUserController from "../controllers/adminUserController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Users
 *   description: Admin user management endpoints
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get list of registered users (parents) for admin
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by first name, last name, or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, cancelled]
 *         description: Filter by subscription status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: User/Parent ID (required for upgrade/renew/cancel operations)
 *                             example: "parent-uuid-here"
 *                           email:
 *                             type: string
 *                             nullable: true
 *                           first_name:
 *                             type: string
 *                             nullable: true
 *                           last_name:
 *                             type: string
 *                             nullable: true
 *                           subscription_plan:
 *                             type: string
 *                             nullable: true
 *                           subscription_status:
 *                             type: string
 *                             nullable: true
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - Session expired or not logged in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Your session has expired. Please log in again."
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unable to load users at the moment. Please try again later."
 */
router.get("/", adminUserController.getUserList);

/**
 * @swagger
 * /admin/users/analytics:
 *   get:
 *     summary: Get analytics for users and subscriptions
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFilter
 *         schema:
 *           type: string
 *           enum: [all, last_30_days, last_7_days, today]
 *           default: all
 *         description: Filter analytics by date range. "all" returns all-time data, "last_30_days" returns data from the last 30 days, "last_7_days" returns data from the last 7 days, "today" returns only today's data.
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
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
 *                     users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 150
 *                         with_active_subscription:
 *                           type: integer
 *                           example: 100
 *                         with_expired_subscription:
 *                           type: integer
 *                           example: 20
 *                         with_cancelled_subscription:
 *                           type: integer
 *                           example: 10
 *                         without_subscription:
 *                           type: integer
 *                           example: 20
 *                         recent_registrations:
 *                           type: integer
 *                           example: 15
 *                           description: Number of recent registrations based on date filter
 *                         registered_this_month:
 *                           type: integer
 *                           example: 10
 *                     subscriptions:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 130
 *                         active:
 *                           type: integer
 *                           example: 100
 *                         by_status:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               status:
 *                                 type: string
 *                                 example: "active"
 *                               count:
 *                                 type: integer
 *                                 example: 100
 *                         by_plan:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               plan_id:
 *                                 type: string
 *                               plan_name:
 *                                 type: string
 *                                 example: "Premium Plan"
 *                               plan_code:
 *                                 type: string
 *                                 example: "premium"
 *                               count:
 *                                 type: integer
 *                                 example: 50
 *                         recent:
 *                           type: integer
 *                           example: 12
 *                           description: Number of recent subscriptions based on date filter
 *                 message:
 *                   type: string
 *                   example: "Analytics retrieved successfully"
 *       401:
 *         description: Unauthorized - Session expired or not logged in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Your session has expired. Please log in again."
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unable to load analytics at the moment. Please try again later."
 *       400:
 *         description: Bad request - Invalid dateFilter parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid dateFilter. Must be one of: all, last_30_days, last_7_days, today"
 */
router.get("/analytics", adminUserController.getAnalytics);

export default router;
