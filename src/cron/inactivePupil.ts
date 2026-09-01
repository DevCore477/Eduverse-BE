// import cron from 'node-cron';
// import { pupilService } from '../services/pupilService';

// export const scheduleInactiveStudentsCheck = () => {
//     // Morning check - 8:00 AM
//     cron.schedule('0 8 * * *', async () => {
//         console.log('⏰ Running scheduled inactive students check...');
//         try {
//             const result = await pupilService.checkAndNotifyInactiveStudents();
//             console.log('✅ Morning check completed:', result);
//         } catch (error) {
//             console.error('❌ Failed to run morning check:', error);
//         }
//     }, {
//         timezone: "Africa/Algiers"
//     });

//     // Evening check - 8:00 PM
//     cron.schedule('0 20 * * *', async () => {
//         try {
//             const result = await pupilService.checkAndNotifyInactiveStudents();
//             console.log('✅ Evening check completed:', result);
//         } catch (error) {
//             console.error('❌ Failed to run evening check:', error);
//         }
//     }, {
//         timezone: "Africa/Algiers"
//     });

//     console.log('📅 Inactive students cron jobs scheduled');
// };

import cron from 'node-cron';
import { pupilService } from '../services/pupilService';
import prisma from '../config/prisma';
import { trialService } from '../services/trailService';

export const scheduleNotificationChecks = () => {
    // ⏰ STALLED LESSONS CHECK - Run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
        console.log('⏰ Running stalled lessons check (every 2 mins)...');

        try {
            // Fetch all parents who have active pupils (or any other criteria)
            const parents = await prisma.parents.findMany({
                where: {
                    pupils: {
                        some: {
                            status: 'active'
                        }
                    }
                },
                select: {
                    id: true
                }
            });

            // If there are no parents, log a message and exit
            if (parents.length === 0) {
                console.log('📭 No active parents found for stalled lesson check.');
                return;
            }

            // Loop through each parent and run the checkAndNotifyStalledLessons function
            for (const parent of parents) {
                const userId = parent.id;

                // Call the service function with the userId
                const result = await pupilService.checkAndNotifyStalledLessons(userId);

                console.log(`✅ Stalled lessons check completed for parent ${userId}:`, result);
            }
        } catch (error) {
            console.error('❌ Failed to run stalled lessons check:', error);
        }
    }, {
        timezone: "Africa/Algiers"  // Specify your timezone here
    });

    // ⏰ Run trial expiry every day at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ Running trial expiry check (daily midnight)...');

        try {
            const result = await trialService.checkExpiredTrials();

            console.log('✅ Trial expiry check completed:', {
                checked: result.checked,
                expired: result.expired,
                errors: result.errors,
                timestamp: new Date().toISOString()
            });

            // Log details if any errors occurred
            if (result.errors > 0) {
                console.error('❌ Errors during trial expiry:',
                    result.results.filter(r => r.status === 'error')
                );
            }

        } catch (error) {
            console.error('❌ Failed to run trial expiry check:', error);
        }
    }, {
        timezone: "Africa/Algiers" // Adjust to your timezone
    });

    // 📅 INACTIVE STUDENTS CHECK - Morning 8:00 AM
    cron.schedule('0 8 * * *', async () => {
        console.log('⏰ Running scheduled inactive students check...');
        try {
            const result = await pupilService.checkAndNotifyInactiveStudents();
            console.log('✅ Morning check completed:', result);
        } catch (error) {
            console.error('❌ Failed to run morning check:', error);
        }
    }, {
        timezone: "Africa/Algiers"
    });

    // 📅 INACTIVE STUDENTS CHECK - Evening 8:00 PM
    cron.schedule('0 20 * * *', async () => {
        try {
            const result = await pupilService.checkAndNotifyInactiveStudents();
            console.log('✅ Evening check completed:', result);
        } catch (error) {
            console.error('❌ Failed to run evening check:', error);
        }
    }, {
        timezone: "Africa/Algiers"
    });
};