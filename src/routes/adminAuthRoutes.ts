import { Router } from "express";
import adminAuthController from "../controllers/adminAuthController";
import { adminAuthMiddleware, superAdminMiddleware } from "../middlewares/adminAuthMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Auth
 *   description: Admin authentication endpoints
 */

/**
 * @swagger
 * /admin/auth/login:
 *   post:
 *     summary: Admin login with email and password
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@nedjmati.com"
 *               password:
 *                 type: string
 *                 example: "SecurePassword123"
 *     responses:
 *       200:
 *         description: Login successful
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
 *                     token:
 *                       type: string
 *                       description: JWT access token
 *                     admin:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         first_name:
 *                           type: string
 *                         last_name:
 *                           type: string
 *                         role:
 *                           type: string
 *                 message:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *       400:
 *         description: Validation error
 */
router.post("/login", adminAuthController.login);

/**
 * @swagger
 * /admin/auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@nedjmati.com"
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       400:
 *         description: Validation error, or "Email not registered", or "Account is deactivated. Please contact support."
 */
router.post("/forgot-password", adminAuthController.forgotPassword);

/**
 * @swagger
 * /admin/auth/reset-password:
 *   post:
 *     summary: Reset password using token from email
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *               - confirm_password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Reset token from email
 *               password:
 *                 type: string
 *                 description: New password (min 8 chars, 1 uppercase, 1 number)
 *               confirm_password:
 *                 type: string
 *                 description: Confirm new password
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token, or validation error
 */
router.post("/reset-password", adminAuthController.resetPassword);

/**
 * @swagger
 * /admin/auth/logout:
 *   post:
 *     summary: Logout admin
 *     tags: [Admin Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post("/logout", adminAuthMiddleware, adminAuthController.logout);

/**
 * @swagger
 * /admin/auth/me:
 *   get:
 *     summary: Get current admin profile with refreshed token
 *     tags: [Admin Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully with new token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     admin:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         first_name:
 *                           type: string
 *                         last_name:
 *                           type: string
 *                         role:
 *                           type: string
 *                         last_login:
 *                           type: string
 *                         created_at:
 *                           type: string
 *                     token:
 *                       type: string
 *                       description: New refreshed JWT token
 *       401:
 *         description: Not authenticated
 */
router.get("/me", adminAuthMiddleware, adminAuthController.getAdminProfile);

/**
 * @swagger
 * /admin/auth/create:
 *   post:
 *     summary: Create a new admin (super admin only)
 *     tags: [Admin Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Admin created successfully
 *       400:
 *         description: Validation error or admin already exists
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Super admin privileges required
 */
router.post(
  "/create",
  adminAuthMiddleware,
  superAdminMiddleware,
  adminAuthController.createAdmin
);

/**
 * @swagger
 * /admin/auth/profile:
 *   put:
 *     summary: Update current admin's profile
 *     tags: [Admin Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *                 format: email
 *               email:
 *                 type: string
 *                 format: email
 *               current_password:
 *                 type: string
 *                 description: Required if changing password
 *               new_password:
 *                 type: string
 *                 description: New password to set
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error or incorrect password
 *       401:
 *         description: Not authenticated
 */
router.put(
  "/profile",
  adminAuthMiddleware,
  adminAuthController.updateProfile
);

export default router;
