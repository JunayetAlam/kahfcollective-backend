import { ContentProgressStatus, CourseContentTypeEnum, UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { prisma } from '../../utils/prisma';

type ScopeFilter = {
  courseId?: string;
  semesterId?: string;
  chapterId?: string;
};

type AssessmentScore = {
  contentId: string;
  title: string;
  markPercent: number;
  total: number;
  correct: number;
  isLocked: boolean;
  attempted: boolean;
};

type ScopeMetrics = {
  quizAvgPercent: number;
  quizzesAttempted: number;
  quizzesTotal: number;
  completionPercent: number;
  contentsCompleted: number;
  contentsTotal: number;
  attemptRate: number;
  assessments: AssessmentScore[];
  lastActivityAt: Date | null;
};

const NON_QUIZ_TYPES: CourseContentTypeEnum[] = [
  'VIDEO',
  'PDF',
  'TEXT',
  'VIDEO_LINK',
  'MEETING_LINK',
];

/** Enrolled = has EnrollCourse; forAll courses include all active USERs */
const getEnrolledUserIds = async (courseId: string): Promise<string[]> => {
  const course = await prisma.course.findFirst({
    where: { id: courseId, isDeleted: false },
    select: { forAll: true },
  });
  if (!course) {
    throw new AppError(httpStatus.NOT_FOUND, 'Course not found');
  }

  if (course.forAll) {
    const users = await prisma.user.findMany({
      where: {
        isDeleted: false,
        role: UserRoleEnum.USER,
      },
      select: { id: true },
    });
    return users.map(u => u.id);
  }

  const users = await prisma.user.findMany({
    where: {
      isDeleted: false,
      role: UserRoleEnum.USER,
      enrollCourses: { some: { courseId } },
      userGroups: {
        some: {
          group: {
            isDeleted: false,
            groupCourses: {
              some: { courseId, course: { isDeleted: false } },
            },
          },
        },
      },
    },
    select: { id: true },
  });
  return users.map(u => u.id);
};

const assertStudentAccess = async (
  viewerId: string,
  viewerRole: UserRoleEnum,
  targetUserId: string,
) => {
  if (viewerRole === UserRoleEnum.USER && viewerId !== targetUserId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You can only view your own performance');
  }
};

const assertCourseAccess = async (
  viewerId: string,
  viewerRole: UserRoleEnum,
  courseId: string,
) => {
  if (viewerRole === UserRoleEnum.SUPERADMIN) return;

  const course = await prisma.course.findFirst({
    where: { id: courseId, isDeleted: false },
    select: { instructorId: true, forAll: true },
  });
  if (!course) {
    throw new AppError(httpStatus.NOT_FOUND, 'Course not found');
  }

  if (viewerRole === UserRoleEnum.INSTRUCTOR) {
    if (course.instructorId !== viewerId) {
      throw new AppError(httpStatus.FORBIDDEN, 'Not your course');
    }
    return;
  }

  // USER must be enrolled
  if (course.forAll) return;

  const enrolledIds = await getEnrolledUserIds(courseId);
  if (!enrolledIds.includes(viewerId)) {
    throw new AppError(httpStatus.FORBIDDEN, 'Not enrolled in this course');
  }
};

const publishedContentsWhere = (scope: ScopeFilter) => ({
  isDeleted: false,
  status: 'PUBLISHED' as const,
  ...(scope.courseId ? { courseId: scope.courseId } : {}),
  ...(scope.semesterId ? { semesterId: scope.semesterId } : {}),
  ...(scope.chapterId ? { chapterId: scope.chapterId } : {}),
});

const computeScopeMetrics = async (
  userId: string,
  scope: ScopeFilter,
): Promise<ScopeMetrics> => {
  const contents = await prisma.courseContents.findMany({
    where: publishedContentsWhere(scope),
    select: {
      id: true,
      title: true,
      type: true,
      courseId: true,
      semesterId: true,
      chapterId: true,
      quizzes: {
        where: { isDeleted: false },
        select: { id: true },
      },
    },
    orderBy: { index: 'asc' },
  });

  const quizContents = contents.filter(c => c.type === 'QUIZ');
  const progressContents = contents.filter(c => NON_QUIZ_TYPES.includes(c.type));

  const allQuizIds = quizContents.flatMap(c => c.quizzes.map(q => q.id));
  const answers =
    allQuizIds.length > 0
      ? await prisma.quizAnswers.findMany({
          where: { userId, quizId: { in: allQuizIds }, isDeleted: false },
          select: {
            quizId: true,
            isRight: true,
            isLocked: true,
            isMarked: true,
            updatedAt: true,
          },
        })
      : [];

  const answerByQuiz = new Map(answers.map(a => [a.quizId, a]));

  const assessments: AssessmentScore[] = quizContents.map(c => {
    const quizIds = c.quizzes.map(q => q.id);
    const total = quizIds.length;
    const userAnswers = quizIds
      .map(id => answerByQuiz.get(id))
      .filter(Boolean) as typeof answers;
    const isLocked = total > 0 && userAnswers.length === total && userAnswers.every(a => a.isLocked);
    let correct = 0;
    if (isLocked) {
      correct = userAnswers.filter(a => a.isRight === true).length;
    }
    // Unattempted quizzes count as 0 for ranking fairness
    const rankingMark = isLocked && total > 0 ? (correct / total) * 100 : 0;

    return {
      contentId: c.id,
      title: c.title,
      markPercent: rankingMark,
      total,
      correct: isLocked ? correct : 0,
      isLocked,
      attempted: isLocked,
    };
  });

  const quizzesTotal = assessments.length;
  const quizzesAttempted = assessments.filter(a => a.attempted).length;
  const quizAvgPercent =
    quizzesTotal > 0
      ? assessments.reduce((sum, a) => sum + a.markPercent, 0) / quizzesTotal
      : 0;

  const progressIds = progressContents.map(c => c.id);
  const completedProgress =
    progressIds.length > 0
      ? await prisma.contentProgress.findMany({
          where: {
            userId,
            courseContentId: { in: progressIds },
            status: ContentProgressStatus.COMPLETED,
          },
          select: { courseContentId: true, completedAt: true, updatedAt: true },
        })
      : [];

  const contentsTotal = progressContents.length;
  const contentsCompleted = completedProgress.length;
  const completionPercent =
    contentsTotal > 0 ? (contentsCompleted / contentsTotal) * 100 : 0;
  const attemptRate =
    quizzesTotal > 0 ? (quizzesAttempted / quizzesTotal) * 100 : 0;

  const answerDates = answers.map(a => a.updatedAt.getTime());
  const progressDates = completedProgress.map(p =>
    (p.completedAt || p.updatedAt).getTime(),
  );
  const allDates = [...answerDates, ...progressDates];
  const lastActivityAt =
    allDates.length > 0 ? new Date(Math.max(...allDates)) : null;

  return {
    quizAvgPercent: Math.round(quizAvgPercent * 100) / 100,
    quizzesAttempted,
    quizzesTotal,
    completionPercent: Math.round(completionPercent * 100) / 100,
    contentsCompleted,
    contentsTotal,
    attemptRate: Math.round(attemptRate * 100) / 100,
    assessments,
    lastActivityAt,
  };
};

const recomputeRanksForCourse = async (courseId: string) => {
  const stats = await prisma.studentCourseStats.findMany({
    where: { courseId },
    orderBy: [{ quizAvgPercent: 'desc' }, { completionPercent: 'desc' }],
    select: { id: true },
  });

  await Promise.all(
    stats.map((s, index) =>
      prisma.studentCourseStats.update({
        where: { id: s.id },
        data: { rank: index + 1 },
      }),
    ),
  );
};

const recomputeStudentCourseStats = async (userId: string, courseId: string) => {
  const metrics = await computeScopeMetrics(userId, { courseId });

  const upserted = await prisma.studentCourseStats.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: {
      userId,
      courseId,
      quizAvgPercent: metrics.quizAvgPercent,
      quizzesAttempted: metrics.quizzesAttempted,
      quizzesTotal: metrics.quizzesTotal,
      completionPercent: metrics.completionPercent,
      contentsCompleted: metrics.contentsCompleted,
      contentsTotal: metrics.contentsTotal,
      lastActivityAt: metrics.lastActivityAt,
      computedAt: new Date(),
    },
    update: {
      quizAvgPercent: metrics.quizAvgPercent,
      quizzesAttempted: metrics.quizzesAttempted,
      quizzesTotal: metrics.quizzesTotal,
      completionPercent: metrics.completionPercent,
      contentsCompleted: metrics.contentsCompleted,
      contentsTotal: metrics.contentsTotal,
      lastActivityAt: metrics.lastActivityAt,
      computedAt: new Date(),
    },
  });

  await recomputeRanksForCourse(courseId);
  return upserted;
};

