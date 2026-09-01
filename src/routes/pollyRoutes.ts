import { Router } from "express";
import { pollyController } from "../controllers/polly.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Polly
 *   description: Text to Speech (AWS Polly) endpoints
 */

/**
 * @swagger
 * /tts:
 *   post:
 *     summary: Convert text to speech using AWS Polly
 *     tags: [Polly]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Hello, welcome to Nedjmati"
 *               language:
 *                 type: string
 *                 enum: [en, ar, fr]
 *                 example: "en"
 *     responses:
 *       200:
 *         description: Speech synthesized successfully
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
 *                   example: "Speech synthesized successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     audio:
 *                       type: string
 *                       description: Base64 encoded MP3 audio
 *                       example: "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4..."
 *       400:
 *         description: Validation or synthesis error
 *       500:
 *         description: Internal server error
 */
router.post("/tts", (req, res) =>
  pollyController.synthesizeSpeech(req, res)
);

export default router;
