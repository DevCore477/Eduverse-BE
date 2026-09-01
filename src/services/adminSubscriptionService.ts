import prisma from "../config/prisma";
import { subscriptionService } from "./subscriptionService";

interface UpgradeSubscriptionDto {
  parent_id: string;
  plan_id: string;
}

interface RenewSubscriptionDto {
  parent_id: string;
  months?: number; // Optional: extend by months (default: based on plan)
}

interface CancelSubscriptionDto {
  parent_id: string;
  reason?: string;
}

type SubscriptionWithPlan = {
  id: string;
  parent_id: string;
  subscription_plan_id: string;
  status: string;
  start_date: Date | null;
  end_date: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
  subscription_plans: {
    id: string;
    plan_code: string;
    name: string;
    price: any;
    max_devices: number;
    max_profiles: number;
    allowed_years: string;
    description: string | null;
    created_at: Date | null;
  };
  payments: Array<{
    id: string;
    parent_subscription_id: string;
    chargily_session_id: string;
    amount: any;
    currency: string;
    status: string;
    payment_date: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
  }>;
};

class AdminSubscriptionService {
  /**
   * Helper function to check if a string is a valid UUID
   */
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Admin upgrade/downgrade subscription - directly change subscription without payment flow
   * If user has no subscription, creates a new one
   * If user has a subscription, cancels current and activates new one
   * Supports both upgrades (higher price) and downgrades (lower price)
   * Accepts either plan_id (UUID) or plan_code (string like "family", "basic")
   */
  async upgradeSubscription(dto: UpgradeSubscriptionDto) {
    const { parent_id, plan_id } = dto;

    // Validate parent exists
    const parent = await prisma.parents.findUnique({
      where: { id: parent_id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
      },
    });

    if (!parent) {
      throw new Error("User not found");
    }

    // Validate plan exists - support both plan_id (UUID) and plan_code (string)
    let newPlan;
    if (this.isUUID(plan_id)) {
      // If it's a UUID, look up by id
      newPlan = await prisma.subscription_plans.findUnique({
        where: { id: plan_id },
      });
    } else {
      // If it's not a UUID, assume it's a plan_code
      newPlan = await prisma.subscription_plans.findUnique({
        where: { plan_code: plan_id },
      });
    }

    if (!newPlan) {
      throw new Error("Subscription plan not found");
    }

    // Check if user already has an active subscription with this plan
    const existingActiveSubscription = await prisma.parent_subscriptions.findFirst({
      where: {
        parent_id,
        subscription_plan_id: newPlan.id,
        status: "active",
      },
      include: {
        subscription_plans: true,
      },
    });

    if (existingActiveSubscription) {
      throw new Error("User already has an active subscription with this plan");
    }

    // Get current active subscription (for cancellation and profile enforcement)
    const currentSubscription = await subscriptionService.getCurrentActiveSubscription(
      parent_id
    );

    // Check if there's a pending upgrade to the same plan
    // Admin can override pending subscriptions, so we'll cancel it
    const pendingUpgrade = await prisma.parent_subscriptions.findFirst({
      where: {
        parent_id,
        subscription_plan_id: newPlan.id,
        status: "pending",
      },
    });

    // Cancel pending upgrade if exists (admin override)
    if (pendingUpgrade) {
      await prisma.parent_subscriptions.update({
        where: { id: pendingUpgrade.id },
        data: {
          status: "cancelled",
          updated_at: new Date(),
        },
      });
    }

    // Cancel current subscription if exists
    if (currentSubscription) {
      await prisma.parent_subscriptions.update({
        where: { id: currentSubscription.id },
        data: {
          status: "cancelled",
          updated_at: new Date(),
        },
      });
    }

    // Calculate end date based on plan
    const endDate = this.calculateEndDate(newPlan.allowed_years);

    // Create new active subscription using the actual plan UUID
    const newSubscription = await prisma.parent_subscriptions.create({
      data: {
        parent_id,
        subscription_plan_id: newPlan.id,
        status: "active",
        start_date: new Date(),
        end_date: endDate,
        is_manual_payment_under_review: false,
      },
      include: {
        subscription_plans: true,
      },
    });

    await prisma.parents.update({
      where: {
        id: parent_id,
      },
      data: {
        trial_status: "converted", // Mark as converted to paid subscription
        trial_end_date: new Date(), // Set trial end date to now
      },
    });
    
    // Enforce max profiles if downgrade in profiles
    if (currentSubscription) {
      const currentMax = currentSubscription.subscription_plans?.max_profiles ?? 0;
      const newMax = newPlan.max_profiles;
      if (currentMax > newMax) {
        await subscriptionService.enforceMaxProfiles(parent_id);
      }
    }

    return {
      subscription: newSubscription,
      previous_subscription: currentSubscription,
      plan: newPlan,
      parent: {
        id: parent.id,
        email: parent.email,
        first_name: parent.first_name,
        last_name: parent.last_name,
      },
    };
  }

