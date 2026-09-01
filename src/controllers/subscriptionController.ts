import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { subscriptionService } from "../services/subscriptionService";
import { chargilyConfig } from "../config/chargily";
import crypto from "crypto";
class SubscriptionController {
  async getSubscriptions(req: Request, res: Response) {
    try {
      const subscriptions = await subscriptionService.getAllSubscriptions();
      return sendSuccess(
        res,
        subscriptions,
        "Subscriptions fetched successfully"
      );
    } catch (error: any) {
      return sendError(
        res,
        error?.message ?? "Failed to fetch subscriptions",
        400
      );
    }
  }
  async purchaseSubscription(req: Request, res: Response) {
    try {
      const { parent_id, plan_id } = req.body;

      if (!parent_id || !plan_id) {
        return sendError(res, "parent_id and plan_id are required", 400);
      }
      const result = await subscriptionService.createParentSubscription(
        parent_id,
        plan_id,
        false
      );

      if (result.isActive) {
        return sendSuccess(
          res,
          result,
          "You already have an active subscription. Please cancel or upgrade before purchasing another plan."
        );
      }

      if (result.isExisting) {
        return sendSuccess(
          res,
          result,
          "You have an existing pending payment. Please complete it to continue."
        );
      }

      return sendSuccess(res, result, "Checkout session created successfully");
    } catch (error: any) {
      return sendError(
        res,
        error?.message ?? "Failed to create subscription",
        400
      );
    }
  }

