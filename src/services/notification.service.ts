import prisma from "../config/prisma";
import { io } from "../server";
import { firebaseService } from "./firebase.service";
import axios from 'axios';

export interface NotificationPayload {
    type?: string;
    notify?: "parent" | "pupil"
    meta?: Record<string, any>;
}

class NotificationService {
    async registerDeviceToken(params: {
        userId: string;
        token: string;
        platform?: string;
    }) {
        const { userId, token, platform } = params;
        // Remove token if it belongs to another user
        await prisma.parent_device_tokens.deleteMany({
            where: {
                token,
                NOT: { parent_id: userId },
            },
        });

        return await prisma.parent_device_tokens.upsert({
            where: { token },
            update: {
                ...(platform && { platform }),
                parent_id: userId,
            },
            create: {
                token,
                platform,
                parent_id: userId,
            },
        });
    }


    async createNotification(
        title: string,
        parentId: string,
        pupilId: string,
        message: string,
        payload?: NotificationPayload
    ) {
        if (!parentId || !pupilId) {
            throw new Error("parentId and pupilId are required to create a notification");
        }

        // Create the notification in the database
        const notification = await prisma.notifications.create({
            data: {
                title,
                parent_id: parentId,
                pupil_id: pupilId,
                message,
                payload: payload || {},
                type: 'achievement',
            },
        });

        // Define the user room name (using the parentId as the user identifier)
        const userRoom = `user:${parentId}`;

        // Emit notification to the user (parent or pupil) based on the flag in payload
        if (payload?.notify === "pupil") {
            // Notify the pupil (you can emit specific messages for pupil notifications if needed)
            io.to(userRoom).emit('newNotification', { message, notificationId: notification.id, type: 'pupil' });
        } else {
            // Notify the parent
            io.to(userRoom).emit('newNotification', { message, notificationId: notification.id, type: 'parent' });
        }

        return notification;
    }

    async sendPushNotification(token: string, title: string, body: string, data = {}) {
        const message = {
            token,
            title,
            body,
            data, // Optional additional data
        };

        try {
            let response = '';
            if (token.includes('ExponentPushToken')) {
                response = await this.sendExpoPushNotifications(message);
            } else {
                // Check if Firebase is available before sending
                if (!firebaseService.isAvailable) {
                    console.warn('⚠️  Firebase not available. Push notification not sent.');
                    return { success: false, reason: 'Firebase not initialized' };
                }
                response = await firebaseService.sendPushNotification(message);
            }
            console.log("Successfully sent message:", response);
            return response;
        } catch (error) {
            console.error("Error sending message:", error);
            // Don't throw - just log and return gracefully
            return { success: false, error: (error as Error).message };
        }
    }

    async getAllByUser(userId: string, notify: "parent" | "pupil" | undefined, pupilId?: string) {
        let whereCondition: any = { parent_id: userId };

        if (notify === "parent") {
            whereCondition = { parent_id: userId };
        } else if (notify === "pupil" && pupilId) {
            whereCondition = { pupil_id: pupilId };
        } else if (!notify) {
            whereCondition = { parent_id: userId };
        }

        return await prisma.notifications.findMany({
            where: whereCondition,
            orderBy: { created_at: "desc" },
        });
    }


    async markAsRead(notificationId: string, userId: string) {
        return await prisma.notifications.update({
            where: {
                id: notificationId,
                parent_id: userId,
            },
            data: {
                is_read: true,
            },
        });
    }

    async sendExpoPushNotifications(payload: {
        token: string,
        title: string,
        body: string,
        data: any,
    }) {
        try {
            const res = await axios.post(
                "https://exp.host/--/api/v2/push/send",
                {
                    to: payload.token,
                    title: payload?.title,
                    body: payload.body,
                    data: payload.data,
                    sound: "default"
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            return res.data;
        } catch (error) {
            console.error("Error sending expoPushNotifications", error);
        }
    }
}

export default new NotificationService();
