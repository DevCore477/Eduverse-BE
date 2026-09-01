import prisma from "../config/prisma";
import { chargilyConfig } from "../config/chargily";
import {
  ChargilyCheckoutResponse,
  ParentSubscription,
  Payment,
} from "../types/response";

class SubscriptionService {
  // ========== Public Methods ==========
  private readonly ENABLE_CHARGILY = true;
  async getAllSubscriptions() {
    return prisma.subscription_plans.findMany({
      orderBy: { price: "asc" },
    });
  }

  async createParentSubscription(parentId: string, planId: string, isUpgrade: boolean) {
    await this.validateParentExists(parentId);

    const plan = await this.validatePlanExists(planId); // ✅ PLAN fetched once

    const subscription = await this.createPendingSubscription(parentId, planId);

    if (!this.ENABLE_CHARGILY) {
      const payment = await prisma.payments.create({
        data: {
          parent_subscription_id: subscription.id,
          amount: plan.price,
          currency: chargilyConfig.currency,
          status: "paid",
          chargily_session_id: `manual-${crypto.randomUUID()}`,
        },
      });

      const activeSub = await this.updateSubscriptionStatus(
        subscription.id,
        "active",
        this.calculateEndDate(plan.allowed_years)
      );

      return {
        subscription: activeSub,
        plan,
        payment,
        checkout_url: null,
        isExisting: false,
        isActive: true,
        chargily_disabled: true,
      };
    }

    const checkout = await this.createChargilyCheckout(plan, { isUpgrade: isUpgrade });
    const payment = await this.createPaymentRecord(
      subscription.id,
      plan,
      checkout
    );

    return {
      subscription,
      plan, // ✅ also returned here
      payment,
      checkout_url: checkout.checkout_url,
      isExisting: false,
      isActive: false,
      chargily_disabled: false,
    };
  }

  async upgradeSubscription(parentId: string, newPlanId: string) {
    const newPlan = await this.validatePlanExists(newPlanId);

    const currentSubscription = await this.getCurrentActiveSubscription(
      parentId
    );

    if (!currentSubscription) {
      return await this.createParentSubscription(parentId, newPlanId, true);
    }

    if (currentSubscription.subscription_plans?.id === newPlanId) {
      return {
        isExisting: true,
        isActive: true,
        alreadyActive: true,
        message: "This plan is already your current active plan.",
        subscription: currentSubscription,
        payment: null,
        checkout_url: null,
      };
    }
    await this.updateSubscriptionStatus(
      currentSubscription.id,
      "cancelled",
      null
    );

    const newSubscription = await this.createPendingSubscription(
      parentId,
      newPlan.id
    );

    const plan = {
      ...newPlan,
      name: `Upgrade to ${newPlan.name}`,
    }
    const checkout = await this.createChargilyCheckout(
      plan,
      { isUpgrade: true }
    );

    const payment = await this.createPaymentRecord(
      newSubscription.id,
      newPlan,
      checkout
    );

    return {
      subscription: newSubscription,
      payment,
      checkout_url: checkout.checkout_url,
      current_subscription: currentSubscription,
      isUpgrade: true,
    };
  }

  async handlePaymentSuccess(subscription: any) {
    return await this.confirmPayment(subscription.id, "paid");
  }

  async handlePaymentFailure(checkoutId: string) {
    const payment = await this.fetchPaymentWithSubscription(checkoutId);
    const subscription = payment.parent_subscriptions;
    if (!subscription) throw new Error("Subscription not found");
    await this.updateSubscriptionStatus(subscription.id, "cancelled", null);
    const updatedPayment = await this.updatePaymentStatus(payment.id, "failed");

    return { subscription, payment: updatedPayment };
  }

  async confirmPayment(subscriptionId: string, status: "paid" | "failed") {
    const subscriptionData = await this.getSubscriptionWithPlan(subscriptionId);
    const plan = subscriptionData.subscription_plans;

    const updatedSub = await this.updateSubscriptionStatus(
      subscriptionId,
      status === "paid" ? "active" : "pending",
      status === "paid" ? this.calculateEndDate(plan.allowed_years) : null
    );

    const updatedPayment = await this.updatePaymentStatusBySubscription(
      subscriptionId,
      status
    );

    if (status === "paid") {
      const parent = await prisma.parents.findUnique({
        where: { id: subscriptionData.parent_id },
        select: { trial_status: true },
      });

      if (parent?.trial_status === "active") {
        await prisma.parents.update({
          where: { id: subscriptionData.parent_id },
          data: {
            trial_status: "converted",
            trial_end_date: new Date(), // optional but recommended
          },
        });
      }
    }

    return { subscription: updatedSub, payment: updatedPayment };
  }

