import { Router } from "express";
import ratingController from "../controllers/ratingController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: App rating endpoints for parents
 */

/**
 * @swagger
 * /ratings:
 *   post:
 *     summary: Create a new app rating
 *     tags: [Ratings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *                 description: "Rating value from 1 to 5"
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Great app! My kids love it."
 *                 description: "Optional comment/feedback"
 *             example:
 *               rating: 5
 *               comment: "Great app! My kids love it."
 *     responses:
 *       201:
 *         description: Rating created successfully
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
 *                     parent_id:
 *                       type: string
 *                       example: "parent123"
 *                     rating:
 *                       type: integer
 *                       example: 5
 *                     comment:
 *                       type: string
 *                       example: "Great app! My kids love it."
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                     parent:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         first_name:
 *                           type: string
 *                         last_name:
 *                           type: string
 *                         email:
 *                           type: string
 *                 message:
 *                   type: string
 *                   example: "Rating created successfully"
 *       400:
 *         description: Validation error or creation failed
 *       401:
 *         description: Unauthorized
 */
router.post("/", ratingController.createRating);

/**
 * @swagger
 * /ratings:
 *   get:
 *     summary: Get all ratings for the authenticated parent
 *     tags: [Ratings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Ratings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       parent_id:
 *                         type: string
 *                       rating:
 *                         type: integer
 *                       comment:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                       parent:
 *                         type: object
 *                 message:
 *                   type: string
 *                   example: "Ratings retrieved successfully"
 *       401:
 *         description: Unauthorized
 */
router.get("/", ratingController.getRatings);

/**
 * @swagger
 * /ratings/{id}:
 *   get:
 *     summary: Get a specific rating by ID
 *     tags: [Ratings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Rating ID
 *     responses:
 *       200:
 *         description: Rating retrieved successfully
 *       400:
 *         description: Rating not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Rating does not belong to authenticated parent
 */
router.get("/:id", ratingController.getRatingById);


export default router;

