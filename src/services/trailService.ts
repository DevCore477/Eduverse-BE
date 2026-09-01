import prisma from "../config/prisma";
import notificationService from "./notification.service";
import { subscriptionService } from "./subscriptionService";

// Configuration that can be updated via environment variables or admin settings
const TRIAL_CONFIG = {
    // Default trial duration in days
    DEFAULT_TRIAL_DAYS: parseInt(process.env.TRIAL_DAYS || '7', 10),

    // Min and max allowed trial days (for validation)
    MIN_TRIAL_DAYS: 1,
    MAX_TRIAL_DAYS: 30,

    // Max pupils allowed during trial
    MAX_PUPILS_DURING_TRIAL: 1
};

class TrialService {

    /**
     * Start a free trial for a parent
     */
    async startFreeTrial(parentId: string) {
        // Check if parent exists
        await this.validateParentExists(parentId);

        // Check if parent has EVER had a paid subscription
        const hasPaidSubscription = await prisma.parent_subscriptions.findFirst({
            where: {
                parent_id: parentId,
                status: {
                    in: ['active', 'expired', 'cancelled']
                },
                payments: {
                    some: {
                        status: 'paid'
                    }
                }
            }
        });

        if (hasPaidSubscription) {
            throw new Error('Free trial is only available for new users who have never purchased a subscription');
        }

        // Check if already had trial
        const existingTrial = await prisma.parents.findUnique({
            where: { id: parentId },
            select: {
                trial_status: true,
                trial_start_date: true,
                trial_end_date: true
            }
        });

        if (existingTrial?.trial_status === 'active') {
            const daysLeft = Math.ceil(
                (existingTrial.trial_end_date!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            throw new Error(`You already have an active trial with ${daysLeft} days remaining`);
        }

        if (existingTrial?.trial_status === 'expired') {
            throw new Error('Your free trial has expired. Please choose a subscription plan to continue');
        }

        if (existingTrial?.trial_status === 'converted') {
            throw new Error('You have already converted to a paid subscription');
        }

        // Get trial duration
        const trialDays = TRIAL_CONFIG.DEFAULT_TRIAL_DAYS;

        const trialStart = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + trialDays);

        // Update parent with trial info
        const updatedParent = await prisma.parents.update({
            where: { id: parentId },
            data: {
                trial_start_date: trialStart,
                trial_end_date: trialEnd,
                trial_status: 'active',
                trial_period_days: trialDays,
                max_pupils_allowed: TRIAL_CONFIG.MAX_PUPILS_DURING_TRIAL
            }
        });

        // Send welcome notification
        // await notificationService.createNotification(
        //     '🎉 Free Trial Started!',
        //     parentId,
        //     null,
        //     `Your ${trialDays}-day free trial has started! You can add 1 pupil and explore all features.`,
        //     {
        //         type: 'trial_started',
        //         meta: {
        //             trial_days: trialDays,
        //             end_date: trialEnd
        //         }
        //     }
        // );

        return {
            success: true,
            message: 'Free trial started successfully',
            trial: {
                trail_dtart_date: trialStart,
                trail_end_date: trialEnd,
                trail_status: "active",
                max_pupils_allowed: TRIAL_CONFIG.MAX_PUPILS_DURING_TRIAL
            }
        };
    }

    /**
     * Check trial status for a parent
     */
    async checkTrialStatus(parentId: string) {
        const parent = await prisma.parents.findUnique({
            where: { id: parentId },
            select: {
                trial_start_date: true,
                trial_end_date: true,
                trial_status: true,
                trial_period_days: true,
                max_pupils_allowed: true,
                pupils: {
                    where: { status: 'active' },
                    select: { id: true }
                }
            }
        });

        if (!parent) throw new Error('Parent not found');

        // Auto-expire if past end date and still active
        if (parent.trial_status === 'active' &&
            parent.trial_end_date &&
            new Date() > parent.trial_end_date) {
            await this.expireTrial(parentId);
            parent.trial_status = 'expired';
        }

        const activePupils = parent.pupils.length;

        return {
            trial_status: parent.trial_status,
            start_date: parent.trial_start_date,
            end_date: parent.trial_end_date,
            days_remaining: parent.trial_end_date && parent.trial_status === 'active' ?
                Math.max(0, Math.ceil((parent.trial_end_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0,
            max_pupils_allowed: parent.max_pupils_allowed || 0,
            current_pupils: activePupils,
            can_add_pupil: parent.trial_status === 'active' &&
                activePupils < (parent.max_pupils_allowed || 0)
        };
    }

    /**
     * Validate if parent can add a pupil during trial
     */
    async validateAddPupil(parentId: string) {
        const status = await this.checkTrialStatus(parentId);

        if (status.trial_status !== 'active') {
            throw new Error('No active trial found');
        }

        if (!status.can_add_pupil) {
            throw new Error(`You can only add ${status.max_pupils_allowed} pupil during trial`);
        }

        return { allowed: true };
    }

    /**
     * Expire a trial manually or automatically
     */
    async expireTrial(parentId: string) {
        const updated = await prisma.parents.update({
            where: { id: parentId },
            data: {
                trial_status: 'expired',
                max_pupils_allowed: 0
            }
        });

        // Enforce max profiles (deactivate extra pupils)
        await subscriptionService.enforceMaxProfiles(parentId);

        // Send notification
        // await notificationService.createNotification(
        //     '⚠️ Your Free Trial Has Ended',
        //     parentId,
        //     null,
        //     'Your free trial has ended. Choose a subscription plan to continue learning!',
        //     {
        //         type: 'trial_expired',
        //         redirect_to: '/payment-plans'
        //     }
        // );

        return {
            success: true,
            message: 'Trial expired',
            redirect_to: '/payment-plans'
        };
    }

    /**
     * Convert trial to paid subscription
     */
    async convertTrialToPaid(parentId: string, planId: string) {
        // Check if trial is active
        const status = await this.checkTrialStatus(parentId);

        if (status.trial_status !== 'active') {
            throw new Error('No active trial to convert');
        }

        // Create subscription using subscription service
        const subscription = await subscriptionService.createParentSubscription(parentId, planId, false);

        // Update parent trial status
        await prisma.parents.update({
            where: { id: parentId },
            data: {
                trial_status: 'converted',
                max_pupils_allowed: null // Remove trial limit
            }
        });

        return {
            ...subscription,
            message: 'Trial converted to paid subscription successfully'
        };
    }

    /**
     * Get trial duration (from config)
     */
    getTrialDuration(): number {
        return TRIAL_CONFIG.DEFAULT_TRIAL_DAYS;
    }

    /**
     * Get max pupils allowed during trial
     */
    getMaxPupilsDuringTrial(): number {
        return TRIAL_CONFIG.MAX_PUPILS_DURING_TRIAL;
    }

    /**
     * Check all active trials for expiry (for cron job)
     */
    async checkExpiredTrials() {
        const expiredTrials = await prisma.parents.findMany({
            where: {
                trial_status: 'active',
                trial_end_date: {
                    lt: new Date()
                }
            },
            select: {
                id: true,
                first_name: true,
                last_name: true
            }
        });

        const results = [];

        for (const parent of expiredTrials) {
            try {
                await this.expireTrial(parent.id);
                results.push({
                    parent_id: parent.id,
                    status: 'expired'
                });


            } catch (error) {
                console.error(`Error expiring trial for parent ${parent.id}:`, error);
                results.push({
                    parent_id: parent.id,
                    status: 'error',
                    error: (error as Error).message
                });
            }
        }

        return {
            checked: expiredTrials.length,
            expired: results.filter(r => r.status === 'expired').length,
            errors: results.filter(r => r.status === 'error').length,
            results
        };
    }

    /**
     * Get trial statistics (admin)
     */
    async getTrialStats() {
        const [
            totalTrials,
            activeTrials,
            expiredTrials,
            convertedTrials
        ] = await Promise.all([
            prisma.parents.count({
                where: {
                    trial_status: { not: null }
                }
            }),
            prisma.parents.count({
                where: { trial_status: 'active' }
            }),
            prisma.parents.count({
                where: { trial_status: 'expired' }
            }),
            prisma.parents.count({
                where: { trial_status: 'converted' }
            })
        ]);

        const conversionRate = totalTrials > 0
            ? Math.round((convertedTrials / totalTrials) * 100)
            : 0;

        return {
            total_trials: totalTrials,
            active_trials: activeTrials,
            expired_trials: expiredTrials,
            converted_trials: convertedTrials,
            conversion_rate: conversionRate,
            trial_duration: this.getTrialDuration()
        };
    }

    private async validateParentExists(parentId: string) {
        const parent = await prisma.parents.findUnique({
            where: { id: parentId },
            select: { id: true },
        });

        if (!parent) throw new Error("Invalid parent ID. Parent does not exist.");
    }
}

export const trialService = new TrialService();