  /**
   * Admin renew subscription - extend the current subscription
   * Can renew both active and expired subscriptions
   */
  async renewSubscription(dto: RenewSubscriptionDto) {
    const { parent_id, months } = dto;

    // Validate parent exists
    const parent = await prisma.parents.findUnique({
      where: { id: parent_id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
      },
    });

    if (!parent) {
      throw new Error("User not found");
    }

    // Get the most recent subscription (active or expired) - prioritize active, then expired
    const activeSubscription = await subscriptionService.getCurrentActiveSubscription(
      parent_id
    );

    let currentSubscription = activeSubscription;

    // If no active subscription, try to find the most recent expired subscription
    if (!currentSubscription) {
      currentSubscription = await prisma.parent_subscriptions.findFirst({
        where: {
          parent_id,
          status: "expired",
        },
        include: {
          subscription_plans: true,
        },
        orderBy: {
          created_at: "desc",
        },
      });
    }

    // If still no subscription found, check for cancelled subscriptions
    if (!currentSubscription) {
      currentSubscription = await prisma.parent_subscriptions.findFirst({
        where: {
          parent_id,
          status: "cancelled",
        },
        include: {
          subscription_plans: true,
        },
        orderBy: {
          created_at: "desc",
        },
      });
    }

    if (!currentSubscription) {
      throw new Error("User does not have a subscription to renew. Please upgrade to create a new subscription.");
    }

    const plan = currentSubscription.subscription_plans;
    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    // Calculate new end date
    let newEndDate: Date;
    if (months) {
      // Extend by specified months from today (not from expired date)
      newEndDate = new Date();
      newEndDate.setMonth(newEndDate.getMonth() + months);
    } else {
      // Extend by plan's allowed years from today
      newEndDate = new Date();
      newEndDate.setFullYear(
        newEndDate.getFullYear() + parseInt(plan.allowed_years)
      );
    }

    // Update subscription - reactivate if expired/cancelled, or just update end date if active
    const updatedSubscription = await prisma.parent_subscriptions.update({
      where: { id: currentSubscription.id },
      data: {
        status: "active",
        start_date: currentSubscription.status === "active" ? currentSubscription.start_date : new Date(),
        end_date: newEndDate,
        updated_at: new Date(),
      },
      include: {
        subscription_plans: true,
      },
    });

    return {
      subscription: updatedSubscription,
      plan,
      parent: {
        id: parent.id,
        email: parent.email,
        first_name: parent.first_name,
        last_name: parent.last_name,
      },
    };
  }

  /**
   * Admin cancel subscription
   */
  async cancelSubscription(dto: CancelSubscriptionDto) {
    const { parent_id, reason } = dto;

    // Validate parent exists
    const parent = await prisma.parents.findUnique({
      where: { id: parent_id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
      },
    });

    if (!parent) {
      throw new Error("User not found");
    }

    // Get current active subscription
    const currentSubscription = await subscriptionService.getCurrentActiveSubscription(
      parent_id
    );

    if (!currentSubscription) {
      throw new Error("User does not have an active subscription to cancel");
    }

    // Cancel subscription
    const cancelledSubscription = await prisma.parent_subscriptions.update({
      where: { id: currentSubscription.id },
      data: {
        status: "cancelled",
        updated_at: new Date(),
      },
      include: {
        subscription_plans: true,
      },
    });

    return {
      subscription: cancelledSubscription,
      plan: cancelledSubscription.subscription_plans,
      parent: {
        id: parent.id,
        email: parent.email,
        first_name: parent.first_name,
        last_name: parent.last_name,
      },
      reason: reason || null,
    };
  }

