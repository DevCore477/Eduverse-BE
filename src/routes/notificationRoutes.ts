import { Router } from "express";
import notificationController from "../controllers/notification.controller";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app and push notification related endpoints
 */

/**
 * @swagger
 * /notifications/register:
 *   post:
 *     summary: Register device token for push notifications
 *     description: Registers Firebase/FCM device token for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: "fcm_device_token_here"
 *               platform:
 *                 type: string
 *                 example: "android"
 *     responses:
 *       200:
 *         description: Device token registered successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post(
    "/register",
    authMiddleware,
    notificationController.registerDevice
);


/**
 * @swagger
 * /notifications/test:
 *   post:
 *     summary: Send a test push notification
 *     description: Sends a test push notification to the provided FCM token.
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - title
 *               - body
 *             properties:
 *               token:
 *                 type: string
 *                 description: The FCM token of the target device.
 *                 example: "fcm_device_token_here"
 *               title:
 *                 type: string
 *                 description: The title of the notification.
 *                 example: "Test Notification"
 *               body:
 *                 type: string
 *                 description: The body of the notification.
 *                 example: "This is a test notification."
 *               data:
 *                 type: object
 *                 description: Optional extra data to send with the notification.
 *                 additionalProperties:
 *                   type: string
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Failed to send notification
 */
router.post(
    "/test",
    notificationController.sendTestNotification
);


/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get all notifications
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 */
router.get(
    "/",
    authMiddleware,
    notificationController.getAll
);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Marked as read
 */
router.patch(
    "/:id/read",
    authMiddleware,
    notificationController.markAsRead
);


export default router;