  async paymentSuccess(req: Request, res: Response) {
    try {
      const checkout_id = req.query.checkout_id as string;
      const isUpgrade = req.query.isUpgrade === "true";
      if (!checkout_id) {
        return sendError(res, "checkout_id is required", 400);
      }

      const isPaymentVerified = await subscriptionService.verifyChargilyPayment(checkout_id);
      if (!isPaymentVerified) {
        return sendError(res, "Payment not verified with Chargily", 400);
      }

      const payment = await subscriptionService.fetchPaymentWithSubscription(
        checkout_id
      );

      const subscription = payment.parent_subscriptions;
      const parentId = payment.parent_subscriptions.parent_id;
      if (!subscription) throw new Error("Subscription not found");

      if (payment.status === "paid") {
        return {
          subscription,
          payment,
          alreadyVerified: true,
          message: "Payment has already been verified and processed",
        };
      }
      const currentSubscription =
        await subscriptionService.getCurrentActiveSubscription(parentId);
      const result = await subscriptionService.handlePaymentSuccess(
        subscription
      );

      if (isUpgrade) {
        const parentId = result.subscription.parent_id;
        const newPlan = result.subscription.subscription_plans;
        // Fix 1: Get max_profiles from both
        const currentMax = currentSubscription?.subscription_plans?.max_profiles ?? 0;
        const newMax = newPlan?.max_profiles ?? 0;
        // Fix 2: Remove the garbage characters
        const isDowngrade = currentMax > newMax;
        if (isDowngrade) {
          await subscriptionService.enforceMaxProfiles(parentId);
        }
      }

      const deepLink = isUpgrade
        ? "nedjmatiapp://parent-payments"
        : "nedjmatiapp://lets-start";
      res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Payment Success</title>
        <meta http-equiv="refresh" content="0;url=${deepLink}" />
      </head>
      <body>
        <p>Redirecting to app...</p>
        <script>
          window.location.href = "${deepLink}";
        </script>
      </body>
    </html>
  `);
    } catch (error: any) {
      console.error("Payment success error:", error);
      return sendError(res, error?.message ?? "Failed to confirm payment", 400);
    }
  }

  async paymentFailure(req: Request, res: Response) {
    try {
      const { checkout_id } = req.query;
      if (!checkout_id || typeof checkout_id !== "string") {
        return sendError(res, "checkout_id is required", 400);
      }

      const result = await subscriptionService.handlePaymentFailure(
        checkout_id
      );

      const deepLink = "nedjmatiapp://pricing-plans?status=fail";

      res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Payment Failed</title>
        <meta http-equiv="refresh" content="0;url=${deepLink}" />
      </head>
      <body>
        <p>Redirecting to app...</p>
        <script>
          window.location = "${deepLink}";
        </script>
      </body>
    </html>
  `);
    } catch (error: any) {
      return sendError(
        res,
        error?.message ?? "Failed to record payment failure",
        400
      );
    }
  }

  async upgradeSubscription(req: Request, res: Response) {
    try {
      const { parent_id, plan_id } = req.body;

      if (!parent_id || !plan_id) {
        return sendError(res, "parent_id and plan_id are required", 400);
      }

      const result = await subscriptionService.upgradeSubscription(
        parent_id,
        plan_id
      );

      if ("alreadyActive" in result && result.alreadyActive) {
        return sendSuccess(
          res,
          result,
          "This plan is already your current active subscription"
        );
      }

      if ("isUpgrade" in result && result.isUpgrade) {
        return sendSuccess(
          res,
          result,
          "Upgrade checkout session created successfully"
        );
      }

      // New subscription case
      return sendSuccess(res, result, "Subscription created successfully");
    } catch (error: any) {
      return sendError(
        res,
        error?.message ?? "Failed to create upgrade subscription",
        400
      );
    }
  }

  async webhook(req: Request, res: Response) {
    try {
      const signature = req.header("signature");
      console.log("signature", signature);
      const payload = JSON.stringify(req.body);
      console.log("payload", payload);
      if (!signature) return res.sendStatus(400);

      const computedSignature = crypto
        .createHmac("sha256", chargilyConfig.secretKey)
        .update(payload)
        .digest("hex");

      if (computedSignature !== signature) return res.sendStatus(403);

      const event = req.body;

      switch (event.type) {
        case "checkout.paid":
          await subscriptionService.handlePaymentSuccess(event.data.id);
          console.log("Payment success handled for checkout:", event.data.id);
          break;

        case "checkout.failed":
          await subscriptionService.handlePaymentFailure(event.data.id);
          console.log("Payment failed handled for checkout:", event.data.id);
          break;

        default:
          console.log("Unhandled event type:", event.type);
      }

      res.status(200).send({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send({ error: "Webhook handler failed" });
    }
  }
  async getPaymentHistory(req: Request, res: Response) {
    try {
      const parentId = (req as any).user?.uid;

      if (!parentId) {
        return sendError(res, "User not authenticated", 401);
      }

      const payments = await subscriptionService.getPaymentHistoryByParent(
        parentId
      );

      return sendSuccess(res, payments, "Payment history fetched successfully");
    } catch (error: any) {
      return sendError(
        res,
        error?.message ?? "Failed to fetch payment history",
        400
      );
    }
  }

  async requestManualPayment(req: Request, res: Response) {
    try {
      const parentId = (req as any).user?.uid;
      if (!parentId) {
        return sendError(res, "User not authenticated", 401);
      }

      const { plan_id, request_type, screenshot_base64, amount, note } = req.body;

      if (!plan_id || !request_type || !screenshot_base64) {
        return sendError(
          res,
          "plan_id, request_type (upgrade or renew), and screenshot_base64 are required",
          400
        );
      }

      const { validateScreenshotBase64 } = await import("../dto/manual-payment.dto");
      validateScreenshotBase64(screenshot_base64);

      const result = await subscriptionService.requestManualPaymentApproval({
        parentId,
        planId: plan_id,
        requestType: request_type === "renew" ? "renew" : "upgrade",
        screenshotBase64: screenshot_base64,
        amount: amount != null ? Number(amount) : undefined,
        note: note,
      });

      return sendSuccess(
        res,
        result,
        "Manual payment request submitted successfully. An admin will review and activate your subscription shortly."
      );
    } catch (error: any) {
      console.error("Manual payment request error:", error);
      return sendError(
        res,
        error?.message ?? "Failed to submit manual payment request",
        400
      );
    }
  }

  /**
   * GET /subscriptions/manual-payment/requests – list current parent's manual payment requests (status only, no screenshot in list).
   */
  async getMyManualPaymentRequests(req: Request, res: Response) {
    try {
      const parentId = (req as any).user?.uid;
      if (!parentId) {
        return sendError(res, "User not authenticated", 401);
      }
      const list = await subscriptionService.getManualPaymentRequestsByParentId(parentId);
      return sendSuccess(res, list, "Manual payment requests fetched successfully");
    } catch (error: any) {
      return sendError(
        res,
        error?.message ?? "Failed to fetch manual payment requests",
        400
      );
    }
  }
}

export const subscriptionController = new SubscriptionController();