const markContentProgress = async (
  userId: string,
  courseContentId: string,
  role: UserRoleEnum = UserRoleEnum.USER,
) => {
  const content = await prisma.courseContents.findFirst({
    where: { id: courseContentId, isDeleted: false },
    select: {
      id: true,
      courseId: true,
      semesterId: true,
      chapterId: true,
      type: true,
      status: true,
    },
  });

  if (!content) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
  }

  if (role === UserRoleEnum.USER) {
    await assertCourseAccess(userId, role, content.courseId);
  } else if (role === UserRoleEnum.INSTRUCTOR) {
    await assertCourseAccess(userId, role, content.courseId);
  }

  const progress = await prisma.contentProgress.upsert({
    where: {
      userId_courseContentId: { userId, courseContentId },
    },
    create: {
      userId,
      courseContentId,
      courseId: content.courseId,
      semesterId: content.semesterId,
      chapterId: content.chapterId,
      status: ContentProgressStatus.COMPLETED,
      completedAt: new Date(),
    },
    update: {
      status: ContentProgressStatus.COMPLETED,
      completedAt: new Date(),
      semesterId: content.semesterId,
      chapterId: content.chapterId,
    },
  });

  await recomputeStudentCourseStats(userId, content.courseId);
  return progress;
};

/** Silent auto-complete when a student opens content (non-quiz). Never throws. */
const autoMarkOnContentView = async (
  userId: string | undefined,
  courseContentId: string,
  role?: UserRoleEnum | string,
) => {
  try {
    if (!userId || role !== UserRoleEnum.USER) return;

    const content = await prisma.courseContents.findFirst({
      where: { id: courseContentId, isDeleted: false },
      select: {
        id: true,
        courseId: true,
        semesterId: true,
        chapterId: true,
        type: true,
      },
    });
    if (!content || content.type === 'QUIZ') return;

    const existing = await prisma.contentProgress.findUnique({
      where: {
        userId_courseContentId: { userId, courseContentId },
      },
      select: { status: true },
    });
    if (existing?.status === ContentProgressStatus.COMPLETED) return;

    await prisma.contentProgress.upsert({
      where: {
        userId_courseContentId: { userId, courseContentId },
      },
      create: {
        userId,
        courseContentId,
        courseId: content.courseId,
        semesterId: content.semesterId,
        chapterId: content.chapterId,
        status: ContentProgressStatus.COMPLETED,
        completedAt: new Date(),
      },
      update: {
        status: ContentProgressStatus.COMPLETED,
        completedAt: new Date(),
        semesterId: content.semesterId,
        chapterId: content.chapterId,
      },
    });

    await recomputeStudentCourseStats(userId, content.courseId);
  } catch (err) {
    console.error('[autoMarkOnContentView]', err);
  }
};