  /**
   * Submit manual payment request with screenshot (base64). Creates manual_payment_requests record.
   */
  async requestManualPaymentApproval(params: {
    parentId: string;
    planId: string;
    requestType: "upgrade" | "renew";
    screenshotBase64: string;
    amount?: number;
    note?: string;
  }) {
    const { parentId, planId, requestType, screenshotBase64, amount, note } = params;

    if (!parentId || !planId) {
      throw new Error("Parent ID and Plan ID are required");
    }

    const parent = await prisma.parents.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw new Error("Parent not found");
    }

    const plan = await prisma.subscription_plans.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    // One pending request per (parent, plan) to avoid duplicates
    const existingPending = await prisma.manual_payment_requests.findFirst({
      where: {
        parent_id: parentId,
        subscription_plan_id: planId,
        status: "pending",
      },
    });
    if (existingPending) {
      throw new Error("You already have a pending manual payment request for this plan. Wait for admin review.");
    }

    const request = await prisma.manual_payment_requests.create({
      data: {
        parent_id: parentId,
        subscription_plan_id: planId,
        request_type: requestType,
        status: "pending",
        screenshot_base64: screenshotBase64,
        amount: amount != null ? amount : plan.price,
        currency: "USD",
        note: note ?? null,
      },
      include: {
        subscription_plans: true,
      },
    });

    console.log(`Manual payment request created:`, {
      id: request.id,
      parentId,
      planId: plan.id,
      requestType,
      timestamp: new Date().toISOString(),
    });

