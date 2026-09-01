import { Request, Response } from "express";
import { sendError, sendSuccess } from "../utils/response";
import notificationService from "../services/notification.service";

class NotificationController {
    async registerDevice(req: Request, res: Response) {
        try {
            const firebaseUser = (req as any).user;
            const { token, platform } = req.body;

            if (!token) {
                return sendError(res, "Device token is required", 400);
            }

            await notificationService.registerDeviceToken({
                userId: firebaseUser.uid,
                token,
                platform,
            });

            return sendSuccess(res, null, "Device token registered successfully");
        } catch (err: any) {
            return sendError(res, err.message || "Failed to register device token", 400);
        }
    }
    async sendTestNotification(req: Request, res: Response) {
        try {
            const { token, title, body, data } = req.body;

            // Ensure the required fields are provided
            if (!token || !title || !body) {
                return sendError(res, "Token, title, and body are required", 400);
            }

            // Send push notification using the service
            await notificationService.sendPushNotification(token, title, body, data);

            return sendSuccess(res, null, "Test notification sent successfully");
        } catch (err: any) {
            return sendError(res, err.message || "Failed to send notification", 400);
        }
    }
    
    async getAll(req: Request, res: Response) {
        try {
            const user = (req as any).user;

            const { notify, pupilId } = req.query;

            const notifications = await notificationService.getAllByUser(
                user.uid,
                notify as "parent" | "pupil" | undefined,
                pupilId as string
            );

            return sendSuccess(res, notifications, "Notifications fetched");
        } catch (err: any) {
            return sendError(res, err.message, 500);
        }
    }

    async markAsRead(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            const { id } = req.params;

            await notificationService.markAsRead(id as string, user.uid);

            return sendSuccess(res, null, "Notification marked as read");
        } catch (err: any) {
            return sendError(res, err.message, 500);
        }
    }
}

export default new NotificationController();
