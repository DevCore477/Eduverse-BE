import { Router } from "express";
import { academicController } from "../controllers/academicController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Academics
 *   description: Academic management endpoints
 */

/**
 * @swagger
 * /academics:
 *   get:
 *     summary: Get all academic years
 *     tags: [Academics]
 *     responses:
 *       200:
 *         description: List of academic years
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       grade:
 *                         type: integer
 *                       description:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                       updated_at:
 *                         type: string
 *                 message:
 *                   type: string
 */
router.get("/", academicController.getAcademicYears);

/**
 * @swagger
 * /academics/{id}:
 *   get:
 *     summary: Get academic year by ID
 *     tags: [Academics]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Academic year ID
 *     responses:
 *       200:
 *         description: Academic year details
 *       400:
 *         description: Academic year not found
 */
router.get("/:id", academicController.getAcademicYearById);

/**
 * @swagger
 * /academics:
 *   post:
 *     summary: Create a new academic year
 *     tags: [Academics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - grade
 *             properties:
 *               name:
 *                 type: string
 *               grade:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Academic year created successfully
 *       400:
 *         description: Validation error
 */
router.post("/", academicController.createAcademicYear);

/**
 * @swagger
 * /academics/{id}:
 *   put:
 *     summary: Update an academic year
 *     tags: [Academics]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Academic year ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               grade:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Academic year updated successfully
 *       400:
 *         description: Validation error or academic year not found
 */
router.put("/:id", academicController.updateAcademicYear);

/**
 * @swagger
 * /academics/{id}:
 *   delete:
 *     summary: Delete an academic year
 *     tags: [Academics]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Academic year ID
 *     responses:
 *       200:
 *         description: Academic year deleted successfully
 *       400:
 *         description: Academic year not found
 */
router.delete("/:id", academicController.deleteAcademicYear);



export default router;
