import { Router } from "express";
import { subscriptionController } from "../controllers/subscriptionController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription plan endpoints
 */

/**
 * @swagger
 * /subscriptions:
 *   get:
 *     summary: Get all subscription plans
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: List of all subscription plans
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
 *                   example: "Subscriptions fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       plan_code:
 *                         type: string
 *                       name:
 *                         type: string
 *                       price:
 *                         type: number
 *                       max_devices:
 *                         type: number
 *                       max_profiles:
 *                         type: number
 *                       allowed_years:
 *                         type: string
 *                         example: "1"
 *                       description:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Failed to fetch subscriptions
 */
router.get("/", subscriptionController.getSubscriptions);

/**
 * @swagger
 * /subscriptions/purchase:
 *   post:
 *     summary: Purchase a subscription (creates Chargily checkout session)
 *     tags: [Subscriptions]
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
 *                 format: uuid
 *                 example: "parent-uuid"
 *               plan_id:
 *                 type: string
 *                 format: uuid
 *                 example: "plan-uuid"
 *     responses:
 *       200:
 *         description: Checkout session created successfully
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
 *                   example: "Checkout session created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       type: object
 *                     payment:
 *                       type: object
 *                     checkout_url:
 *                       type: string
 *                       example: "https://checkout.chargily.com/..."
 *       400:
 *         description: Failed to create checkout session
 */
router.post("/purchase", subscriptionController.purchaseSubscription);

/**
 * @swagger
 * /subscriptions/payment-success:
 *   get:
 *     summary: Handle payment success callback from Chargily
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: query
 *         name: checkout_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The Chargily checkout session ID
 *         example: "checkout-session-id"
 *     responses:
 *       200:
 *         description: Payment confirmed successfully or already verified
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
 *                   example: "Payment confirmed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       type: object
 *                     payment:
 *                       type: object
 *                     alreadyVerified:
 *                       type: boolean
 *                       example: false
 *                       description: Indicates if payment was already verified
 *       400:
 *         description: Failed to confirm payment
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
 *                   example: "Payment verification failed"
 */
router.get("/payment-success", subscriptionController.paymentSuccess);

/**
 * @swagger
 * /subscriptions/payment-failure:
 *   get:
 *     summary: Handle payment failure callback from Chargily
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: query
 *         name: checkout_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The Chargily checkout session ID
 *     responses:
 *       200:
 *         description: Payment failure recorded
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
 *                   example: "Payment failure recorded"
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       type: object
 *                     payment:
 *                       type: object
 *       400:
 *         description: Failed to record payment failure
 */
router.get("/payment-failure", subscriptionController.paymentFailure);

/**
 * @swagger
 * /subscriptions/payment-success-redirect:
 *   get:
 *     summary: Redirect user to app after successful payment
 *     tags: [Subscriptions]
 *     description: Redirects to the mobile app deeplink with a success status.
 *     responses:
 *       200:
 *         description: HTML redirect page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "<html>...</html>"
 */
router.get('/payment-success-redirect', (req, res) => {
  const isLogin = req.query.isLogin === 'true';

  const deepLink = isLogin
    ? 'nedjmatiapp://parent-dashboard'
    : 'nedjmatiapp://lets-start';

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Payment Success</title>
        <meta http-equiv="refresh" content="0;url=${deepLink}" />
      </head>
      <body>
        <p>Redirecting to app...</p>
        <script>
          window.location.href = "${deepLink}";
        </script>
      </body>
    </html>
  `);
});
/**
 * @swagger
 * /subscriptions/payment-failure-redirect:
 *   get:
 *     summary: Redirect user to app after failed payment
 *     tags: [Subscriptions]
 *     description: Redirects to the mobile app deeplink with a failure status.
 *     responses:
 *       200:
 *         description: HTML redirect page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "<html>...</html>"
 */
router.get('/payment-failure-redirect', (req, res) => {
  const deepLink = 'nedjmatiapp://pricing-plans?status=fail';

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Payment Failed</title>
        <meta http-equiv="refresh" content="0;url=${deepLink}" />
      </head>
      <body>
        <p>Redirecting to app...</p>
        <script>
          window.location = "${deepLink}";
        </script>
      </body>
    </html>
  `);
});


/**
 * @swagger
 * /subscriptions/upgrade:
 *   post:
 *     summary: Upgrade subscription to a new plan
 *     tags: [Subscriptions]
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
 *                 format: uuid
 *                 example: "parent-uuid"
 *               plan_id:
 *                 type: string
 *                 format: uuid
 *                 example: "plan-uuid"
 *     responses:
 *       200:
 *         description: Upgrade checkout session created successfully
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
 *                   example: "Upgrade checkout session created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       type: object
 *                     payment:
 *                       type: object
 *                     checkout_url:
 *                       type: string
 *                       example: "https://checkout.chargily.com/..."
 *                     current_subscription:
 *                       type: object
 *                     isUpgrade:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Failed to create upgrade subscription
 */
router.post("/upgrade", subscriptionController.upgradeSubscription);
router.post("/webhook/chargily", subscriptionController.upgradeSubscription);
/**
 * @swagger
 * /subscriptions/payments/history:
 *   get:
 *     summary: Get payment history for the authenticated parent
 *     tags: [Subscriptions]
 *     description: >
 *       Returns a list of payments for the currently authenticated parent.
 *       The parent ID is taken from the auth token (middleware), not from request params.
 *     responses:
 *       200:
 *         description: Payment history fetched successfully
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
 *                   example: "Payment history fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       parent_subscription_id:
 *                         type: string
 *                         format: uuid
 *                       chargily_session_id:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       currency:
 *                         type: string
 *                         example: "dzd"
 *                       status:
 *                         type: string
 *                         example: "paid"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized – parent ID not found from token
 *       400:
 *         description: Failed to fetch payment history
 */
router.get(
  "/payments/history",
  authMiddleware,
  subscriptionController.getPaymentHistory.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/manual-payment/request:
 *   post:
 *     summary: Submit manual payment with screenshot (parent authenticated via token)
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan_id
 *               - request_type
 *               - screenshot_base64
 *             properties:
 *               plan_id:
 *                 type: string
 *                 format: uuid
 *                 description: Subscription plan to request
 *               request_type:
 *                 type: string
 *                 enum: [upgrade, renew]
 *                 description: Upgrade (new plan) or Renew (extend current)
 *               screenshot_base64:
 *                 type: string
 *                 description: Payment screenshot as base64 data URL (data:image/jpeg;base64,... or data:image/png;base64,...). Max 5MB.
 *               amount:
 *                 type: number
 *                 optional: true
 *               note:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Manual payment request submitted; admin will review
 *       400:
 *         description: Validation failed or duplicate pending request
 */
router.post(
  "/manual-payment/request",
  authMiddleware,
  subscriptionController.requestManualPayment
);

/**
 * @swagger
 * /subscriptions/manual-payment/requests:
 *   get:
 *     summary: Get my manual payment requests (status list)
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of manual payment requests for the authenticated parent
 */
router.get(
  "/manual-payment/requests",
  authMiddleware,
  subscriptionController.getMyManualPaymentRequests
);

export default router;
