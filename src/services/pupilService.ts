import prisma from "../config/prisma";
import { CreatePupilDto, UpdatePupilDto } from "../dto/pupil.dto";
import { startOfWeek, subDays, subMinutes } from 'date-fns';
import notificationService, { NotificationPayload } from "./notification.service";


class PupilService {
  async createPupil(newPupil: CreatePupilDto) {
    const parent = await prisma.parents.findUnique({
      where: { id: newPupil.parent_id },
      select: { id: true },
    });

    if (!parent) throw new Error("Parent not found");

    if (newPupil.current_year_id) {
      const year = await prisma.academic_years.findUnique({
        where: { id: newPupil.current_year_id },
        select: { id: true, grade: true },
      });

      if (!year) throw new Error("Academic year not found");
      if (year.grade !== null && (year.grade < 1 || year.grade > 5)) {
        throw new Error("Grade must be between 1 and 5");
      }
    }

    return prisma.pupils.create({
      data: {
        parent_id: newPupil.parent_id,
        first_name: newPupil.first_name,
        last_name: newPupil.last_name,
        age: newPupil.age ?? null,
        gender: newPupil.gender ?? null,
        avatar_url: newPupil.avatar_url ?? null,
        pin_code: newPupil.pin_code ?? null,
        current_year_id: newPupil.current_year_id ?? null,
      },
    });
  }

  async updatePupil(pupilId: string, updates: UpdatePupilDto) {
    await this.getPupilById(pupilId);

    const data: Record<string, any> = {
      first_name: updates.first_name ?? undefined,
      last_name: updates.last_name ?? undefined,
      age: updates.age ?? undefined,
      gender: updates.gender ?? undefined,
      avatar_url: updates.avatar_url ?? undefined,
      pin_code: updates.pin_code ?? undefined,
      current_year_id: updates.current_year_id ?? undefined,
    };

    return prisma.pupils.update({
      where: { id: pupilId },
      data,
    });
  }

  async getPupils(parentId?: string) {
    if (parentId) {
      const parent = await prisma.parents.findUnique({
        where: { id: parentId },
        select: { id: true },
      });

      if (!parent) throw new Error("Parent not found");
    }

    return prisma.pupils.findMany({
      where: parentId
        ? {
          AND: [{ parent_id: parentId }, { status: "active" }],
        }
        : undefined,
      orderBy: { created_at: "desc" },
    });
  }

  async getPupilById(pupilId: string) {
    const pupil = await prisma.pupils.findUnique({
      where: { id: pupilId },
    });

    if (!pupil) throw new Error("Pupil not found");
    return pupil;
  }

  async getPupilsByParentPin(parentId: string, pin: string) {
    const parent = await prisma.parents.findUnique({
      where: { id: parentId },
      select: { id: true, pin_code: true },
    });

    if (!parent) throw new Error("Parent not found");
    if (parent.pin_code !== pin) throw new Error("Invalid PIN");

    const pupils = await this.getPupils(parent.id);
    return pupils;
  }

