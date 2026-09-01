import prisma from "../config/prisma";
import { UpdateParentDto } from "../dto/parent.dto";
import bcrypt from "bcryptjs";
import { pupilService } from "./pupilService";
import { EMAIL_REGEX, PHONE_REGEX } from "../constants/regex";
import { profile } from "console";

class ParentService {
  async getParentProfile(parentId: string): Promise<any> {
    const parent = await prisma.parents.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        pin_code: true,
        email: true,
        phone_number: true,
        created_at: true,
        profile_image_base64: true,
        parent_subscriptions: {
          where: {
            status: "active",
            OR: [{ end_date: null }, { end_date: { gte: new Date() } }],
          },
          orderBy: { created_at: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            start_date: true,
            end_date: true,
            subscription_plans: true,
          },
        },
      },
    });
    console.log(parent);

    if (!parent) {
      throw new Error("Parent profile not found");
    }

    const identifier = parent.email ?? parent.phone_number ?? null;
    const activeSubscription =
      parent?.parent_subscriptions?.length > 0
        ? parent?.parent_subscriptions[0]
        : null;

    return {
      id: parent.id,
      identifier,
      email: parent.email,
      pin_code: parent.pin_code,
      profile_image_base64: parent.profile_image_base64,
      phone_number: parent.phone_number,
      first_name: parent.first_name,
      last_name: parent.last_name,
      created_at: parent.created_at,
      subscription: activeSubscription
        ? {
          id: activeSubscription.id,
          status: activeSubscription.status,
          start_date: activeSubscription.start_date,
          end_date: activeSubscription.end_date,
          plan: {
            id: activeSubscription.subscription_plans.id,
            name: activeSubscription.subscription_plans.name,
            plan_code: activeSubscription.subscription_plans.plan_code,
            price: activeSubscription.subscription_plans.price,
            max_devices: activeSubscription.subscription_plans.max_devices,
            max_profiles: activeSubscription.subscription_plans.max_profiles,
          },
        }
        : null,
    };
  }

  async updateParentProfile(
    parentId: string,
    dto: UpdateParentDto
  ): Promise<any> {
    // Build the update payload - only include provided fields
    const updatePayload: any = {};

    if (dto.first_name !== undefined) {
      updatePayload.first_name = dto.first_name;
    }

    if (dto.last_name !== undefined) {
      updatePayload.last_name = dto.last_name;
    }

    if (dto.pin_code !== undefined) {
      updatePayload.pin_code = dto.pin_code;
    }

    if (dto.identifier !== undefined) {
      const isEmail = EMAIL_REGEX.test(dto.identifier);
      const isPhone = PHONE_REGEX.test(dto.identifier);

      if (!isEmail && !isPhone) {
        throw new Error("Invalid email or phone number");
      }
      isEmail
        ? (updatePayload.email = dto.identifier)
        : (updatePayload.phone_number = dto.identifier);
    }

    if (dto.password !== undefined) {
      updatePayload.password_hash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.profile_image_base64 !== undefined) {
      updatePayload.profile_image_base64 = dto.profile_image_base64;
    }

    // Update parent profile in database
    if (Object.keys(updatePayload).length > 0) {
      try {
        return await prisma.parents.update({
          where: { id: parentId },
          data: updatePayload,
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            pin_code: true,
            profile_image_base64: true,
          },
        });
      } catch (err: any) {
        console.log("err", err);
        throw new Error(`Failed to update profile: ${err.message || err}`);
      }
    }

    // If only password was updated, fetch and return updated profile
    const parent = await prisma.parents.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_number: true,
        created_at: true,
        profile_image_base64: true,
      },
    });

    if (!parent) throw new Error("Failed to retrieve updated profile");
    return parent;
  }

  /**
   * Dashboard statistics for a parent.
   * Returns per-pupil numbers plus percentage view for parent dashboard.
   */
  async getDashboardStats(parentId: string) {
    const pupils = await prisma.pupils.findMany({
      where: {
        parent_id: parentId,
        status: "active",
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
      },
    });

    const pupilStats = await Promise.all(
      pupils.map(async (pupil: any) => {
        const stats = await pupilService.getDashboardStats(pupil.id);

        const levelsPercent =
          stats.levels.total > 0
            ? Math.round((stats.levels.completed / stats.levels.total) * 100)
            : 0;
        const starsPercent =
          stats.stars.total > 0
            ? Math.round((stats.stars.earned / stats.stars.total) * 100)
            : 0;
        const badgesPercent =
          stats.badges.total > 0
            ? Math.round((stats.badges.earned / stats.badges.total) * 100)
            : 0;

        return {
          pupil_id: pupil.id,
          first_name: pupil.first_name,
          last_name: pupil.last_name,
          levels: { ...stats.levels, percent: levelsPercent },
          stars: { ...stats.stars, percent: starsPercent },
          badges: { ...stats.badges, percent: badgesPercent },
          subjects: stats.subjects,
          recent_activities: stats.recent_activities,
        };
      })
    );

    const aggregate = pupilStats.reduce(
      (acc, p) => {
        acc.levels += p.levels.percent;
        acc.stars += p.stars.percent;
        acc.badges += p.badges.percent;
        return acc;
      },
      { levels: 0, stars: 0, badges: 0 }
    );

    const divisor = pupilStats.length || 1;

    const overview = {
      levels_percent: Math.round(aggregate.levels / divisor),
      stars_percent: Math.round(aggregate.stars / divisor),
      badges_percent: Math.round(aggregate.badges / divisor),
    };

    const allRecentActivities: Array<{
      pupil_id: string;
      first_name: string | null;
      last_name: string | null;
      subject_id: string | null;
      subject_name: string | null;
      subject_code: string | null;
      lesson_id: string | null;
      lesson_title: string | null;
      activity_type: string;
      activity_name: string;
      node_type: string | null;
      completed_at: Date | string | null;
      level_id: string | null,
      level_title: string | null,
      level_order_index: number | null,
    }> = [];

    pupilStats.forEach((p) => {
      (p.recent_activities || []).forEach(
        (a: {
          subject_id: string | null;
          subject_name: string | null;
          subject_code: string | null;
          lesson_id: string | null;
          lesson_title: string | null;
          activity_type: string;
          activity_name: string;
          node_type: string | null;
          completed_at: Date | string | null;
          level_id: string | null,
          level_title: string | null,
          level_order_index: number | null,
        }) => {
          allRecentActivities.push({
            pupil_id: p.pupil_id,
            first_name: p.first_name || null,
            last_name: p.last_name || null,
            subject_id: a.subject_id,
            subject_name: a.subject_name,
            subject_code: a.subject_code,
            lesson_id: a.lesson_id,
            lesson_title: a.lesson_title,
            activity_type: a.activity_type,
            activity_name: a.activity_name,
            node_type: a.node_type,
            completed_at: a.completed_at,
            level_id: a.level_id,
            level_title: a.level_title,
            level_order_index: a.level_order_index
          });
        }
      );
    });

    allRecentActivities.sort((a, b) => {
      const da = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const db = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return db - da;
    });

    const recentActivitiesForParent = allRecentActivities.slice(0, 20);

    return {
      overview,
      pupils: pupilStats,
      recent_activities: recentActivitiesForParent,
    };
  }

  async changePassword(
    parentId: string,
    currentPassword: string,
    newPassword: string,
    confirmNewPassword: string
  ): Promise<void> {
    // Validate that new password and confirm password match
    if (newPassword !== confirmNewPassword) {
      throw new Error("New password and confirm password do not match");
    }

    // Get parent with password hash
    const parent = await prisma.parents.findUnique({
      where: { id: parentId },
      select: { id: true, password_hash: true },
    });

    if (!parent) {
      throw new Error("Parent not found");
    }

    if (!parent.password_hash) {
      throw new Error("Password not set for this account");
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      parent.password_hash
    );

    if (!isValidPassword) {
      throw new Error("Current password is incorrect");
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(
      newPassword,
      parent.password_hash
    );
    if (isSamePassword) {
      throw new Error("New password must be different from current password");
    }

    // Hash and update the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.parents.update({
      where: { id: parentId },
      data: { password_hash: hashedPassword },
    });
  }
}

export default new ParentService();
