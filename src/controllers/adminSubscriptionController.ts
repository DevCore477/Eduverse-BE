import { Request, Response } from "express";
import adminSubscriptionService from "../services/adminSubscriptionService";
import { sendSuccess, sendError } from "../utils/response";
import { AdminRequest } from "../middlewares/adminAuthMiddleware";
import {
  sendSubscriptionUpgradeEmail,
  sendSubscriptionRenewalEmail,
  sendSubscriptionCancellationEmail,
} from "../services/email.service";

class AdminSubscriptionController {
  /**
   * POST /admin/subscriptions/upgrade
   * Upgrade a user's subscription (admin only)
   */
  async upgradeSubscription(req: Request, res: Response) {
    try {
      const admin = (req as AdminRequest).admin;
      if (!admin) {
        return sendError(res, "Your session has expired. Please log in again.", 401);
      }

      const { parent_id, plan_id } = req.body;

      if (!parent_id || !plan_id) {
        return sendError(res, "parent_id and plan_id are required", 400);
      }

      // Log admin action
      console.log(
        `[ADMIN SUBSCRIPTION] Admin ${admin.email} upgrading subscription for parent ${parent_id} to plan ${plan_id}`
      );

      const result = await adminSubscriptionService.upgradeSubscription({
        parent_id,
        plan_id,
      });

      // Determine if it's an upgrade or downgrade by comparing prices
      let isDowngrade = false;
      let previousPlanName: string | undefined;
      
      if (result.previous_subscription?.subscription_plans) {
        previousPlanName = result.previous_subscription.subscription_plans.name;
        const previousPrice = Number(result.previous_subscription.subscription_plans.price) || 0;
        const newPrice = Number(result.plan.price) || 0;
        isDowngrade = newPrice < previousPrice;
      }

      // Send confirmation email to user
      try {
        if (result.parent.email) {
          const userName = result.parent.first_name || result.parent.last_name 
            ? `${result.parent.first_name || ""} ${result.parent.last_name || ""}`.trim()
            : "Valued User";
          
          console.log(`[ADMIN SUBSCRIPTION] Attempting to send ${isDowngrade ? "downgrade" : "upgrade"} email to ${result.parent.email}`);
          
          await sendSubscriptionUpgradeEmail(
            result.parent.email,
            userName,
            result.plan.name,
            previousPlanName,
            isDowngrade
          );
          console.log(`[ADMIN SUBSCRIPTION] ${isDowngrade ? "Downgrade" : "Upgrade"} email sent successfully to ${result.parent.email}`);
        } else {
          console.warn(`[ADMIN SUBSCRIPTION] Cannot send ${isDowngrade ? "downgrade" : "upgrade"} email: parent ${parent_id} has no email address`);
        }
      } catch (emailError: any) {
        console.error(`[ADMIN SUBSCRIPTION] Failed to send ${isDowngrade ? "downgrade" : "upgrade"} email:`, emailError.message);
        console.error("[ADMIN SUBSCRIPTION] Email error details:", emailError);
        // Don't fail the request if email fails
      }

      const successMessage = isDowngrade 
        ? "Subscription downgraded successfully" 
        : result.previous_subscription 
          ? "Subscription upgraded successfully" 
          : "Subscription created successfully";

      return sendSuccess(
        res,
        {
          subscription: result.subscription,
          plan: result.plan,
          parent: result.parent,
        },
        successMessage
      );
    } catch (err: any) {
      console.error("[ADMIN SUBSCRIPTION UPGRADE] Error:", err.message);
      
      if (err.message.includes("not found") || err.message.includes("does not have")) {
        return sendError(res, err.message, 404);
      }
      
      if (err.message.includes("already has") || err.message.includes("already in progress")) {
        return sendError(res, err.message, 400);
      }

      return sendError(
        res,
        "Unable to upgrade the subscription. Please try again.",
        500
      );
    }
  }