  /**
   * Dashboard statistics for a pupil.
   * - levels: how many level nodes are completed vs total
   * - stars: sum of stars earned across lessons (max 3 per lesson)
   * - badges: milestone badges earned vs total defined (uses levels as total)
   */
  async getDashboardStats(pupilId: string) {
    const pupil = await this.getPupilById(pupilId);

    const totalLevels = await prisma.subject_structure.count({
      where: { node_type: "level" },
    });

    const completedLevels = await prisma.user_node_status.count({
      where: {
        user_id: pupilId,
        is_completed: true,
        subject_structure: { node_type: "level" },
      },
    });

    const nodeProgress: Array<{ progress_data: any }> =
      await prisma.user_node_status.findMany({
        where: { user_id: pupilId },
        select: { progress_data: true },
      });

    // Helper function to calculate stars from final_challenge points
    const calculateStars = (progressData: any): number => {
      const finalChallenge = progressData?.final_challenge;
      const practiceQuestion = progressData?.practice;
      if (
        !finalChallenge ||
        !finalChallenge.questions ||
        !Array.isArray(finalChallenge.questions)
      ) {
        return 0;
      }

      let totalStarsEarned = 0;
      finalChallenge.questions.forEach((q: any) => {
        if (q.starsEarned && typeof q.starsEarned === "number" && q.starsEarned >= 0 || q.stars && typeof q.stars === "number" && q.stars >= 0) {
          totalStarsEarned += q.starsEarned || q.stars;
        }
      })

      Object.values(practiceQuestion.questions).forEach((q: any) => {
        if (q.starsEarned && typeof q.starsEarned === "number" && q.starsEarned >= 0 || q.stars && typeof q.stars === "number" && q.stars >= 0) {
          totalStarsEarned += q.starsEarned || q.stars;
        }
      })

      return totalStarsEarned;


      // const totalPoints = finalChallenge.questions.reduce(
      //   (sum: number, q: any) => {
      //     return (
      //       sum + (typeof q.points_earned === "number" ? q.points_earned : 0)
      //     );
      //   },
      //   0
      // );

      // const totalQuestions = finalChallenge.questions.length;
      // const maxPossiblePoints = totalQuestions * 3; // Assuming 3 points max per question

      // if (maxPossiblePoints === 0) return 0;

      // Star calculation based on percentage of max points
      // const percentage = (totalPoints / maxPossiblePoints) * 100;

      // if (percentage >= 90) return 3; // 90%+ = 3 stars
      // if (percentage >= 70) return 2; // 70-89% = 2 stars
      // if (percentage >= 50) return 1; // 50-69% = 1 star
      // return 0; // <50% = 0 stars
    };

    const starsEarned = nodeProgress.reduce(
      (sum: number, row: { progress_data: any }) => {
        return sum + calculateStars(row.progress_data);
      },
      0
    );
    // Calculate total possible stars: 3 stars per lesson
    const totalLessons = await prisma.subject_structure.count({
      where: { node_type: "lesson" },
    });
    const totalStars = totalLessons * 3;

    const badgesEarned = await prisma.user_milestone_badges.count({
      where: { user_id: pupilId },
    });
    const badgesTotal = totalLevels;

    const lessonsPerSubject = await prisma.subject_structure.groupBy({
      by: ["subject_id"],
      _count: { id: true },
      where: { node_type: "lesson" },
    });
    const totalLessonsMap: Record<string, number> = {};
    lessonsPerSubject.forEach(
      (row: { subject_id: string | null; _count: { id: number } }) => {
        if (row.subject_id) {
          totalLessonsMap[row.subject_id] = row._count.id;
        }
      }
    );

    const completedLessons = await prisma.user_node_status.findMany({
      where: { user_id: pupilId, is_completed: true },
      select: {
        subject_structure: { select: { subject_id: true } },
      },
    });
    const completedLessonsMap: Record<string, number> = {};
    completedLessons.forEach(
      (row: { subject_structure: { subject_id: string | null } | null }) => {
        const subjectId = row.subject_structure?.subject_id || null;
        if (subjectId) {
          completedLessonsMap[subjectId] =
            (completedLessonsMap[subjectId] || 0) + 1;
        }
      }
    );

    const academicYearId = pupil.current_year_id;
    if (!academicYearId) {
      throw new Error("Pupil's academic year is not set.");
    }
    const subjects = await prisma.subjects.findMany({
      where: {
        academic_year_id: academicYearId,
      },
      select: { id: true, name: true, code: true },
    });
    //
    // const subjects = await prisma.subjects.findMany({
    //   select: { id: true, name: true, code: true },
    // });

    // NEW: Get stars and badges per subject
    const starsPerSubject: Record<string, { earned: number; total: number }> =
      {};
    const badgesPerSubject: Record<string, { earned: number; total: number }> =
      {};

    for (const subject of subjects) {
      // Get user progress for this subject's nodes
      const subjectNodeProgress = await prisma.user_node_status.findMany({
        where: {
          user_id: pupilId,
          subject_structure: { subject_id: subject.id },
        },
        select: { progress_data: true },
      });

      const subjectStarsEarned = subjectNodeProgress.reduce(
        (sum: number, row: { progress_data: any }) => {
          return sum + calculateStars(row.progress_data);
        },
        0
      );

      // Calculate total possible stars for this subject: 3 stars per lesson
      const subjectTotalLessons = totalLessonsMap[subject.id] || 0;
      const subjectTotalStars = subjectTotalLessons * 3;
      starsPerSubject[subject.id] = {
        earned: subjectStarsEarned,
        total: subjectTotalStars,
      };

      // Count levels in this subject for total badges
      const subjectLevels = await prisma.subject_structure.count({
        where: { subject_id: subject.id, node_type: "level" },
      });

      // Count earned badges for this subject (via level_id)
      const subjectLevelIds = await prisma.subject_structure.findMany({
        where: { subject_id: subject.id, node_type: "level" },
        select: { id: true },
      });
      const levelIds = subjectLevelIds.map((l: any) => l.id);

      const subjectBadgesEarned = await prisma.user_milestone_badges.count({
        where: {
          user_id: pupilId,
          level_id: { in: levelIds },
        },
      });

      badgesPerSubject[subject.id] = {
        earned: subjectBadgesEarned,
        total: subjectLevels,
      };
    }

    // NEW: Get current/next lesson for each subject
    const currentLessonsBySubject: Record<string, any> = {};
    for (const subject of subjects) {
      // Find all lessons in this subject ordered by sequence/id
      const allLessons = await prisma.subject_structure.findMany({
        where: {
          subject_id: subject.id,
          node_type: "lesson",
        },
        select: {
          id: true,
          title: true,
          order_index: true,
        },
        orderBy: [{ order_index: "asc" }, { id: "asc" }],
      });

      // Find completed lesson IDs for this subject
      const completedLessonIds = await prisma.user_node_status.findMany({
        where: {
          user_id: pupilId,
          is_completed: true,
          subject_structure: {
            subject_id: subject.id,
            node_type: "lesson",
          },
        },
        select: { node_id: true },
      });

      const completedIds = new Set(
        completedLessonIds.map((l: any) => l.node_id)
      );

      // Find first incomplete lesson or last completed
      let currentLesson = null;
      for (const lesson of allLessons) {
        if (!completedIds.has(lesson.id)) {
          currentLesson = lesson;
          break;
        }
      }

      // If all completed, set to last lesson
      if (!currentLesson && allLessons.length > 0) {
        currentLesson = allLessons[allLessons.length - 1];
      }

      currentLessonsBySubject[subject.id] = currentLesson;
    }

    const subjectsProgress = subjects.map(
      (s: { id: string; name: string; code: string | null }) => {
        const total = totalLessonsMap[s.id] || 0;
        const completed = completedLessonsMap[s.id] || 0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        const currentLesson = currentLessonsBySubject[s.id];
        const stars = starsPerSubject[s.id] || { earned: 0, total: 0 };
        const badges = badgesPerSubject[s.id] || { earned: 0, total: 0 };

        return {
          subject_id: s.id,
          name: s.name,
          code: s.code,
          completed_lessons: completed,
          total_lessons: total,
          percent,
          stars: { earned: stars.earned, total: stars.total },
          badges: { earned: badges.earned, total: badges.total },
          current_lesson: currentLesson
            ? {
              id: currentLesson.id,
              title: currentLesson.title,
              is_completed: completed >= total,
            }
            : null,
        };
      }
    );

    // NEW: Determine next recommended subject (least progress, excluding 100% complete)
    const incompleteSubjects = subjectsProgress.filter(
      (s: any) => s.percent < 100
    );
    const nextSubject =
      incompleteSubjects.length > 0
        ? incompleteSubjects.reduce((min: any, curr: any) =>
          curr.percent < min.percent ? curr : min
        )
        : null;

    // Recent activities: Combine step completions and question attempts for comprehensive activity feed
    const [recentSteps, recentQuestionAttempts] = await Promise.all([
      // Get completed lesson steps (intro, video, final_journey)
      prisma.user_lesson_step_status.findMany({
        where: {
          user_id: pupilId,
          is_completed: true,
          completed_at: { not: null },
        },
        select: {
          step_id: true,
          completed_at: true,
          lesson_steps: {
            select: {
              id: true,
              node_id: true,
              step_type: true,
              subject_structure: {
                select: {
                  id: true,
                  title: true,
                  subject_id: true,
                  node_type: true,
                  parent_id: true,
                },
              },
            },
          },
        },
        orderBy: { completed_at: "desc" },
        take: 30,
      }),
      // Get recent question attempts (practice and final challenge)
      prisma.user_question_attempts.findMany({
        where: {
          user_id: pupilId,
        },
        select: {
          id: true,
          practice_question_id: true,
          final_challenge_id: true,
          question_type: true,
          is_correct: true,
          created_at: true,
          lesson_practice_questions: {
            select: {
              id: true,
              node_id: true,
              subject_structure: {
                select: {
                  id: true,
                  title: true,
                  subject_id: true,
                  node_type: true,
                  parent_id: true,
                },
              },
            },
          },
          lesson_final_challenges: {
            select: {
              id: true,
              node_id: true,
              subject_structure: {
                select: {
                  id: true,
                  title: true,
                  subject_id: true,
                  node_type: true,
                  parent_id: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: 30,
      }),
    ]);
    //
    // // collect all end parent level IDs from steps and question attempts from subject structure using parent id
    //
    // const [parentLevelIdsFromSteps, parentLevelIdsFromQuestions] =
    //     await Promise.all([
    //         prisma.subject_structure.findMany({
    //             where: {
    //                 id: { in: recentSteps.map((r: any) => r.lesson_steps?.subject_structure?.parent_id).filter((id: any): id is string => !!id) },
    //             }
    //         }).then((structures:any) =>
    //             structures.map((s:any) => s.parent_id).filter((id:string): id is string => !!id)
    //         ),
    //         prisma.subject_structure.findMany({
    //             where: {
    //                 id: {
    //                     in: recentQuestionAttempts
    //                         .map((q: any) => {
    //                             if (q.lesson_practice_questions) {
    //                                 return q.lesson_practice_questions.subject_structure?.parent_id || null;
    //                             }
    //                             if (q.lesson_final_challenges) {
    //                                 return q.lesson_final_challenges.subject_structure?.parent_id || null;
    //                             }
    //                             return null;
    //                         })
    //                         .filter((id: any): id is string => !!id),
    //                 }
    //             }
    //         }).then((structures:any) =>
    //             structures.map((s:any) => s.parent_id).filter((id:string): id is string => !!id)
    //         ),
    //     ]);
    //
    // console.log('Parent level IDs from steps:', parentLevelIdsFromSteps, 'from questions:', parentLevelIdsFromQuestions);
    //
    // Collect all subject IDs from both steps and question attempts
    const stepSubjectIds = recentSteps
      .map((r: any) => r.lesson_steps?.subject_structure?.subject_id || null)
      .filter((id: any): id is string => !!id);

    const questionSubjectIds = recentQuestionAttempts
      .map((q: any) => {
        if (q.lesson_practice_questions) {
          return q.lesson_practice_questions.subject_structure?.subject_id || null;
        }
        if (q.lesson_final_challenges) {
          return q.lesson_final_challenges.subject_structure?.subject_id || null;
        }
        return null;
      })
      .filter((id: any): id is string => !!id);

    const recentSubjectIds = Array.from(
      new Set([...stepSubjectIds, ...questionSubjectIds])
    );

    // Fetch subject details for mapping
    const recentSubjects =
      recentSubjectIds.length > 0
        ? await prisma.subjects.findMany({
          where: { id: { in: recentSubjectIds } },
          select: { id: true, name: true, code: true },
        })
        : [];

    const subjectNameMap: Record<
      string,
      { name: string; code: string | null }
    > = {};
    recentSubjects.forEach((s: any) => {
      subjectNameMap[s.id] = { name: s.name, code: s.code };
    });

    // Map step types to user-friendly activity descriptions
    const stepTypeMap: Record<string, string> = {
      lesson_intro: "Completed Lesson Intro",
      lesson_video: "Watched Lesson Video",
      practice_questions: "Completed Practice",
      final_journey: "Completed Final Journey",
    };

    const levelCache: Record<string, { id: string; title: string, order_index: number }> = {};

    // Helper function to recursively fetch the parent "level" node
    const getLevelParent = async (lessonNodeId: string) => {
      let currentNode = await prisma.subject_structure.findUnique({
        where: { id: lessonNodeId },
        select: { id: true, title: true, node_type: true, parent_id: true, order_index: true },
      });

      // Traverse upwards recursively until we find a node with node_type "level"
      while (currentNode && currentNode.node_type !== 'level' && currentNode.parent_id) {
        currentNode = await prisma.subject_structure.findUnique({
          where: { id: currentNode.parent_id },
          select: { id: true, title: true, node_type: true, parent_id: true, order_index: true },
        });
      }

      // Return the first "level" node found, or null if none is found
      // Cache the level node if found
      if (currentNode && currentNode.node_type === 'level') {
        levelCache[lessonNodeId] = currentNode;
        return currentNode;
      }
      return null;
    };

    // Convert steps to activity format
    const stepActivities = await Promise.all(recentSteps.map(async (row: any) => {
      const lessonNode = row.lesson_steps?.subject_structure;
      const subjectId = lessonNode?.subject_id || "";
      const subjectMeta = subjectId ? subjectNameMap[subjectId] : undefined;
      const stepType = row.lesson_steps?.step_type || "unknown";

      const levelNode = await getLevelParent(lessonNode?.parent_id || lessonNode?.id);

      return {
        subject_id: subjectId || null,
        subject_name: subjectMeta?.name || null,
        subject_code: subjectMeta?.code || null,
        lesson_id: lessonNode?.id || null,
        lesson_title: lessonNode?.title || null,
        activity_type: stepType,
        activity_name: stepTypeMap[stepType] || stepType,
        node_type: lessonNode?.node_type || null,
        completed_at: row.completed_at,
        timestamp: row.completed_at ? new Date(row.completed_at).getTime() : 0,
        level_id: levelNode?.id || null,
        level_title: levelNode?.title || null,
        level_order_index: levelNode?.order_index || null,
      };
    }));

    // Convert question attempts to activity format
    const questionActivities = await Promise.all(recentQuestionAttempts.map(async (attempt: any) => {
      let lessonNode = null;
      let activityType = "";
      let activityName = "";

      if (attempt.lesson_practice_questions) {
        lessonNode = attempt.lesson_practice_questions.subject_structure;
        activityType = "practice_question";
        activityName = attempt.is_correct
          ? "Answered Practice Question"
          : "Attempted Practice Question";
      } else if (attempt.lesson_final_challenges) {
        lessonNode = attempt.lesson_final_challenges.subject_structure;
        activityType = "final_challenge";
        activityName = attempt.is_correct
          ? "Answered Final Challenge Question"
          : "Attempted Final Challenge Question";
      }

      const subjectId = lessonNode?.subject_id || "";
      const subjectMeta = subjectId ? subjectNameMap[subjectId] : undefined;

      // Fetch the parent level information using the parent_id of the lesson
      const levelNode = await getLevelParent(lessonNode?.parent_id || lessonNode?.id);

      return {
        subject_id: subjectId || null,
        subject_name: subjectMeta?.name || null,
        subject_code: subjectMeta?.code || null,
        lesson_id: lessonNode?.id || null,
        lesson_title: lessonNode?.title || null,
        activity_type: activityType,
        activity_name: activityName,
        node_type: lessonNode?.node_type || null,
        completed_at: attempt.created_at,
        timestamp: attempt.created_at ? new Date(attempt.created_at).getTime() : 0,
        level_id: levelNode?.id || null,
        level_title: levelNode?.title || null,
        level_order_index: levelNode?.order_index || null,
      };
    }));

    // Combine and sort all activities by timestamp (most recent first)
    // const allActivities = [...stepActivities, ...questionActivities].filter((act)=> act.subject_id );
    // allActivities.sort((a, b) => b.timestamp - a.timestamp);
    const allActivities = [...stepActivities, ...questionActivities]
      .filter((act) => act.subject_id) // Filter out activities with null subject_id
      .reduce((acc: any[], curr) => {
        // Find if the current activity's subject_id already exists in the accumulator
        const existingActivity = acc.find((act) => act.subject_id === curr.subject_id);

        if (existingActivity) {
          // If there's already an activity for this subject, compare timestamps and keep the most recent
          if (curr.timestamp > existingActivity.timestamp) {
            // Replace the old activity with the current one if it's more recent
            Object.assign(existingActivity, curr);
          }
        } else {
          // If no activity exists for this subject, just add the current one
          acc.push(curr);
        }

        return acc;
      }, []);

    // Sort by timestamp (most recent first)
    const sortedActivities = allActivities.sort((a, b) => b.timestamp - a.timestamp);

    // Take top 20 activities and remove the timestamp field
    const recentActivities = sortedActivities.slice(0, 20).map(({ timestamp, ...activity }) => activity);

    return {
      first_name: pupil.first_name,
      last_name: pupil.last_name,
      levels: { completed: completedLevels, total: totalLevels },
      stars: { earned: starsEarned, total: totalStars },
      badges: { earned: badgesEarned, total: badgesTotal },
      subjects: subjectsProgress,
      next_recommended_subject: nextSubject
        ? {
          subject_id: nextSubject.subject_id,
          name: nextSubject.name,
          code: nextSubject.code,
          percent: nextSubject.percent,
          stars: nextSubject.stars,
          badges: nextSubject.badges,
          current_lesson: nextSubject.current_lesson,
        }
        : null,
      recent_activities: recentActivities,
    };
  }

  async checkAndNotifyInactiveStudents() {
    console.log('🔍 Running inactive students check...');

    try {
      // Get all active pupils
      const activePupils = await prisma.pupils.findMany({
        where: {
          status: "active",
        },
        include: {
          parents: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              device_tokens: {
                select: {
                  token: true,
                  platform: true,
                },
              },
            },
          },
        },
      });

      const sevenDaysAgo = subDays(new Date(), 7);

      const inactivePupils = [];

      for (const pupil of activePupils) {
        // Check for any activity in the last 7 days
        const recentActivity = await this.getPupilRecentActivity(pupil.id, sevenDaysAgo);

        if (!recentActivity) {
          inactivePupils.push(pupil);
        }
      }

      // Send notifications for inactive pupils
      for (const pupil of inactivePupils) {
        await this.sendInactivityNotification(pupil);
      }

      return {
        checked: activePupils.length,
        inactive: inactivePupils.length,
        timestamp: new Date(),
      };

    } catch (error) {
      throw error;
    }
  }

  private async getPupilRecentActivity(pupilId: string, since: Date): Promise<boolean> {
    // Check multiple activity sources
    const [
      stepCompletions,
      questionAttempts,
      nodeCompletions,
      badgeEarnings
    ] = await Promise.all([
      // Check if they completed any lesson steps
      prisma.user_lesson_step_status.findFirst({
        where: {
          user_id: pupilId,
          is_completed: true,
          completed_at: {
            gte: since,
          },
        },
      }),

      // Check if they attempted any questions
      prisma.user_question_attempts.findFirst({
        where: {
          user_id: pupilId,
          created_at: {
            gte: since,
          },
        },
      }),

      // Check if they completed any nodes (units/lessons/levels)
      prisma.user_node_status.findFirst({
        where: {
          user_id: pupilId,
          is_completed: true,
          completed_at: {
            gte: since,
          },
        },
      }),

      // Check if they earned any badges
      prisma.user_milestone_badges.findFirst({
        where: {
          user_id: pupilId,
          awarded_at: {
            gte: since,
          },
        },
      }),
    ]);

    return !!(stepCompletions || questionAttempts || nodeCompletions || badgeEarnings);
  }

  private async sendInactivityNotification(pupil: any) {
    const parent = pupil.parents;

    // Get all device tokens for the parent
    const deviceTokens = parent.device_tokens?.map((dt: any) => dt.token) || [];

    // Create notification title and message
    const title = `⚠️ Inactive Student: ${pupil.first_name} ${pupil.last_name}`;
    const message = `${pupil.first_name} hasn't completed any learning activities in the last 7 days. Please check in with them!`;

    // Create notification in database
    const notification = await notificationService.createNotification(
      title,
      parent.id,
      pupil.id,
      message,
      {
        type: "inactivity_alert",
        notify: "parent",
        meta: {
          pupil_id: pupil.id,
          pupil_name: `${pupil.first_name} ${pupil.last_name}`,
          inactive_days: 7,
          alert_type: "weekly_inactivity",
        },
      }
    );

    // Send push notifications to all parent devices
    for (const token of deviceTokens) {
      await notificationService.sendPushNotification(
        token,
        title,
        message,
        {
          type: "inactivity_alert",
          notificationId: notification.id,
          pupilId: pupil.id,
        }
      );
    }

    console.log(`📨 Sent inactivity notification for pupil: ${pupil.first_name} ${pupil.last_name}`);
  }

  // Optional: Get detailed inactivity report
  async getInactivityReport(daysThreshold: number = 7) {
    const since = subDays(new Date(), daysThreshold);

    const pupils = await prisma.pupils.findMany({
      where: {
        status: "active",
      },
      include: {
        parents: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
          },
        },
        user_lesson_step_status: {
          where: {
            completed_at: {
              gte: since,
            },
          },
          take: 1,
        },
        user_question_attempts: {
          where: {
            created_at: {
              gte: since,
            },
          },
          take: 1,
        },
      },
    });

    const report = pupils.map(async (pupil: any) => ({
      pupil_id: pupil.id,
      pupil_name: `${pupil.first_name} ${pupil.last_name}`,
      parent_name: pupil.parents ? `${pupil.parents.first_name} ${pupil.parents.last_name}` : 'N/A',
      parent_contact: pupil.parents?.email || pupil.parents?.phone_number || 'N/A',
      has_activity: pupil.user_lesson_step_status.length > 0 || pupil.user_question_attempts.length > 0,
      last_activity_date: await this.getLastActivityDate(pupil.id),
    }));

    return report;
  }

  private async getLastActivityDate(pupilId: string): Promise<Date | null> {
    const activities = await Promise.all([
      prisma.user_lesson_step_status.findFirst({
        where: { user_id: pupilId, completed_at: { not: null } },
        orderBy: { completed_at: 'desc' },
        select: { completed_at: true },
      }),
      prisma.user_question_attempts.findFirst({
        where: { user_id: pupilId },
        orderBy: { created_at: 'desc' },
        select: { created_at: true },
      }),
      prisma.user_node_status.findFirst({
        where: { user_id: pupilId, completed_at: { not: null } },
        orderBy: { completed_at: 'desc' },
        select: { completed_at: true },
      }),
    ]);

    const dates = activities
      .map(a => a?.completed_at || a?.created_at || null)
      .filter((d): d is Date => d !== null);

    return dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
  }

  /**
   * Weekly performance check for a specific parent's pupils
   */
  async checkAndNotifyWeeklyPerformance(userId: string) {
    console.log(`📊 Running weekly performance check for parent: ${userId}`);

    try {
      // Check if today is Monday (1 = Monday in JavaScript)
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Only run on Mondays
      if (dayOfWeek !== 1) {
        return {
          parent_id: userId,
          skipped: true,
          reason: 'Not Monday'
        };
      }

      // Get all active pupils belonging to this parent
      const parentPupils = await prisma.pupils.findMany({
        where: {
          parent_id: userId,
          status: "active"
        },
        include: {
          parents: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              device_tokens: {
                select: { token: true, platform: true },
              },
            },
          },
        },
      });

      if (parentPupils.length === 0) {
        console.log(`📭 No active pupils found for parent: ${userId}`);
        return {
          parent_id: userId,
          checked: 0,
          notifications_sent: 0,
          timestamp: new Date(),
          message: 'No active pupils found for this parent'
        };
      }

      console.log(`📊 Found ${parentPupils.length} pupils for parent ${userId}`);

      const results = [];

      for (const pupil of parentPupils) {
        const hadActivity = await this.hasWeeklyActivity(pupil.id);
        await this.sendWeeklyPerformanceNotification(pupil, hadActivity);
        results.push({
          pupil_id: pupil.id,
          pupil_name: `${pupil.first_name} ${pupil.last_name}`,
          had_activity: hadActivity
        });
      }

      return {
        parent_id: userId,
        pupils_checked: parentPupils.length,
        notifications_sent: results.length,
        details: results,
        timestamp: new Date(),
      };

    } catch (error) {
      console.error(`❌ Error in weekly performance check for parent ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if pupil had any activity this week
   */
  private async hasWeeklyActivity(pupilId: string): Promise<boolean> {
    const startOfThisWeek = startOfWeek(new Date());

    const [steps, questions, nodes] = await Promise.all([
      prisma.user_lesson_step_status.findFirst({
        where: {
          user_id: pupilId,
          completed_at: { gte: startOfThisWeek },
        },
      }),
      prisma.user_question_attempts.findFirst({
        where: {
          user_id: pupilId,
          created_at: { gte: startOfThisWeek },
        },
      }),
      prisma.user_node_status.findFirst({
        where: {
          user_id: pupilId,
          completed_at: { gte: startOfThisWeek },
        },
      }),
    ]);

    return !!(steps || questions || nodes);
  }

  /**
   * 📧 Send weekly performance notification - SIMPLE VERSION
   * No stats, just encourages pupil to check their progress
   */
  private async sendWeeklyPerformanceNotification(pupil: any, hadActivity: boolean) {
    const parent = pupil.parents;
    const deviceTokens = parent.device_tokens?.map((dt: any) => dt.token) || [];

    // Simple, encouraging message without specific stats
    const title = `📊 Weekly Progress Report, ${pupil.first_name}!`;
    const message = hadActivity
      ? `Great job this week! Tap to see how much progress you've made. 🎉`
      : `Start your learning journey this week! Tap to explore new lessons and activities. ✨`;


    const data = {
      title,
      parentId: parent.id,
      pupilId: pupil.id,
      message,
      payload: {
        type: "weekly_performance",
        notify: "pupil",
        meta: {
          pupil_id: pupil.id,
          pupil_name: `${pupil.first_name} ${pupil.last_name}`,
          action: "view_progress",
          had_activity: hadActivity,
        },
      }
    }

    console.log("data for the weekly notify is ", JSON.stringify(data, null, 2))
    // // Create notification in database
    // const notification = await notificationService.createNotification(
    //   title,
    //   parent.id,
    //   pupil.id,
    //   message,
    //   {
    //     type: "weekly_performance",
    //     notify: "pupil",
    //     meta: {
    //       pupil_id: pupil.id,
    //       pupil_name: `${pupil.first_name} ${pupil.last_name}`,
    //       action: "view_progress",
    //       had_activity: hadActivity,
    //     },
    //   }
    // );

    // // Send push notifications
    // for (const token of deviceTokens) {
    //   await notificationService.sendPushNotification(
    //     token,
    //     title,
    //     message,
    //     {
    //       type: "weekly_performance",
    //       notificationId: notification.id,
    //       pupilId: pupil.id,
    //       screen: "pupil-activity", // 👈 Navigate to activity/stats page
    //     }
    //   );
    // }

    console.log(`📨 Sent weekly performance notification for pupil: ${pupil.first_name} ${pupil.last_name} `);
  }


  async checkAndNotifyStalledLessons(userId: string) {
    console.log(`⏳ Running stalled lessons check for parent: ${userId}`);

    try {
      const thirtyMinsAgo = subMinutes(new Date(), 5);

      // Get all active pupils for the parent
      const parentPupils = await prisma.pupils.findMany({
        where: {
          parent_id: userId,
          status: "active",
        },
        select: { id: true },
      });

      const pupilIds = parentPupils.map((p: any) => p.id);

      if (pupilIds.length === 0) {
        console.log('📭 No active pupils found for this parent');
        return {
          checked: 0,
          notifications_sent: 0,
          timestamp: new Date(),
          message: 'No active pupils found for this parent'
        };
      }

      // Get stalled attempts
      const stalledAttempts = await prisma.user_question_attempts.findMany({
        where: {
          user_id: { in: pupilIds },
          created_at: {
            lte: thirtyMinsAgo,
          },
          pupils: {
            status: "active",
          },
        },
        distinct: ['user_id', 'practice_question_id', 'final_challenge_id'],
        orderBy: {
          created_at: 'desc',
        },
        include: {
          pupils: {
            include: {
              parents: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  device_tokens: {
                    select: { token: true, platform: true },
                  },
                },
              },
              user_node_status: {
                where: {
                  is_completed: true,
                },
                select: {
                  node_id: true,
                },
              },
            },
          },
          lesson_practice_questions: {
            include: {
              subject_structure: {
                include: {
                  subjects: {
                    select: { id: true, name: true, code: true },
                  },
                },
              },
            },
          },
          lesson_final_challenges: {
            include: {
              subject_structure: {
                include: {
                  subjects: {
                    select: { id: true, name: true, code: true },
                  },
                },
              },
            },
          },
        },
      });

      console.log(`⏳ Found ${stalledAttempts.length} total stalled attempts for parent's pupils`);

      const filteredAttempts = stalledAttempts.filter((attempt: any) => {
        let lessonNode = null;

        if (attempt.lesson_practice_questions) {
          lessonNode = attempt.lesson_practice_questions.subject_structure;
        } else if (attempt.lesson_final_challenges) {
          lessonNode = attempt.lesson_final_challenges.subject_structure;
        }

        if (!lessonNode) return false;

        // Check if this lesson is already completed by the pupil
        const isCompleted = attempt.pupils.user_node_status.some(
          (status: any) => status.node_id === lessonNode.id && status.is_completed === true
        );

        return !isCompleted;
      });

      console.log(`⏳ Found ${filteredAttempts.length} stalled lessons (after filtering out completed ones)`);

      const results = [];

      // Send notifications for each stalled lesson
      for (const attempt of filteredAttempts) {
        let lessonNode = null;
        let stepId = null;
        let questionType = null;

        if (attempt.lesson_practice_questions) {
          lessonNode = attempt.lesson_practice_questions.subject_structure;
          stepId = attempt.practice_question_id;
          questionType = "practice";
        } else if (attempt.lesson_final_challenges) {
          lessonNode = attempt.lesson_final_challenges.subject_structure;
          stepId = attempt.final_challenge_id;
          questionType = "final";
        }

        if (!lessonNode) continue;

        // Check if the notification has already been sent
        const notificationExists = await prisma.sent_notifications.findUnique({
          where: {
            pupil_id_lesson_id: {
              pupil_id: attempt.pupils.id,
              lesson_id: lessonNode.id,
            },
          },
        });

        if (notificationExists) {
          console.log(`🛑 Notification already sent for lesson ${lessonNode.id} for pupil ${attempt.pupils.id}`);
          continue;
        }

        // Send the notification
        await this.sendStalledLessonNotification({
          pupil: attempt.pupils,
          lessonNode,
          stepId,
          questionType,
          lastActivityAt: attempt.created_at,
        });

        // Mark the notification as sent in the database
        await prisma.sent_notifications.create({
          data: {
            pupil_id: attempt.pupils.id,
            lesson_id: lessonNode.id,
          },
        });

        results.push({
          pupil_id: attempt.pupils.id,
          pupil_name: `${attempt.pupils.first_name} ${attempt.pupils.last_name}`,
          lesson_id: lessonNode.id,
          lesson_title: lessonNode.title,
        });
      }

      return {
        parent_id: userId,
        pupils_checked: pupilIds.length,
        total_stalled: stalledAttempts.length,
        filtered_stalled: filteredAttempts.length,
        notifications_sent: results.length,
        details: results,
        timestamp: new Date(),
      };

    } catch (error) {
      console.error('❌ Error in stalled lessons check:', error);
      throw error;
    }
  }

  private async sendStalledLessonNotification(data: any) {
    const pupil = data.pupil;
    const parent = pupil.parents;
    const lessonNode = data.lessonNode;

    if (!lessonNode || !parent) return;

    const deviceTokens = parent.device_tokens?.map((dt: any) => dt.token) || [];

    // Get subject information
    const subjectId = lessonNode.subject_id;
    const subjectName = lessonNode.subjects?.name || null;

    // Get the complete hierarchy (Level -> Unit -> Segment)
    const hierarchy = await this.getLessonHierarchy(lessonNode.id);

    // Get the lesson step for this specific question type
    const lessonStep = await prisma.lesson_steps.findFirst({
      where: {
        node_id: lessonNode.id,
        step_type: data.questionType === 'practice' ? 'practice_questions' : 'final_journey',
      },
      select: {
        id: true,
        step_type: true,
        order_index: true
      },
    });

    // Get level number (position/order index of the level)
    // const levelNo = hierarchy.level?.order_index || null;

    // Get the user's last attempt for this question
    const lastAttempt = await prisma.user_question_attempts.findFirst({
      where: {
        user_id: pupil.id,
        ...(data.questionType === 'practice'
          ? { practice_question_id: data.stepId }
          : { final_challenge_id: data.stepId }
        ),
      },
      orderBy: { created_at: 'desc' },
      select: {
        attempt_number: true,
        points_earned: true,
        is_correct: true,
        response_data: true,
      },
    });

    const title = `⏳ Continue Your ${data.questionType === 'practice' ? 'Practice' : 'Final Challenge'} !`;
    const message = `You were working on "${lessonNode.title}" 30 minutes ago.Continue where you left off! 📚`;

    // const lessonData = {
    //   title,
    //   parentId: parent.id,
    //   pupilId: pupil.id,
    //   message,
    //   payload: {
    //     type: "stalled_lesson",
    //     notify: "pupil",
    //     meta: {
    //       // Core identifiers
    //       pupil_id: pupil.id,
    //       pupil_name: `${pupil.first_name} ${pupil.last_name} `,

    //       // Lesson information
    //       lessonId: lessonNode.id,
    //       lessonTitle: lessonNode.title,
    //       lessonStepId: data.lessonStepId,

    //       // Step information
    //       stepId: data.stepId, // The specific question ID
    //       stepType: lessonStep?.step_type,
    //       stepOrderIndex: lessonStep?.order_index,

    //       // Subject information
    //       subjectId: subjectId,
    //       subjectName: subjectName,

    //       // Hierarchy information (Level -> Unit -> Segment)
    //       levelId: hierarchy.level?.id || null,
    //       levelTitle: hierarchy.level?.title || null,
    //       levelNo: hierarchy.level?.order_index || null, // Level position/number
    //       levelOrderIndex: hierarchy.level?.order_index || null,

    //       unitId: hierarchy.unit?.id || null,
    //       unitTitle: hierarchy.unit?.title || null,

    //       segmentId: hierarchy.segment?.id || null,
    //       segmentTitle: hierarchy.segment?.title || null,

    //       // Question type
    //       questionType: data.questionType, // "practice" or "final"

    //       // Last attempt info
    //       lastAttemptNumber: lastAttempt?.attempt_number || 1,
    //       lastPointsEarned: lastAttempt?.points_earned || 0,
    //       lastWasCorrect: lastAttempt?.is_correct || false,

    //       // Action
    //       action: "continue_lesson",
    //       redirect_to: data.questionType === 'practice' ? "practice" : "final_challenge",

    //       // Timestamp
    //       lastActivityAt: data.lastActivityAt,
    //     },
    //   }
    // }
    // console.log("data for lesson notification is ", JSON.stringify(lessonData, null, 2))
    // Create notification with COMPLETE metadata
    const payload: NotificationPayload = {
      type: "stalled_lesson",
      notify: "pupil",
      meta: {
        // Core identifiers
        pupil_id: pupil.id,
        pupil_name: `${pupil.first_name} ${pupil.last_name} `,

        // Lesson information
        lessonId: lessonNode.id,
        lessonTitle: lessonNode.title,
        lessonStepId: data.lessonStepId,

        // Step information
        stepId: data.stepId, // The specific question ID
        stepType: lessonStep?.step_type,
        stepOrderIndex: lessonStep?.order_index,

        // Subject information
        subjectId: subjectId,
        subjectName: subjectName,

        // Hierarchy information (Level -> Unit -> Segment)
        levelId: hierarchy.level?.id || null,
        levelTitle: hierarchy.level?.title || null,
        levelNo: hierarchy.level?.order_index || null, // Level position/number
        levelOrderIndex: hierarchy.level?.order_index || null,

        unitId: hierarchy.unit?.id || null,
        unitTitle: hierarchy.unit?.title || null,

        segmentId: hierarchy.segment?.id || null,
        segmentTitle: hierarchy.segment?.title || null,

        // Question type
        questionType: data.questionType, // "practice" or "final"

        // Last attempt info
        lastAttemptNumber: lastAttempt?.attempt_number || 1,
        lastPointsEarned: lastAttempt?.points_earned || 0,
        lastWasCorrect: lastAttempt?.is_correct || false,

        // Action
        action: "continue_lesson",
        redirect_to: data.questionType === 'practice' ? "practice" : "final_challenge",

        // Timestamp
        lastActivityAt: data.lastActivityAt,
      },
    }
    const notification = await notificationService.createNotification(
      title,
      parent.id,
      pupil.id,
      message,
      payload
    );


    // Send push notifications
    for (const token of deviceTokens) {
      await notificationService.sendPushNotification(
        token,
        title,
        message,
        {
          type: "stalled_lesson",
          notificationId: notification.id,
          pupilId: pupil.id,

          // Send all necessary IDs for deep linking
          lessonId: lessonNode.id,
          stepId: data.stepId,
          lessonStepId: data.lessonStepId,
          subjectId: subjectId,
          unitId: hierarchy.unit?.id,
          levelId: hierarchy.level?.id,
          segmentId: hierarchy.segment?.id,
          questionType: data.questionType,

          // Screen to navigate to
          screen: data.questionType === 'practice'
            ? "practice-questions"
            : "final-challenge",
        }
      );
    }

    console.log(`📨 Sent stalled lesson notification for pupil: ${pupil.first_name}, lesson: ${lessonNode.title} `);
  }

  private async getLessonHierarchy(lessonId: string) {
    const lesson = await prisma.subject_structure.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        parent_id: true,
        node_type: true,
        order_index: true,
      },
    });

    if (!lesson) return { lesson, unit: null, segment: null, level: null };

    let unit = null;
    let segment = null;
    let level = null;

    // If lesson has a parent, it might be a unit or directly under level
    if (lesson.parent_id) {
      const parent = await prisma.subject_structure.findUnique({
        where: { id: lesson.parent_id },
        select: {
          id: true,
          title: true,
          parent_id: true,
          node_type: true,
          order_index: true,
        },
      });

      if (parent) {
        if (parent.node_type === 'unit') {
          unit = parent;
          // Get the level (parent of unit)
          if (parent.parent_id) {
            level = await prisma.subject_structure.findUnique({
              where: { id: parent.parent_id },
              select: { id: true, title: true, order_index: true },
            });
          }
        } else if (parent.node_type === 'level') {
          level = parent;
        }

        // Get segment (parent of level)
        if (level?.parent_id) {
          segment = await prisma.subject_structure.findUnique({
            where: { id: level.parent_id },
            select: { id: true, title: true },
          });
        }
      }
    }

    return { lesson, unit, segment, level };
  }


}

export const pupilService = new PupilService();
