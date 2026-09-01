// import prisma from "../config/prisma";
//
// export interface NotificationPayload {
//   type?: string;
//   meta?: Record<string, any>;
// }
//
// /**
//  * Minimal in-app notification dispatcher for parents.
//  * Persists a notification row that can be pulled by the client in real time.
//  */
// class NotificationService {
//   async createParentNotification(
//     parentId: string,
//     pupilId: string,
//     message: string,
//     payload?: NotificationPayload
//   ) {
//     if (!parentId || !pupilId) {
//       throw new Error("parentId and pupilId are required to create a notification");
//     }
//
//     return prisma.parent_notifications.create({
//       data: {
//         parent_id: parentId,
//         pupil_id: pupilId,
//         message,
//         payload: payload || {},
//       },
//     });
//   }
// }
//
// export const notificationService = new NotificationService();
//