  /**
   * POST /admin/subscriptions/renew
   * Renew a user's subscription (admin only)
   */
  async renewSubscription(req: Request, res: Response) {
    try {
      const admin = (req as AdminRequest).admin;
      if (!admin) {
        return sendError(res, "Your session has expired. Please log in again.", 401);
      }

      const { parent_id, months } = req.body;

      if (!parent_id) {
        return sendError(res, "parent_id is required", 400);
      }

      // Log admin action
      console.log(
        `[ADMIN SUBSCRIPTION] Admin ${admin.email} renewing subscription for parent ${parent_id}${months ? ` for ${months} months` : ""}`
      );

      const result = await adminSubscriptionService.renewSubscription({
        parent_id,
        months,
      });

      // Send confirmation email to user
      try {
        if (result.parent.email) {
          const userName = result.parent.first_name || result.parent.last_name
            ? `${result.parent.first_name || ""} ${result.parent.last_name || ""}`.trim()
            : "Valued User";
          
          const endDate = result.subscription.end_date || new Date();
          console.log(`[ADMIN SUBSCRIPTION] Attempting to send renewal email to ${result.parent.email} with end date: ${endDate}`);
          
          await sendSubscriptionRenewalEmail(
            result.parent.email,
            userName,
            result.plan.name,
            endDate
          );
          console.log(`[ADMIN SUBSCRIPTION] Renewal email sent successfully to ${result.parent.email}`);
        } else {
          console.warn(`[ADMIN SUBSCRIPTION] Cannot send renewal email: parent ${parent_id} has no email address`);
        }
      } catch (emailError: any) {
        console.error("[ADMIN SUBSCRIPTION] Failed to send renewal email:", emailError.message);
        console.error("[ADMIN SUBSCRIPTION] Email error details:", emailError);
        // Don't fail the request if email fails
      }

      return sendSuccess(
        res,
        {
          subscription: result.subscription,
          plan: result.plan,
          parent: result.parent,
        },
        "Subscription renewed successfully"
      );
    } catch (err: any) {
      console.error("[ADMIN SUBSCRIPTION RENEW] Error:", err.message);
      
      if (err.message.includes("not found") || err.message.includes("does not have")) {
        return sendError(res, err.message, 404);
      }

      return sendError(
        res,
        "Unable to renew the subscription. Please try again.",
        500
      );
    }
  }

  /**
   * POST /admin/subscriptions/cancel
   * Cancel a user's subscription (admin only)
   */
  async cancelSubscription(req: Request, res: Response) {
    try {
      const admin = (req as AdminRequest).admin;
      if (!admin) {
        return sendError(res, "Your session has expired. Please log in again.", 401);
      }

      const { parent_id, reason } = req.body;

      if (!parent_id) {
        return sendError(res, "parent_id is required", 400);
      }

      // Log admin action
      console.log(
        `[ADMIN SUBSCRIPTION] Admin ${admin.email} cancelling subscription for parent ${parent_id}${reason ? ` (reason: ${reason})` : ""}`
      );

      const result = await adminSubscriptionService.cancelSubscription({
        parent_id,
        reason,
      });

      // Send confirmation email to user
      try {
        if (result.parent.email) {
          const userName = result.parent.first_name || result.parent.last_name
            ? `${result.parent.first_name || ""} ${result.parent.last_name || ""}`.trim()
            : "Valued User";
          
          await sendSubscriptionCancellationEmail(
            result.parent.email,
            userName,
            result.plan.name
          );
          console.log(`[ADMIN SUBSCRIPTION] Cancellation email sent to ${result.parent.email}`);
        }
      } catch (emailError: any) {
        console.error("[ADMIN SUBSCRIPTION] Failed to send cancellation email:", emailError.message);
        // Don't fail the request if email fails
      }

      return sendSuccess(
        res,
        {
          subscription: result.subscription,
          plan: result.plan,
          parent: result.parent,
        },
        "Subscription cancelled successfully"
      );
    } catch (err: any) {
      console.error("[ADMIN SUBSCRIPTION CANCEL] Error:", err.message);
      
      if (err.message.includes("not found") || err.message.includes("does not have")) {
        return sendError(res, err.message, 404);
      }

      return sendError(
        res,
        "Unable to cancel the subscription. Please try again.",
        500
      );
    }
  }

