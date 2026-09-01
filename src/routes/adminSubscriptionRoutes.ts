import { Router } from "express";
import adminSubscriptionController from "../controllers/adminSubscriptionController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Subscriptions
 *   description: Admin subscription management endpoints
 */

/**
 * @swagger
 * /admin/subscriptions/upgrade:
 *   post:
 *     summary: Upgrade a user's subscription (admin only)
 *     tags: [Admin Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parent_id
 *               - plan_id
 *             properties:
 *               parent_id:
 *                 type: string
 *                 description: The ID of the parent/user whose subscription to upgrade
 *                 example: "parent-uuid-here"
 *               plan_id:
 *                 type: string
 *                 description: The ID of the subscription plan to upgrade to
 *                 example: "plan-uuid-here"
 *     responses:
 *       200:
 *         description: Subscription upgraded successfully
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
 *                     subscription:
 *                       type: object
 *                       description: The upgraded subscription details
 *                     plan:
 *                       type: object
 *                       description: The subscription plan details
 *                     parent:
 *                       type: object
 *                       description: The parent/user details
 *                 message:
 *                   type: string
 *                   example: "Subscription upgraded successfully"
 *       400:
 *         description: Bad request - validation error or business rule violation
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
 *                   example: "User already has this subscription plan"
 *       401:
 *         description: Unauthorized - session expired or not logged in
 *       404:
 *         description: User or plan not found
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
 *                   example: "Unable to upgrade the subscription. Please try again."
 */
router.post("/upgrade", adminSubscriptionController.upgradeSubscription);

/**
 * @swagger
 * /admin/subscriptions/renew:
 *   post:
 *     summary: Renew a user's subscription (admin only)
 *     tags: [Admin Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parent_id
 *             properties:
 *               parent_id:
 *                 type: string
 *                 description: The ID of the parent/user whose subscription to renew
 *                 example: "parent-uuid-here"
 *               months:
 *                 type: integer
 *                 description: Optional number of months to extend the subscription. If not provided, extends by plan's default period
 *                 example: 12
 *     responses:
 *       200:
 *         description: Subscription renewed successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User or subscription not found
 *       500:
 *         description: Server error
 */
router.post("/renew", adminSubscriptionController.renewSubscription);

/**
 * @swagger
 * /admin/subscriptions/cancel:
 *   post:
 *     summary: Cancel a user's subscription (admin only)
 *     tags: [Admin Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parent_id
 *             properties:
 *               parent_id:
 *                 type: string
 *                 description: The ID of the parent/user whose subscription to cancel
 *                 example: "parent-uuid-here"
 *               reason:
 *                 type: string
 *                 description: Optional reason for cancellation
 *                 example: "User requested cancellation"
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User or subscription not found
 *       500:
 *         description: Server error
 */
router.post("/cancel", adminSubscriptionController.cancelSubscription);

/**
 * @swagger
 * /admin/subscriptions/user/{parent_id}:
 *   get:
 *     summary: Get user subscription details (admin only)
 *     tags: [Admin Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parent_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the parent/user
 *         example: "parent-uuid-here"
 *     responses:
 *       200:
 *         description: User subscription retrieved successfully
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
 *                     parent:
 *                       type: object
 *                     active_subscription:
 *                       type: object
 *                       nullable: true
 *                     all_subscriptions:
 *                       type: array
 *                       items:
 *                         type: object
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/user/:parent_id", adminSubscriptionController.getUserSubscription);

/**
 * @swagger
 * /admin/subscriptions/manual-payments:
 *   get:
 *     summary: List manual payment requests (admin)
 *     tags: [Admin Subscriptions]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         required: false
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of manual payment requests
 *       401:
 *         description: Unauthorized
 */
router.get("/manual-payments", adminSubscriptionController.listManualPayments);

/**
 * @swagger
 * /admin/subscriptions/manual-payments/{id}:
 *   get:
 *     summary: Get manual payment request by ID (admin)
 *     tags: [Admin Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Manual payment request ID
 *     responses:
 *       200:
 *         description: Manual payment request details with screenshot
 *       404:
 *         description: Request not found
 */
router.get("/manual-payments/:id", adminSubscriptionController.getManualPaymentById);

/**
 * @swagger
 * /admin/subscriptions/manual-payments/{id}/approve:
 *   post:
 *     summary: Approve manual payment request (admin)
 *     tags: [Admin Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Manual payment request ID
 *     responses:
 *       200:
 *         description: Approved successfully
 *       400:
 *         description: Request not found or already processed
 */
router.post("/manual-payments/:id/approve", adminSubscriptionController.approveManualPayment);

/**
 * @swagger
 * /admin/subscriptions/manual-payments/{id}/reject:
 *   post:
 *     summary: Reject manual payment request (admin)
 *     tags: [Admin Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Manual payment request ID
 *     responses:
 *       200:
 *         description: Rejected successfully
 *       400:
 *         description: Request not found or already processed
 */
router.post("/manual-payments/:id/reject", adminSubscriptionController.rejectManualPayment);

export default router;