const getContentProgress = async (userId: string, contentId: string) => {
  return prisma.contentProgress.findUnique({
    where: {
      userId_courseContentId: { userId, courseContentId: contentId },
    },
  });
};

const getCourseCompletedContentIds = async (userId: string, courseId: string) => {
  const rows = await prisma.contentProgress.findMany({
    where: {
      userId,
      courseId,
      status: ContentProgressStatus.COMPLETED,
    },
    select: { courseContentId: true },
  });
  return { completedContentIds: rows.map(r => r.courseContentId) };
};

/** Called after quiz lock — mark quiz content progress + recompute */
const onQuizLocked = async (userId: string, contentId: string) => {
  const content = await prisma.courseContents.findFirst({
    where: { id: contentId },
    select: {
      id: true,
      courseId: true,
      semesterId: true,
      chapterId: true,
    },
  });
  if (!content) return;

  await prisma.contentProgress.upsert({
    where: {
      userId_courseContentId: { userId, courseContentId: contentId },
    },
    create: {
      userId,
      courseContentId: contentId,
      courseId: content.courseId,
      semesterId: content.semesterId,
      chapterId: content.chapterId,
      status: ContentProgressStatus.COMPLETED,
      completedAt: new Date(),
    },
    update: {
      status: ContentProgressStatus.COMPLETED,
      completedAt: new Date(),
    },
  });

  await recomputeStudentCourseStats(userId, content.courseId);
};