  /**
   * GET /admin/subscriptions/user/:parent_id
   * Get user subscription details (admin only)
   */
  async getUserSubscription(req: Request, res: Response) {
    try {
      const admin = (req as AdminRequest).admin;
      if (!admin) {
        return sendError(res, "Your session has expired. Please log in again.", 401);
      }

      const { parent_id } = req.params;

      if (!parent_id || Array.isArray(parent_id)) {
        return sendError(res, "parent_id is required", 400);
      }

      const result = await adminSubscriptionService.getUserSubscription(parent_id);

      return sendSuccess(res, result, "User subscription retrieved successfully");
    } catch (err: any) {
      console.error("[ADMIN SUBSCRIPTION GET] Error:", err.message);
      
      if (err.message.includes("not found")) {
        return sendError(res, err.message, 404);
      }

      return sendError(
        res,
        "Unable to retrieve subscription details. Please try again.",
        500
      );
    }
  }

  /**
   * GET /admin/subscriptions/manual-payments
   * List manual payment requests (optional status filter)
   */
  async listManualPayments(req: Request, res: Response) {
    try {
      const admin = (req as AdminRequest).admin;
      if (!admin) {
        return sendError(res, "Your session has expired. Please log in again.", 401);
      }
      const status = req.query.status as "pending" | "approved" | "rejected" | undefined;
      const list = await adminSubscriptionService.listManualPaymentRequests(status);
      return sendSuccess(res, list, "Manual payment requests retrieved successfully");
    } catch (err: any) {
      return sendError(res, err?.message ?? "Failed to list manual payment requests", 400);
    }
  }

  /**
   * GET /admin/subscriptions/manual-payments/:id
   * Get one manual payment request with screenshot and user details
   */
  async getManualPaymentById(req: Request, res: Response) {
    try {
      const admin = (req as AdminRequest).admin;
      if (!admin) {
        return sendError(res, "Your session has expired. Please log in again.", 401);
      }
      const { id } = req.params;
      if (!id) {
        return sendError(res, "Request ID is required", 400);
      }
      const request = await adminSubscriptionService.getManualPaymentRequestById(id as string);
      return sendSuccess(res, request, "Manual payment request retrieved successfully");
    } catch (err: any) {
      if (err?.message?.includes("not found")) {
        return sendError(res, err.message, 404);
      }
      return sendError(res, err?.message ?? "Failed to get manual payment request", 400);
    }
  }

  /**
   * POST /admin/subscriptions/manual-payments/:id/approve
   * Approve manual payment and upgrade/renew subscription
   */
  async approveManualPayment(req: Request, res: Response) {
    try {
      const admin = (req as AdminRequest).admin;
      if (!admin) {
        return sendError(res, "Your session has expired. Please log in again.", 401);
      }
      const { id } = req.params;
      if (!id) {
        return sendError(res, "Request ID is required", 400);
      }
      const updated = await adminSubscriptionService.approveManualPaymentRequest(id as string);
      return sendSuccess(res, updated, "Manual payment approved and subscription updated successfully");
    } catch (err: any) {
      if (err?.message?.includes("not found") || err?.message?.includes("already been processed")) {
        return sendError(res, err.message, 400);
      }
      return sendError(res, err?.message ?? "Failed to approve manual payment", 500);
    }
  }

  /**
   * POST /admin/subscriptions/manual-payments/:id/reject
   * Reject manual payment request
   */
  async rejectManualPayment(req: Request, res: Response) {
    try {
      const admin = (req as AdminRequest).admin;
      if (!admin) {
        return sendError(res, "Your session has expired. Please log in again.", 401);
      }
      const { id } = req.params;
      if (!id) {
        return sendError(res, "Request ID is required", 400);
      }
      const updated = await adminSubscriptionService.rejectManualPaymentRequest(id as string);
      return sendSuccess(res, updated, "Manual payment request rejected");
    } catch (err: any) {
      if (err?.message?.includes("not found") || err?.message?.includes("already been processed")) {
        return sendError(res, err.message, 400);
      }
      return sendError(res, err?.message ?? "Failed to reject manual payment", 500);
    }
  }
}

export default new AdminSubscriptionController();
