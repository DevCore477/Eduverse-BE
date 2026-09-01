import { Router } from "express";
import authController from "../controllers/authController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Sign up a new user using email or phone
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *               - first_name
 *               - last_name
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: "user@example.com"
 *                 description: "Email or phone number"
 *               password:
 *                 type: string
 *                 example: "StrongP@ssword123"
 *               first_name:
 *                 type: string
 *                 example: "John"
 *               last_name:
 *                 type: string
 *                 example: "Doe"
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Error during signup
 */
router.post("/signup", authController.signUp);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user using Firebase ID token
 *     description: Frontend authenticates with Firebase SDK and sends ID token in Authorization header
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid or expired Firebase token
 */
router.post("/login", authMiddleware, authController.signIn);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Send Reset link to email for creating new password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email or phone number
 *     responses:
 *       200:
 *         description: Reset sent successfully
 *       400:
 *         description: Error sending Reset link
 */
router.post("/forgot-password", authController.forgotPassword);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP sent to email or phone
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - otp
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email or phone number
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post("/verify-otp", authController.verifyOtp);

// /**
//  * @swagger
//  * /auth/resend-otp:
//  *   post:
//  *     summary: Resend OTP to email or phone
//  *     tags: [Auth]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - identifier
//  *             properties:
//  *               identifier:
//  *                 type: string
//  *                 description: Email or phone number
//  *     responses:
//  *       200:
//  *         description: OTP resent successfully
//  *       400:
//  *         description: Error resending OTP
//  */
// router.post("/resend-otp", authController.resendOtp);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *               - confirm_password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: User Email from verified OTP
 *               password:
 *                 type: string
 *                 description: New password
 *               confirm_password:
 *                 type: string
 *                 description: Confirm new password
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Password reset failed
 */
router.post("/reset-password", authController.resetPassword);



/**
 * @swagger
 * /auth/revoke-tokens:
 *   post:
 *     summary: Revoke all authentication tokens for the authenticated parent
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Tokens revoked successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/revoke-tokens", authMiddleware, authController.revokeTokens);


/**
 * @swagger
 * /auth/delete-account:
 *   delete:
 *     summary: Delete the authenticated user's account
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: Account deleted successfully
 *       401:
 *         description: Unauthorized
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
 *                   example: Authorization token missing
 */
router.delete("/delete-account", authMiddleware, authController.deleteAccount);

export default router;