const onQuizAnswerMarked = async (answerId: string) => {
  const answer = await prisma.quizAnswers.findUnique({
    where: { id: answerId },
    select: {
      userId: true,
      quiz: { select: { courseContent: { select: { courseId: true } } } },
    },
  });
  if (!answer?.quiz?.courseContent?.courseId) return;
  await recomputeStudentCourseStats(answer.userId, answer.quiz.courseContent.courseId);
};

const getUserEnrolledCourses = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userGroups: {
        where: { group: { isDeleted: false } },
        select: {
          group: {
            select: {
              groupCourses: {
                where: { course: { isDeleted: false } },
                select: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                      thumbnail: true,
                      instructorId: true,
                      forAll: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      enrollCourses: { select: { courseId: true } },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const enrolled = new Set(user.enrollCourses.map(u => u.courseId));
  const courseMap = new Map<
    string,
    { id: string; title: string; thumbnail: string | null; instructorId: string }
  >();

  for (const ug of user.userGroups) {
    for (const gc of ug.group.groupCourses) {
      if (enrolled.has(gc.course.id)) {
        courseMap.set(gc.course.id, {
          id: gc.course.id,
          title: gc.course.title,
          thumbnail: gc.course.thumbnail,
          instructorId: gc.course.instructorId,
        });
      }
    }
  }

  // forAll courses are open to all users
  const forAllCourses = await prisma.course.findMany({
    where: {
      isDeleted: false,
      forAll: true,
      status: 'ACTIVE',
    },
    select: { id: true, title: true, thumbnail: true, instructorId: true },
  });
  for (const c of forAllCourses) {
    courseMap.set(c.id, c);
  }

  return [...courseMap.values()];
};

const getStudentSummary = async (
  targetUserId: string,
  viewerId: string,
  viewerRole: UserRoleEnum,
) => {
  await assertStudentAccess(viewerId, viewerRole, targetUserId);

  const user = await prisma.user.findFirst({
    where: { id: targetUserId, isDeleted: false },
    select: {
      id: true,
      fullName: true,
      email: true,
      profile: true,
      roll: true,
      currentClass: true,
    },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'Student not found');
  }

  const courses = await getUserEnrolledCourses(targetUserId);
  const courseIds = courses.map(c => c.id);

  let stats = await prisma.studentCourseStats.findMany({
    where: { userId: targetUserId, courseId: { in: courseIds } },
  });

  // Lazy recompute missing stats
  const existing = new Set(stats.map(s => s.courseId));
  for (const courseId of courseIds) {
    if (!existing.has(courseId)) {
      const created = await recomputeStudentCourseStats(targetUserId, courseId);
      stats.push(created);
    }
  }

  const coursesWithStats = courses.map(c => {
    const s = stats.find(st => st.courseId === c.id);
    return {
      ...c,
      quizAvgPercent: s?.quizAvgPercent ?? 0,
      completionPercent: s?.completionPercent ?? 0,
      quizzesAttempted: s?.quizzesAttempted ?? 0,
      quizzesTotal: s?.quizzesTotal ?? 0,
      rank: s?.rank ?? null,
      lastActivityAt: s?.lastActivityAt ?? null,
    };
  });

  const avgQuiz =
    coursesWithStats.length > 0
      ? coursesWithStats.reduce((sum, c) => sum + c.quizAvgPercent, 0) /
        coursesWithStats.length
      : 0;
  const avgCompletion =
    coursesWithStats.length > 0
      ? coursesWithStats.reduce((sum, c) => sum + c.completionPercent, 0) /
        coursesWithStats.length
      : 0;

  return {
    user,
    overall: {
      quizAvgPercent: Math.round(avgQuiz * 100) / 100,
      completionPercent: Math.round(avgCompletion * 100) / 100,
      courseCount: coursesWithStats.length,
    },
    courses: coursesWithStats,
  };
};

const getStudentCourseDetail = async (
  targetUserId: string,
  courseId: string,
  viewerId: string,
  viewerRole: UserRoleEnum,
) => {
  await assertStudentAccess(viewerId, viewerRole, targetUserId);
  if (viewerRole === UserRoleEnum.USER) {
    await assertCourseAccess(viewerId, viewerRole, courseId);
  } else if (viewerRole === UserRoleEnum.INSTRUCTOR) {
    await assertCourseAccess(viewerId, viewerRole, courseId);
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, isDeleted: false },
    select: { id: true, title: true, thumbnail: true },
  });
  if (!course) {
    throw new AppError(httpStatus.NOT_FOUND, 'Course not found');
  }

  const semesters = await prisma.semester.findMany({
    where: { courseId, isDeleted: false },
    orderBy: { index: 'asc' },
    select: {
      id: true,
      name: true,
      index: true,
      chapters: {
        where: { isDeleted: false },
        orderBy: { index: 'asc' },
        select: { id: true, name: true, index: true },
      },
    },
  });

  const courseMetrics = await computeScopeMetrics(targetUserId, { courseId });
  let stats = await prisma.studentCourseStats.findUnique({
    where: { userId_courseId: { userId: targetUserId, courseId } },
  });
  if (!stats) {
    stats = await recomputeStudentCourseStats(targetUserId, courseId);
  }

  const semesterBreakdown = await Promise.all(
    semesters.map(async sem => {
      const semMetrics = await computeScopeMetrics(targetUserId, {
        courseId,
        semesterId: sem.id,
      });
      const chapters = await Promise.all(
        sem.chapters.map(async ch => {
          const chMetrics = await computeScopeMetrics(targetUserId, {
            courseId,
            chapterId: ch.id,
          });
          return {
            id: ch.id,
            name: ch.name,
            index: ch.index,
            quizAvgPercent: chMetrics.quizAvgPercent,
            completionPercent: chMetrics.completionPercent,
            attemptRate: chMetrics.attemptRate,
            quizzesAttempted: chMetrics.quizzesAttempted,
            quizzesTotal: chMetrics.quizzesTotal,
            contentsCompleted: chMetrics.contentsCompleted,
            contentsTotal: chMetrics.contentsTotal,
            assessments: chMetrics.assessments,
          };
        }),
      );
      return {
        id: sem.id,
        name: sem.name,
        index: sem.index,
        quizAvgPercent: semMetrics.quizAvgPercent,
        completionPercent: semMetrics.completionPercent,
        attemptRate: semMetrics.attemptRate,
        chapters,
      };
    }),
  );

  return {
    course,
    rank: stats.rank,
    quizAvgPercent: courseMetrics.quizAvgPercent,
    completionPercent: courseMetrics.completionPercent,
    attemptRate: courseMetrics.attemptRate,
    quizzesAttempted: courseMetrics.quizzesAttempted,
    quizzesTotal: courseMetrics.quizzesTotal,
    contentsCompleted: courseMetrics.contentsCompleted,
    contentsTotal: courseMetrics.contentsTotal,
    lastActivityAt: courseMetrics.lastActivityAt,
    assessments: courseMetrics.assessments,
    semesters: semesterBreakdown,
  };
};

const getCourseLeaderboard = async (
  courseId: string,
  viewerId: string,
  viewerRole: UserRoleEnum,
) => {
  if (viewerRole === UserRoleEnum.USER) {
    throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
  }
  await assertCourseAccess(viewerId, viewerRole, courseId);

  const enrolledIds = await getEnrolledUserIds(courseId);

  // Ensure stats exist
  const existing = await prisma.studentCourseStats.findMany({
    where: { courseId, userId: { in: enrolledIds } },
    select: { userId: true },
  });
  const have = new Set(existing.map(e => e.userId));
  for (const uid of enrolledIds) {
    if (!have.has(uid)) {
      await recomputeStudentCourseStats(uid, courseId);
    }
  }

  const stats = await prisma.studentCourseStats.findMany({
    where: { courseId, userId: { in: enrolledIds } },
    orderBy: [{ quizAvgPercent: 'desc' }, { completionPercent: 'desc' }],
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
          roll: true,
          currentClass: true,
        },
      },
    },
  });

  return stats.map((s, i) => ({
    rank: s.rank ?? i + 1,
    userId: s.userId,
    user: s.user,
    quizAvgPercent: s.quizAvgPercent,
    completionPercent: s.completionPercent,
    quizzesAttempted: s.quizzesAttempted,
    quizzesTotal: s.quizzesTotal,
    lastActivityAt: s.lastActivityAt,
  }));
};

