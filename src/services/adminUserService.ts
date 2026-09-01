import prisma from "../config/prisma";
import { AdminUserListDto, SubscriptionStatusFilter } from "../dto/admin-user-list.dto";

interface UserListItem {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
}

interface PaginatedUserList {
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type ParentWithSubscription = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  parent_subscriptions: Array<{
    status: string;
    subscription_plans: {
      name: string;
    };
  }>;
};

class AdminUserService {
  /**
   * Get list of parents (users) with subscription information
   * Supports search by first name, last name, email
   * Supports filter by subscription status
   * Supports pagination
   */
  async getUserList(query: AdminUserListDto): Promise<PaginatedUserList> {
    const { search, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Build where clause for search
    const searchWhere = search
      ? {
          OR: [
            { first_name: { contains: search, mode: "insensitive" as const } },
            { last_name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    let parentWhere: any = searchWhere;
    if (status) {
      const subscriptionStatus = status.toLowerCase() as "active" | "expired" | "cancelled";
      parentWhere = {
        ...searchWhere,
        parent_subscriptions: {
          some: {
            status: subscriptionStatus,
          },
        },
      };
    }

    const parents = await prisma.parents.findMany({
      where: parentWhere,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        parent_subscriptions: {
          where: status
            ? {
                status: status.toLowerCase() as "active" | "expired" | "cancelled",
              }
            : undefined,
          orderBy: { created_at: "desc" },
          take: 1,
          select: {
            status: true,
            subscription_plans: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const users: UserListItem[] = parents
      .map((parent: ParentWithSubscription) => {
        const latestSubscription = parent.parent_subscriptions[0] || null;

        // If status filter is applied and no matching subscription found, exclude this parent
        if (status && !latestSubscription) {
          return null;
        }

        return {
          id: parent.id,
          email: parent.email,
          first_name: parent.first_name,
          last_name: parent.last_name,
          subscription_plan: latestSubscription?.subscription_plans?.name || null,
          subscription_status: latestSubscription?.status || null,
        };
      })
      .filter((user: UserListItem | null): user is UserListItem => user !== null);

    // Get accurate total count
    // If status filter is applied, count parents with matching subscription status
    let totalCount: number;
    if (status) {
      const subscriptionStatus = status.toLowerCase() as "active" | "expired" | "cancelled";
      // Count parents that have at least one subscription with the matching status
      totalCount = await prisma.parents.count({
        where: {
          ...searchWhere,
          parent_subscriptions: {
            some: {
              status: subscriptionStatus,
            },
          },
        },
      });
    } else {
      totalCount = await prisma.parents.count({
        where: searchWhere,
      });
    }

    const totalPages = Math.ceil(totalCount / limit);

    return {
      users,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    };
  }

  /**
   * Get date range based on filter type
   * Returns start date for filtering, or null if "all"
   */
  private getDateRange(dateFilter: "all" | "last_30_days" | "last_7_days" | "today"): Date | null {
    const now = new Date();
    
    switch (dateFilter) {
      case "today": {
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        return startOfToday;
      }
      case "last_7_days": {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return sevenDaysAgo;
      }
      case "last_30_days": {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return thirtyDaysAgo;
      }
      case "all":
      default:
        return null;
    }
  }

  /**
   * Get analytics for users and subscriptions
   * Returns comprehensive statistics for admin dashboard
   * @param dateFilter - Filter by date range: "all", "last_30_days", "last_7_days", "today"
   */
  async getAnalytics(dateFilter: "all" | "last_30_days" | "last_7_days" | "today" = "all") {
    const dateFrom = this.getDateRange(dateFilter);
    const dateWhere = dateFrom ? { gte: dateFrom } : undefined;

    // Total users count
    const totalUsers = await prisma.parents.count({
      where: dateWhere ? { created_at: dateWhere } : undefined,
    });

    // Users by subscription status
    const usersByStatus = await Promise.all([
      // Active subscriptions
      prisma.parents.count({
        where: {
          ...(dateWhere ? { created_at: dateWhere } : {}),
          parent_subscriptions: {
            some: {
              status: "active",
            },
          },
        },
      }),
      // Users without subscriptions
      prisma.parents.count({
        where: {
          ...(dateWhere ? { created_at: dateWhere } : {}),
          parent_subscriptions: {
            some: {
              status: "expired",
            },
          },
        },
      }),
      // Cancelled subscriptions
      prisma.parents.count({
        where: {
          ...(dateWhere ? { created_at: dateWhere } : {}),
          parent_subscriptions: {
            some: {
              status: "cancelled",
            },
          },
        },
      }),
      // Expired subscriptions
      prisma.parents.count({
        where: {
          ...(dateWhere ? { created_at: dateWhere } : {}),
          parent_subscriptions: {
            none: {},
          },
        },
      }),
    ]);

    // Subscription statistics
    const totalSubscriptions = await prisma.parent_subscriptions.count({
      where: dateWhere ? { created_at: dateWhere } : undefined,
    });

    const subscriptionsByStatus = await prisma.parent_subscriptions.groupBy({
      by: ["status"],
      where: dateWhere ? { created_at: dateWhere } : undefined,
      _count: {
        status: true,
      },
    });

    const subscriptionsByPlan = await prisma.parent_subscriptions.groupBy({
      by: ["subscription_plan_id"],
      where: dateWhere ? { created_at: dateWhere } : undefined,
      _count: {
        subscription_plan_id: true,
      },
    });

    // Get plan names for subscriptions by plan
    const planIds = subscriptionsByPlan.map((s: { subscription_plan_id: string; _count: { subscription_plan_id: number } }) => s.subscription_plan_id);
    const plans = await prisma.subscription_plans.findMany({
      where: {
        id: { in: planIds },
      },
      select: {
        id: true,
        name: true,
        plan_code: true,
      },
    });

    const subscriptionsByPlanWithNames = subscriptionsByPlan.map((sub: { subscription_plan_id: string; _count: { subscription_plan_id: number } }) => {
      const plan = plans.find((p: { id: string; name: string; plan_code: string }) => p.id === sub.subscription_plan_id);
      return {
        plan_id: sub.subscription_plan_id,
        plan_name: plan?.name || "Unknown",
        plan_code: plan?.plan_code || "unknown",
        count: sub._count.subscription_plan_id,
      };
    });

    // Recent registrations (based on date filter)
    const recentRegistrations = dateWhere
      ? await prisma.parents.count({
          where: {
            created_at: dateWhere,
          },
        })
      : 0;

    // Recent subscriptions (based on date filter)
    const recentSubscriptions = dateWhere
      ? await prisma.parent_subscriptions.count({
          where: {
            created_at: dateWhere,
          },
        })
      : 0;

    // Users registered this month (only if date filter is "all" or includes this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usersThisMonth = await prisma.parents.count({
      where: {
        created_at: {
          gte: startOfMonth,
          ...(dateWhere ? { lte: new Date() } : {}),
        },
      },
    });

    // Active subscriptions count
    const activeSubscriptionsCount = await prisma.parent_subscriptions.count({
      where: {
        status: "active",
        ...(dateWhere ? { created_at: dateWhere } : {}),
      },
    });

    const trend = await this.getSubscriptionTrend(dateFilter);

    return {
      users: {
        total: totalUsers,
        with_active_subscription: usersByStatus[0],
        with_expired_subscription: usersByStatus[1],
        with_cancelled_subscription: usersByStatus[2],
        without_subscription: usersByStatus[3],
        recent_registrations: recentRegistrations,
        registered_this_month: usersThisMonth,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptionsCount,
        by_status: subscriptionsByStatus.map((s: { status: string; _count: { status: number } }) => ({
          status: s.status,
          count: s._count.status,
        })),
        by_plan: subscriptionsByPlanWithNames,
        recent: recentSubscriptions,
        trend,
      },
    };
  }

  private async getSubscriptionTrend(
    dateFilter: "all" | "last_30_days" | "last_7_days" | "today"
  ): Promise<Array<{
    date: string;
    label: string;
    active: number;
    expired: number;
    cancelled: number;
    no_subscription: number;
  }>> {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    if (dateFilter === "today") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (dateFilter === "last_7_days") {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    } else if (dateFilter === "last_30_days") {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
    } else {
      const firstSubscription = await prisma.parent_subscriptions.findFirst({
        orderBy: { created_at: "asc" },
        select: { created_at: true },
      });

      if (!firstSubscription?.created_at) {
        return [];
      }

      startDate = new Date(firstSubscription.created_at);
      startDate.setHours(0, 0, 0, 0);
    }

    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const useWeekly = dateFilter === "all" && diffDays > 50;

    // Group by date only (not full timestamp) to avoid returning one row per subscription,
    // which can hang/timeout when there are many subscriptions (e.g. dateFilter=all).
    const groupByResult = await prisma.$queryRaw<
      Array<{ date_key: string; status: string; count: bigint }>
    >`
      SELECT (created_at::date)::text as date_key, status::text as status, COUNT(*)::int as count
      FROM parent_subscriptions
      WHERE created_at IS NOT NULL AND created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY (created_at::date), status
    `;

    const statusMap: Record<string, number> = {};
    for (const row of groupByResult) {
      const key = `${row.date_key}_${row.status}`;
      statusMap[key] = Number(row.count);
    }

    const result: Array<{
      date: string;
      label: string;
      active: number;
      expired: number;
      cancelled: number;
      no_subscription: number;
    }> = [];

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (dateFilter === "today") {
      const hours = [6, 9, 12, 15, 18, 21];
      for (const hour of hours) {
        const hourDate = new Date(now);
        hourDate.setHours(hour, 0, 0, 0);
        const hourKey = hourDate.toISOString().split("T")[0];

        if (hourDate > now) {
          result.push({
            date: hourKey,
            label: `${hour.toString().padStart(2, "0")}:00`,
            active: 0,
            expired: 0,
            cancelled: 0,
            no_subscription: 0,
          });
        } else {
          result.push({
            date: hourKey,
            label: `${hour.toString().padStart(2, "0")}:00`,
            active: statusMap[`${hourKey}_active`] || 0,
            expired: statusMap[`${hourKey}_expired`] || 0,
            cancelled: statusMap[`${hourKey}_cancelled`] || 0,
            no_subscription: 0,
          });
        }
      }
    } else if (useWeekly) {
      const currentDate = new Date(startDate);
      let weekNum = 1;

      while (currentDate <= endDate) {
        const weekStart = new Date(currentDate);
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        if (weekEnd > endDate) {
          weekEnd.setTime(endDate.getTime());
        }

        const weekKey = weekStart.toISOString().split("T")[0];

        let active = 0, expired = 0, cancelled = 0;
        for (const row of groupByResult) {
          const rowDate = new Date(row.date_key + "T00:00:00Z");
          if (rowDate >= weekStart && rowDate <= weekEnd) {
            const n = Number(row.count);
            if (row.status === "active") active += n;
            else if (row.status === "expired") expired += n;
            else if (row.status === "cancelled") cancelled += n;
          }
        }

        result.push({
          date: weekKey,
          label: `W${weekNum}`,
          active,
          expired,
          cancelled,
          no_subscription: 0,
        });

        currentDate.setDate(currentDate.getDate() + 7);
        weekNum++;
      }
    } else {
      const currentDate = new Date(startDate);
      currentDate.setHours(0, 0, 0, 0);

      while (currentDate <= endDate) {
        const dayKey = currentDate.toISOString().split("T")[0];
        const d = new Date(currentDate);

        result.push({
          date: dayKey,
          label: `${monthNames[d.getMonth()]} ${d.getDate()}`,
          active: statusMap[`${dayKey}_active`] || 0,
          expired: statusMap[`${dayKey}_expired`] || 0,
          cancelled: statusMap[`${dayKey}_cancelled`] || 0,
          no_subscription: 0,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return result;
  }
}

export default new AdminUserService();