    return {
      id: request.id,
      plan: plan.name,
      status: "pending",
      request_type: requestType,
      requestedAt: request.created_at,
    };
  }

  /**
   * Get manual payment requests for admin (uses manual_payment_requests table)
   */
  async getPendingManualPayments() {
    return await prisma.manual_payment_requests.findMany({
      where: { status: "pending" },
      orderBy: { created_at: "desc" },
      include: {
        parents: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true
          }
        },
        subscription_plans: true,
      },
    });
  }

  /**
   * Get manual payment requests for a parent (for app to show status). Excludes screenshot to keep payload small.
   */
  async getManualPaymentRequestsByParentId(parentId: string) {
    const list = await prisma.manual_payment_requests.findMany({
      where: { parent_id: parentId },
      orderBy: { created_at: "desc" },
      include: {
        subscription_plans: {
          select: { id: true, name: true, plan_code: true, price: true },
        },
      },
    });
    return list.map(({ screenshot_base64: _, ...rest }: { screenshot_base64: unknown; [key: string]: unknown }) => rest);
  }

  /**
   * Process manual payment approval/rejection (legacy: by parent_subscription id; prefer admin manual payment APIs)
   */
  async processManualPaymentReview(
    subscriptionId: string,
    adminId: string,
    action: 'approve' | 'reject',
    reason?: string
  ) {
    // Use transaction for data consistency
    return await prisma.$transaction(async (prisma: any) => {
      // Get subscription details
      const subscription = await prisma.parent_subscriptions.findUnique({
        where: { id: subscriptionId },
        include: {
          subscription_plans: true,
          parents: true,
          payments: {
            orderBy: { created_at: "desc" },
            take: 1
          }
        }
      });

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      if (!subscription.is_manual_payment_under_review) {
        throw new Error("This subscription is not under manual payment review");
      }

      let updatedSubscription;
      let paymentStatus: "created" | "paid" | "failed";

      if (action === 'approve') {
        // APPROVE FLOW
        // Cancel any other active subscriptions for this parent
        await prisma.parent_subscriptions.updateMany({
          where: {
            parent_id: subscription.parent_id,
            id: { not: subscriptionId },
            status: "active"
          },
          data: { status: "cancelled" }
        });

        // Calculate end date based on plan
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + parseInt(subscription.subscription_plans.allowed_years));

        // Activate this subscription
        updatedSubscription = await prisma.parent_subscriptions.update({
          where: { id: subscriptionId },
          data: {
            status: "active",
            start_date: new Date(),
            end_date: endDate,
            is_manual_payment_under_review: false,
            updated_at: new Date()
          },
          include: {
            subscription_plans: true,
            parents: true
          }
        });

        paymentStatus = "paid";

        // If parent was on trial, mark as converted
        if (subscription.parents?.trial_status === "active") {
          await prisma.parents.update({
            where: { id: subscription.parent_id },
            data: {
              trial_status: "converted",
              trial_end_date: new Date()
            }
          });
        }
      } else {
        // REJECT FLOW
        updatedSubscription = await prisma.parent_subscriptions.update({
          where: { id: subscriptionId },
          data: {
            status: "cancelled",
            is_manual_payment_under_review: false,
            updated_at: new Date()
          },
          include: {
            subscription_plans: true,
            parents: true
          }
        });

        paymentStatus = "failed";
      }

      // Update the payment record
      await prisma.payments.updateMany({
        where: { parent_subscription_id: subscriptionId },
        data: {
          status: paymentStatus,
          payment_date: action === 'approve' ? new Date() : null,
          updated_at: new Date()
        }
      });

      // Log the admin action (you can create an admin_logs table if needed)
      console.log(`Manual payment ${action}ed by admin ${adminId} for subscription ${subscriptionId}`, {
        reason: reason || null,
        timestamp: new Date().toISOString()
      });

      return {
        subscription: updatedSubscription,
        action,
        paymentStatus,
        ...(action === 'reject' && { reason })
      };
    });
  }

  /**
   * Get manual payment status for a parent
   */
  async getManualPaymentStatus(subscriptionId: string, parentId: string) {
    const subscription = await prisma.parent_subscriptions.findFirst({
      where: {
        id: subscriptionId,
        parent_id: parentId
      },
      include: {
        subscription_plans: true,
        payments: {
          orderBy: { created_at: "desc" },
          take: 1
        }
      }
    });

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Determine status message and code
    let statusMessage = "";
    let statusCode = "pending";
    let canRetry = false;

    if (subscription.status === "active") {
      statusMessage = "Your subscription is active! You can now access all features.";
      statusCode = "active";
      canRetry = false;
    } else if (subscription.is_manual_payment_under_review) {
      statusMessage = "Your manual payment is under review by admin. This usually takes 24-48 hours.";
      statusCode = "under_review";
      canRetry = false;
    } else if (subscription.status === "pending") {
      statusMessage = "Your subscription is pending.";
      statusCode = "pending";
      canRetry = true;
    } else if (subscription.status === "cancelled") {
      if (subscription.is_manual_payment_under_review === false) {
        statusMessage = "Your manual payment request was rejected. Please contact support or try again.";
        statusCode = "rejected";
        canRetry = true;
      } else {
        statusMessage = "Your subscription was cancelled.";
        statusCode = "cancelled";
        canRetry = false;
      }
    }

    return {
      id: subscription.id,
      plan: {
        id: subscription.subscription_plans.id,
        name: subscription.subscription_plans.name,
        price: subscription.subscription_plans.price,
        max_profiles: subscription.subscription_plans.max_profiles
      },
      status: subscription.status,
      isUnderReview: subscription.is_manual_payment_under_review,
      startDate: subscription.start_date,
      endDate: subscription.end_date,
      payment: subscription.payments[0] || null,
      message: statusMessage,
      statusCode: statusCode,
      canRetry: canRetry,
      requestedAt: subscription.created_at
    };
  }

  // ========== Private Helper Methods ==========

  private async validateParentExists(parentId: string) {
    const parent = await prisma.parents.findUnique({
      where: { id: parentId },
      select: { id: true },
    });

    if (!parent) throw new Error("Invalid parent ID. Parent does not exist.");
  }

  private async validatePlanExists(planId: string) {
    const plan = await prisma.subscription_plans.findUnique({
      where: { id: planId },
    });

    if (!plan)
      throw new Error("Invalid plan ID. Subscription plan does not exist.");
    return plan;
  }

  private async checkExistingPendingPayment(parentId: string, planId: string) {
    const existingSubscription = await prisma.parent_subscriptions.findFirst({
      where: {
        parent_id: parentId,
        subscription_plan_id: planId,
        status: "pending",
      },
      include: { payments: true },
      orderBy: { created_at: "desc" },
    });

    if (!existingSubscription) return null;

    const pendingPayment = existingSubscription.payments.find(
      (p: { status: string; chargily_session_id: string }) =>
        p.status === "created" || p.status === "pending"
    );

    if (pendingPayment) {
      const checkoutData = await this.fetchChargilyCheckout(
        pendingPayment.chargily_session_id
      );
      if (checkoutData) {
        return {
          subscription: existingSubscription,
          payment: pendingPayment,
          checkout_url: checkoutData.checkout_url,
          isExisting: true,
        };
      }
    }

    return null;
  }

  private async checkActivePaidSubscription(parentId: string) {
    const data = await prisma.parent_subscriptions.findFirst({
      where: { parent_id: parentId, status: "active" },
      include: { payments: true },
      orderBy: { created_at: "desc" },
    });

    if (!data) return null;

    const paidPayment = data.payments.find(
      (p: { status: string }) => p.status === "paid"
    );
    if (!paidPayment) return null;

    return {
      block: true,
      message:
        "You already have an active subscription. Please cancel or upgrade before purchasing another plan.",
      subscription: data,
      payment: paidPayment,
      checkout_url: null,
    };
  }

  private async checkSamePlanActive(parentId: string, planId: string) {
    const data = await prisma.parent_subscriptions.findFirst({
      where: {
        parent_id: parentId,
        subscription_plan_id: planId,
        status: "active",
      },
    });

    if (!data) return null;

    return {
      isActive: true,
      subscription: data,
      payment: null,
      checkout_url: null,
    };
  }

  private async getExistingSubscription(parentId: string, planId: string) {
    const activePaid = await this.checkActivePaidSubscription(parentId);
    if (activePaid) {
      return { ...activePaid, isExisting: true, isActive: true };
    }

    const samePlanActive = await this.checkSamePlanActive(parentId, planId);
    if (samePlanActive) {
      return { ...samePlanActive, isExisting: true, isActive: true };
    }

    const existingPending = await this.checkExistingPendingPayment(
      parentId,
      planId
    );
    if (existingPending) {
      return { ...existingPending, isExisting: true, isActive: false };
    }

    return null;
  }

  public async getCurrentActiveSubscription(parentId: string) {
    const paymets = await prisma.parent_subscriptions.findMany({ where: { parent_id: parentId } })
    return prisma.parent_subscriptions.findFirst({
      where: { parent_id: parentId, status: "cancelled" },
      include: { subscription_plans: true },
      orderBy: { created_at: "desc" },
    });
  }

  private async getSubscriptionWithPlan(subscriptionId: string) {
    const data = await prisma.parent_subscriptions.findUnique({
      where: { id: subscriptionId },
      include: { subscription_plans: true },
    });

    if (!data) throw new Error("Subscription not found");
    return data;
  }

  private async createPendingSubscription(parentId: string, planId: string) {
    try {
      return await prisma.parent_subscriptions.create({
        data: {
          parent_id: parentId,
          subscription_plan_id: planId,
          status: "pending",
        },
      });
    } catch (err: any) {
      throw new Error(err?.message || "Failed to create pending subscription");
    }
  }

  private async createChargilyCheckout(plan: any, options?: { isUpgrade?: boolean }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      let successUrl = chargilyConfig.successUrl;
      if (options?.isUpgrade) {
        const url = new URL(successUrl);
        url.searchParams.set("isUpgrade", "true");
        successUrl = url.toString();
      }
      console.log("successUrl", successUrl);

      const response = await fetch(chargilyConfig.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${chargilyConfig.secretKey}`,
        },
        body: JSON.stringify({
          amount: plan.price,
          currency: chargilyConfig.currency,
          description: plan.name,
          success_url: successUrl,
          failure_url: chargilyConfig.failureUrl,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to create checkout session");
      }

      return data;
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("Chargily request timed out");
      }

      console.error("Chargily checkout error:", error);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchChargilyCheckout(
    checkoutId: string
  ): Promise<ChargilyCheckoutResponse | null> {
    try {
      const response = await fetch(
        `${chargilyConfig.apiEndpoint}/${checkoutId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${chargilyConfig.secretKey}`,
          },
        }
      );

      if (!response.ok) return null;

      return (await response.json()) as ChargilyCheckoutResponse;
    } catch {
      return null;
    }
  }

  private async createPaymentRecord(
    subscriptionId: string,
    plan: any,
    checkout: any
  ) {
    try {
      return await prisma.payments.create({
        data: {
          parent_subscription_id: subscriptionId,
          chargily_session_id: checkout.id,
          amount: plan.price,
          currency: chargilyConfig.currency,
          status: "created",
        },
      });
    } catch (err: any) {
      throw new Error(err?.message || "Failed to save payment record");
    }
  }

  public async fetchPaymentWithSubscription(checkoutId: string) {
    const data = await prisma.payments.findFirst({
      where: { chargily_session_id: checkoutId },
      include: {
        parent_subscriptions: {
          include: { subscription_plans: true },
        },
      },
    });

    if (!data) throw new Error("Payment not found");
    return data;
  }

  async verifyChargilyPayment(checkoutId: string): Promise<boolean> {
    const checkoutData = await this.fetchChargilyCheckout(checkoutId);
    return checkoutData?.status === "paid";
  }

  private calculateEndDate(allowedYears: string): Date {
    return new Date(
      new Date().setFullYear(new Date().getFullYear() + parseInt(allowedYears))
    );
  }

  private async updateSubscriptionStatus(
    subscriptionId: string,
    status: string,
    endDate: Date | null
  ) {
    try {
      return await prisma.parent_subscriptions.update({
        where: { id: subscriptionId },
        data: {
          status,
          start_date: status === "active" ? new Date() : null,
          end_date: endDate,
        },
        include: {
          subscription_plans: true  // This will include the related plan
        }
      });
    } catch (err: any) {
      throw new Error(err?.message || "Failed to update subscription");
    }
  }

  private async updatePaymentStatus(paymentId: string, status: string) {
    try {
      return await prisma.payments.update({
        where: { id: paymentId },
        data: { status },
      });
    } catch (err: any) {
      throw new Error(err?.message || "Failed to update payment");
    }
  }

  private async updatePaymentStatusBySubscription(
    subscriptionId: string,
    status: string
  ) {
    const payment = await prisma.payments.findFirst({
      where: { parent_subscription_id: subscriptionId },
      orderBy: { created_at: "desc" },
    });
    if (!payment) throw new Error("Payment not found");

    return this.updatePaymentStatus(payment.id, status);
  }

  private buildSubscriptionResponse(
    subscription: ParentSubscription,
    payment: Payment | null,
    checkout: { checkout_url: string }
  ) {
    return {
      subscription,
      payment,
      checkout_url: checkout.checkout_url,
      isExisting: false,
      isActive: false,
    };
  }
  async getPaymentHistoryByParent(parentId: string) {
    return prisma.payments.findMany({
      where: {
        parent_subscriptions: {
          parent_id: parentId,
        },
      },
      include: {
        parent_subscriptions: {
          include: {
            subscription_plans: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });
  }
  async enforceMaxProfiles(parentId: string) {
    const pupils = await prisma.pupils.findMany({
      where: { parent_id: parentId },
      orderBy: { created_at: "desc" },
      select: { id: true, status: true },
    });

    if (pupils.length === 0) return;

    // console.log("🔵 Pupils BEFORE update:");
    // console.log(JSON.stringify(pupils, null, 2));

    const latestPupil = pupils[0];
    const otherPupils = pupils.slice(1).map((p: any) => p.id);

    await prisma.pupils.update({
      where: { id: latestPupil.id },
      data: { status: "active" },
    });

    if (otherPupils.length > 0) {
      await prisma.pupils.updateMany({
        where: { id: { in: otherPupils } },
        data: { status: "inactive" },
      });
    }

    // 🔥 Fetch again AFTER update
    const updatedPupils = await prisma.pupils.findMany({
      where: { parent_id: parentId },
      orderBy: { created_at: "desc" },
      select: { id: true, status: true },
    });

    // console.log("🟢 Pupils AFTER update:");
    // console.log(JSON.stringify(updatedPupils, null, 2));
  }
}

export const subscriptionService = new SubscriptionService();