const compareStudents = async (
  userA: string,
  userB: string,
  viewerId: string,
  viewerRole: UserRoleEnum,
  scope: ScopeFilter,
) => {
  if (viewerRole === UserRoleEnum.USER) {
    throw new AppError(httpStatus.FORBIDDEN, 'Students cannot compare peers');
  }

  if (scope.courseId) {
    await assertCourseAccess(viewerId, viewerRole, scope.courseId);
  }

  const [aUser, bUser] = await Promise.all([
    prisma.user.findFirst({
      where: { id: userA, isDeleted: false },
      select: { id: true, fullName: true, email: true, profile: true, roll: true },
    }),
    prisma.user.findFirst({
      where: { id: userB, isDeleted: false },
      select: { id: true, fullName: true, email: true, profile: true, roll: true },
    }),
  ]);

  if (!aUser || !bUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'One or both students not found');
  }

  // Global: average across enrolled courses; scoped: single scope metrics
  let metricsA: ScopeMetrics;
  let metricsB: ScopeMetrics;
  let rankA: number | null = null;
  let rankB: number | null = null;

  if (scope.chapterId || scope.semesterId || scope.courseId) {
    metricsA = await computeScopeMetrics(userA, scope);
    metricsB = await computeScopeMetrics(userB, scope);
    if (scope.courseId && !scope.chapterId && !scope.semesterId) {
      const [sa, sb] = await Promise.all([
        prisma.studentCourseStats.findUnique({
          where: { userId_courseId: { userId: userA, courseId: scope.courseId } },
        }),
        prisma.studentCourseStats.findUnique({
          where: { userId_courseId: { userId: userB, courseId: scope.courseId } },
        }),
      ]);
      rankA = sa?.rank ?? null;
      rankB = sb?.rank ?? null;
    }
  } else {
    // Global averages
    const [sumA, sumB] = await Promise.all([
      getStudentSummary(userA, viewerId, viewerRole),
      getStudentSummary(userB, viewerId, viewerRole),
    ]);
    metricsA = {
      quizAvgPercent: sumA.overall.quizAvgPercent,
      completionPercent: sumA.overall.completionPercent,
      quizzesAttempted: 0,
      quizzesTotal: 0,
      contentsCompleted: 0,
      contentsTotal: 0,
      attemptRate: 0,
      assessments: [],
      lastActivityAt: null,
    };
    metricsB = {
      quizAvgPercent: sumB.overall.quizAvgPercent,
      completionPercent: sumB.overall.completionPercent,
      quizzesAttempted: 0,
      quizzesTotal: 0,
      contentsCompleted: 0,
      contentsTotal: 0,
      attemptRate: 0,
      assessments: [],
      lastActivityAt: null,
    };
  }

  return {
    scope,
    studentA: {
      user: aUser,
      rank: rankA,
      quizAvgPercent: metricsA.quizAvgPercent,
      completionPercent: metricsA.completionPercent,
      attemptRate: metricsA.attemptRate,
      quizzesAttempted: metricsA.quizzesAttempted,
      quizzesTotal: metricsA.quizzesTotal,
      contentsCompleted: metricsA.contentsCompleted,
      contentsTotal: metricsA.contentsTotal,
      assessments: metricsA.assessments,
    },
    studentB: {
      user: bUser,
      rank: rankB,
      quizAvgPercent: metricsB.quizAvgPercent,
      completionPercent: metricsB.completionPercent,
      attemptRate: metricsB.attemptRate,
      quizzesAttempted: metricsB.quizzesAttempted,
      quizzesTotal: metricsB.quizzesTotal,
      contentsCompleted: metricsB.contentsCompleted,
      contentsTotal: metricsB.contentsTotal,
      assessments: metricsB.assessments,
    },
    deltas: {
      quizAvg: Math.round((metricsB.quizAvgPercent - metricsA.quizAvgPercent) * 100) / 100,
      completion:
        Math.round((metricsB.completionPercent - metricsA.completionPercent) * 100) / 100,
      attemptRate: Math.round((metricsB.attemptRate - metricsA.attemptRate) * 100) / 100,
    },
  };
};

