import express, { Application } from 'express';
import dotenv from 'dotenv';
import { setupSwagger } from './config/swagger';
import authRoutes from './routes/authRoutes';
import adminAuthRoutes from './routes/adminAuthRoutes';
import adminUserRoutes from './routes/adminUserRoutes';
import adminSubscriptionRoutes from './routes/adminSubscriptionRoutes';
import pupilRoutes from './routes/pupilRoutes'
import subscriptionRoutes from './routes/subscriptionRoutes';
import journeyRoutes from './routes/journeyRoutes';
import parentRoutes from './routes/parentRoutes';
import academicRoutes from './routes/academicRoutes';
import pollyRoutes from './routes/pollyRoutes';
import ratingRoutes from './routes/ratingRoutes';
import trailRoutes from './routes/trailRoute';
import ratingController from './controllers/ratingController';
import { authMiddleware } from './middlewares/authMiddleware';
import { adminAuthMiddleware } from './middlewares/adminAuthMiddleware';
import morgan from 'morgan';
import cors from 'cors';
import notificationRoutes from "./routes/notificationRoutes";
import { scheduleNotificationChecks } from './cron/inactivePupil';


dotenv.config();

const app: Application = express();

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

scheduleNotificationChecks();

app.use('/auth', authRoutes);
app.use('/admin/auth', adminAuthRoutes);
app.use('/admin/users', adminAuthMiddleware, adminUserRoutes);
app.use('/admin/subscriptions', adminAuthMiddleware, adminSubscriptionRoutes);
app.use('/pupils', authMiddleware, pupilRoutes)
app.use('/subscriptions', subscriptionRoutes)
app.use('/journeys', authMiddleware, journeyRoutes);
app.use('/parents', authMiddleware, parentRoutes);
app.use('/academics', authMiddleware, academicRoutes);
app.use('/notifications', notificationRoutes);
app.use('/ratings', authMiddleware, ratingRoutes);
app.use('/trials', authMiddleware,trailRoutes );

/**
 * @swagger
 * /ratings/stats/overview:
 *   get:
 *     summary: Get rating statistics (public endpoint)
 *     tags: [Ratings]
 *     responses:
 *       200:
 *         description: Rating statistics retrieved successfully
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
 *                     total_ratings:
 *                       type: integer
 *                       example: 150
 *                     average_rating:
 *                       type: number
 *                       format: float
 *                       example: 4.5
 *                     rating_distribution:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rating:
 *                             type: integer
 *                           count:
 *                             type: integer
 *                 message:
 *                   type: string
 *                   example: "Rating statistics retrieved successfully"
 */
app.get('/ratings/stats/overview', ratingController.getRatingStats);

app.use('/polly', pollyRoutes);
setupSwagger(app);

app.get('/', (req, res) => {
  res.send('API is running!');
});


app.get("/.well-known/assetlinks.json", (req, res) => {
  res.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "nedjmati.app",
        sha256_cert_fingerprints: [
          "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C",
          "73:39:B6:10:7B:F7:4B:22:59:55:E8:A8:AF:B5:D0:F9:C2:07:EF:E1:05:DC:7D:D2:72:17:2B:2C:DC:14:2D:B2",
        ],
      },
    },
  ]);
});

app.get("/create-password", (req, res) => {
  const { code, identifier } = req.query;


  // Build the deep link URL
  const deepLink = `nedjmatiapp://create-password?code=${code || ''}&identifier=${encodeURIComponent(identifier?.toString() || '')}`;

  // Return HTML with a styled button
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          
          .container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 {
            color: #333;
            margin-bottom: 24px;
            font-size: 24px;
          }
          .btn {
            display: inline-block;
            padding: 16px 32px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            transition: background 0.2s;
          }
          .btn:hover {
            background: #0056b3;
          }
          .fallback {
            margin-top: 20px;
            font-size: 14px;
            color: #666;
          }
          .fallback a {
            color: #007bff;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔒 Reset Your Password</h1>
          <a href="${deepLink}" class="btn">Open in Nedjmati App</a>
          <p class="fallback">
            Button not working? <a href="${deepLink}">Click here</a> or copy:<br>
            <code>${deepLink}</code>
          </p>
        </div>
      </body>
    </html>
  `);
});

export default app;