  /**
   * Get user subscription details
   */
  async getUserSubscription(parentId: string) {
    const parent = await prisma.parents.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        parent_subscriptions: {
          orderBy: { created_at: "desc" },
          include: {
            subscription_plans: true,
            payments: {
              orderBy: { created_at: "desc" },
              take: 5, // Last 5 payments
            },
          },
        },
      },
    });

    if (!parent) {
      throw new Error("User not found");
    }

    const activeSubscription = parent.parent_subscriptions.find(
      (sub: SubscriptionWithPlan) => sub.status === "active"
    );

    return {
      parent: {
        id: parent.id,
        email: parent.email,
        first_name: parent.first_name,
        last_name: parent.last_name,
      },
      active_subscription: activeSubscription || null,
      all_subscriptions: parent.parent_subscriptions,
    };
  }

  /**
   * Calculate end date based on allowed years
   */
  private calculateEndDate(allowedYears: string): Date {
    const years = parseInt(allowedYears) || 1;
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + years);
    return endDate;
  }

  /**
   * List manual payment requests (admin). Optional status filter. Excludes screenshot to keep list payload small.
   */
  async listManualPaymentRequests(status?: "pending" | "approved" | "rejected") {
    const where = status ? { status } : {};
    const list = await prisma.manual_payment_requests.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        parents: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          },
        },
        subscription_plans: true,
      },
    });
    type Row = (typeof list)[number];
    return list.map((item: Row) => {
      const { screenshot_base64, ...rest } = item;
      void screenshot_base64; // exclude from list response
      return rest;
    });
  }

  /**
   * Get one manual payment request by id (admin) – includes screenshot for viewing.
   */
  async getManualPaymentRequestById(requestId: string) {
    const request = await prisma.manual_payment_requests.findUnique({
      where: { id: requestId },
      include: {
        parents: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          },
        },
        subscription_plans: true,
      },
    });
    if (!request) {
      throw new Error("Manual payment request not found");
    }
    return request;
  }

  /**
   * Approve manual payment request: upgrade or renew parent subscription based on request_type.
   */
  async approveManualPaymentRequest(requestId: string) {
    const request = await prisma.manual_payment_requests.findUnique({
      where: { id: requestId },
      include: {
        parents: true,
        subscription_plans: true,
      },
    });
    if (!request) {
      throw new Error("Manual payment request not found");
    }
    if (request.status !== "pending") {
      throw new Error("This request has already been processed");
    }

    const parentId = request.parent_id;
    const planId = request.subscription_plan_id;

    if (request.request_type === "renew") {
      await this.renewSubscription({ parent_id: parentId });
    } else {
      await this.upgradeSubscription({ parent_id: parentId, plan_id: planId });
    }

    await prisma.manual_payment_requests.update({
      where: { id: requestId },
      data: {
        status: "approved",
        reviewed_at: new Date(),
      },
    });

    return this.getManualPaymentRequestById(requestId);
  }

  /**
   * Reject manual payment request.
   */
  async rejectManualPaymentRequest(requestId: string) {
    const request = await prisma.manual_payment_requests.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new Error("Manual payment request not found");
    }
    if (request.status !== "pending") {
      throw new Error("This request has already been processed");
    }

    await prisma.manual_payment_requests.update({
      where: { id: requestId },
      data: {
        status: "rejected",
        reviewed_at: new Date(),
      },
    });

    return this.getManualPaymentRequestById(requestId);
  }
}

export default new AdminSubscriptionService();