const compareSubjects = async (
  targetUserId: string,
  chapterA: string,
  chapterB: string,
  viewerId: string,
  viewerRole: UserRoleEnum,
) => {
  await assertStudentAccess(viewerId, viewerRole, targetUserId);

  const [chA, chB] = await Promise.all([
    prisma.chapter.findFirst({
      where: { id: chapterA, isDeleted: false },
      select: {
        id: true,
        name: true,
        courseId: true,
        semesterId: true,
        index: true,
        semester: { select: { name: true } },
        course: { select: { title: true } },
      },
    }),
    prisma.chapter.findFirst({
      where: { id: chapterB, isDeleted: false },
      select: {
        id: true,
        name: true,
        courseId: true,
        semesterId: true,
        index: true,
        semester: { select: { name: true } },
        course: { select: { title: true } },
      },
    }),
  ]);

  if (!chA || !chB) {
    throw new AppError(httpStatus.NOT_FOUND, 'One or both subjects not found');
  }

  if (viewerRole === UserRoleEnum.USER) {
    await assertCourseAccess(viewerId, viewerRole, chA.courseId);
    if (chA.courseId !== chB.courseId) {
      await assertCourseAccess(viewerId, viewerRole, chB.courseId);
    }
  } else if (viewerRole === UserRoleEnum.INSTRUCTOR) {
    await assertCourseAccess(viewerId, viewerRole, chA.courseId);
    if (chA.courseId !== chB.courseId) {
      await assertCourseAccess(viewerId, viewerRole, chB.courseId);
    }
  }

  const [metricsA, metricsB] = await Promise.all([
    computeScopeMetrics(targetUserId, { chapterId: chapterA, courseId: chA.courseId }),
    computeScopeMetrics(targetUserId, { chapterId: chapterB, courseId: chB.courseId }),
  ]);

  const buildSubject = (
    ch: NonNullable<typeof chA>,
    metrics: ScopeMetrics,
  ) => ({
    chapterId: ch.id,
    name: ch.name,
    index: ch.index,
    courseId: ch.courseId,
    courseTitle: ch.course.title,
    semesterId: ch.semesterId,
    semesterName: ch.semester.name,
    quizAvgPercent: metrics.quizAvgPercent,
    completionPercent: metrics.completionPercent,
    attemptRate: metrics.attemptRate,
    quizzesAttempted: metrics.quizzesAttempted,
    quizzesTotal: metrics.quizzesTotal,
    contentsCompleted: metrics.contentsCompleted,
    contentsTotal: metrics.contentsTotal,
    assessments: metrics.assessments,
  });

  return {
    subjectA: buildSubject(chA, metricsA),
    subjectB: buildSubject(chB, metricsB),
    deltas: {
      quizAvg: Math.round((metricsB.quizAvgPercent - metricsA.quizAvgPercent) * 100) / 100,
      completion:
        Math.round((metricsB.completionPercent - metricsA.completionPercent) * 100) / 100,
      attemptRate: Math.round((metricsB.attemptRate - metricsA.attemptRate) * 100) / 100,
    },
  };
};

const backfillAllStats = async () => {
  const courses = await prisma.course.findMany({
    where: { isDeleted: false },
    select: { id: true },
  });

  let count = 0;
  for (const course of courses) {
    const userIds = await getEnrolledUserIds(course.id);
    for (const userId of userIds) {
      await recomputeStudentCourseStats(userId, course.id);
      count++;
    }
  }
  return { recomputed: count };
};

export const AnalyticsService = {
  markContentProgress,
  autoMarkOnContentView,
  getContentProgress,
  getCourseCompletedContentIds,
  onQuizLocked,
  onQuizAnswerMarked,
  recomputeStudentCourseStats,
  getStudentSummary,
  getStudentCourseDetail,
  getCourseLeaderboard,
  compareStudents,
  compareSubjects,
  backfillAllStats,
  getEnrolledUserIds,
};
