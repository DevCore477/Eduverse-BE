import { Router } from "express";
import parentController from "../controllers/parentController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Parent
 *   description: Parent profile endpoints
 */

/**
 * @swagger
 * /parents/dashboard:
 *   get:
 *     summary: Get dashboard stats for the authenticated parent
 *     tags: [Parent]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/dashboard", parentController.getDashboard);

/**
 * @swagger
 * /parents/me:
 *   get:
 *     summary: Get parent profile information
 *     tags: [Parent]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Parent profile retrieved successfully
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
 *                     id:
 *                       type: string
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     first_name:
 *                       type: string
 *                       example: "John"
 *                     last_name:
 *                       type: string
 *                       example: "Doe"
 *                     email:
 *                       type: string
 *                       example: "john@example.com"
 *                     phone_number:
 *                       type: string
 *                       example: "+1234567890"
 *                     created_at:
 *                       type: string
 *                       example: "2024-01-01T00:00:00Z"
 *                 message:
 *                   type: string
 *                   example: "Profile retrieved successfully"
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
 *                   example: "No token provided"
 *       400:
 *         description: Error retrieving profile
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
 *                   example: "Parent profile not found"
 */
router.get("/me", parentController.getProfile);

/**
 * @swagger
 * /parents/me:
 *   patch:
 *     summary: Update parent profile information
 *     tags: [Parent]
 *     security:
 *       - BearerAuth: []
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
 *                 description: "First name (optional)"
 *               last_name:
 *                 type: string
 *                 example: "Smith"
 *                 description: "Last name (optional)"
 *               identifier:
 *                 type: string
 *                 example: "john@example.com"
 *                 description: "Identifier (email) - cannot be updated"
 *               pin_code:
 *                 type: string
 *                 example: "1234"
 *                 description: "PIN code - must be 4–6 digits (optional)"
 *               profile_image_base64:
 *                 type: string
 *                 description: "Base64 encoded profile image (PNG/JPEG)"
 *                 example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *             example:
 *               first_name: "Jane"
 *               last_name: "Smith"
 *               pin_code: "1234"
 *               profile_image_base64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                     id:
 *                       type: string
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     first_name:
 *                       type: string
 *                       example: "Jane"
 *                     last_name:
 *                       type: string
 *                       example: "Smith"
 *                     email:
 *                       type: string
 *                       example: "john@example.com"
 *                     phone_number:
 *                       type: string
 *                       example: "+1234567890"
 *                     profile_image_base64:
 *                       type: string
 *                       example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 *                     created_at:
 *                       type: string
 *                       example: "2024-01-01T00:00:00Z"
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *       400:
 *         description: Validation error or update failed
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
 *                   example: "Validation failed or Email cannot be updated"
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
 *                   example: "No token provided"
 */
router.patch("/me", parentController.updateProfile);

/**
 * @swagger
 * /parents/change-password:
 *   post:
 *     summary: Change parent password
 *     tags: [Parent]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmNewPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "OldP@ssword123"
 *                 description: "Current password"
 *               newPassword:
 *                 type: string
 *                 example: "NewP@ssword123"
 *                 description: "New password - must be at least 8 characters with 1 uppercase letter and 1 number"
 *               confirmNewPassword:
 *                 type: string
 *                 example: "NewP@ssword123"
 *                 description: "Confirm new password - must match newPassword"
 *             example:
 *               currentPassword: "OldP@ssword123"
 *               newPassword: "NewP@ssword123"
 *               confirmNewPassword: "NewP@ssword123"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Password changed successfully"
 *       400:
 *         description: Validation error or password change failed
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
 *                   example: "Current password is incorrect"
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
 *                   example: "User not authenticated"
 */
router.post("/change-password", parentController.changePassword);

export default router;
