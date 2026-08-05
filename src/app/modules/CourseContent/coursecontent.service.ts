import { CourseContents, Quiz, UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import {
  assertCourseAccess,
  changeIndexInContainer,
  getNextContentIndex,
  loadChapterLevelItems,
  loadCourseLevelItems,
  loadSemesterLevelItems,
  moveItemBetweenContainers,
  removeFromMixedList,
  resolveContentScope,
  validateAndResolveContentParents,
  writeMixedIndexes,
} from '../../utils/hierarchy.utils';
import { prisma } from '../../utils/prisma';
import {
  deleteFromStorage,
  uploadToStorage,
} from '../../utils/uploadToStorage';

const getContentWithCourseAccess = async (
  contentId: string,
  userId: string,
  role: UserRoleEnum,
  requireNotDeleted = true,
) => {
  const content = await prisma.courseContents.findUnique({
    where: { id: contentId },
    include: {
      course: { select: { id: true, instructorId: true, isDeleted: true } },
    },
  });

  if (!content || (requireNotDeleted && content.isDeleted)) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
  }

  if (
    role !== UserRoleEnum.SUPERADMIN &&
    content.course.instructorId !== userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  return content;
};

const createFileContent = async (
  payload: Pick<
    CourseContents,
    'courseId' | 'title' | 'description' | 'status' | 'type'
  > & {
    semesterId?: string | null;
    chapterId?: string | null;
  },
  file: Express.Multer.File | undefined,
  userId: string,
  role: UserRoleEnum,
) => {
  if (payload.type === 'VIDEO') {
    if (!file) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Please Provide Video');
    }
    if (!file.mimetype.startsWith('video/')) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Only video files are allowed');
    }
  } else if (payload.type === 'PDF') {
    if (!file) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Please Provide PDF');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Only pdf files are allowed');
    }
  } else {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This endpoint only accepts VIDEO or PDF content',
    );
  }

  await assertCourseAccess(payload.courseId, userId, role);

  const parents = await validateAndResolveContentParents({
    courseId: payload.courseId,
    semesterId: payload.semesterId,
    chapterId: payload.chapterId,
  });

  const { Location } = await uploadToStorage(file!);

  return prisma.$transaction(async tx => {
    const index = await getNextContentIndex(tx, parents);

    return tx.courseContents.create({
      data: {
        title: payload.title,
        description: payload.description,
        status: payload.status,
        type: payload.type,
        courseId: parents.courseId,
        semesterId: parents.semesterId,
        chapterId: parents.chapterId,
        index,
        ...(payload.type === 'VIDEO'
          ? { videoUrl: Location }
          : { pdfUrl: Location }),
      },
    });
  });
};

const createTextOrLinkContent = async (
  payload: Pick<
    CourseContents,
    'courseId' | 'title' | 'description' | 'status' | 'type'
  > & {
    semesterId?: string | null;
    chapterId?: string | null;
    text?: string | null;
    videoLink?: string | null;
    meetingLink?: string | null;
  },
  userId: string,
  role: UserRoleEnum,
) => {
  if (
    payload.type !== 'TEXT' &&
    payload.type !== 'VIDEO_LINK' &&
    payload.type !== 'MEETING_LINK'
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Type must be TEXT, VIDEO_LINK, or MEETING_LINK',
    );
  }

  await assertCourseAccess(payload.courseId, userId, role);

  const parents = await validateAndResolveContentParents({
    courseId: payload.courseId,
    semesterId: payload.semesterId,
    chapterId: payload.chapterId,
  });

  return prisma.$transaction(async tx => {
    const index = await getNextContentIndex(tx, parents);

    return tx.courseContents.create({
      data: {
        title: payload.title,
        description: payload.description,
        status: payload.status,
        type: payload.type,
        courseId: parents.courseId,
        semesterId: parents.semesterId,
        chapterId: parents.chapterId,
        index,
        ...(payload.type === 'TEXT' ? { text: payload.text ?? null } : {}),
        ...(payload.type === 'VIDEO_LINK'
          ? { videoLink: payload.videoLink ?? null }
          : {}),
        ...(payload.type === 'MEETING_LINK'
          ? { meetingLink: payload.meetingLink ?? null }
          : {}),
      },
    });
  });
};

const updateFileContent = async (
  userId: string,
  role: UserRoleEnum,
  contentId: string,
  file: Express.Multer.File | undefined,
) => {
  const isContentExist = await getContentWithCourseAccess(
    contentId,
    userId,
    role,
  );

  if (isContentExist.type === 'VIDEO') {
    if (!file) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Please Provide Video');
    }
    if (!file.mimetype.startsWith('video/')) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Only video files are allowed');
    }
  } else {
    if (!file) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Please Provide PDF');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Only pdf files are allowed');
    }
  }

  const { Location } = await uploadToStorage(file!);

  const result = await prisma.courseContents.update({
    where: { id: contentId },
    data: {
      ...(isContentExist.type === 'VIDEO'
        ? { videoUrl: Location }
        : { pdfUrl: Location }),
    },
  });

  const deletingUrl =
    isContentExist.type === 'VIDEO'
      ? isContentExist.videoUrl
      : isContentExist.pdfUrl;
  if (deletingUrl) {
    await deleteFromStorage(deletingUrl);
  }
  return result;
};

const createQuizContent = async (
  payload: Pick<
    CourseContents,
    'courseId' | 'title' | 'description' | 'status'
  > & {
    quizzes: Quiz[];
    semesterId?: string | null;
    chapterId?: string | null;
  },
  userId: string,
  role: UserRoleEnum,
) => {
  await assertCourseAccess(payload.courseId, userId, role);

  const parents = await validateAndResolveContentParents({
    courseId: payload.courseId,
    semesterId: payload.semesterId,
    chapterId: payload.chapterId,
  });

  return prisma.$transaction(async tx => {
    const index = await getNextContentIndex(tx, parents);

    return tx.courseContents.create({
      data: {
        title: payload.title,
        description: payload.description,
        status: payload.status,
        type: 'QUIZ',
        index,
        courseId: parents.courseId,
        semesterId: parents.semesterId,
        chapterId: parents.chapterId,
        quizzes: {
          createMany: {
            data: payload.quizzes.map((item, quizIndex) => ({
              type: item.type,
              question: item.question,
              rightAnswer: item.rightAnswer,
              options: item.options ?? undefined,
              instructorId: userId,
              index: quizIndex + 1,
            })),
          },
        },
      },
    });
  });
};

const updateAnswerStatus = async (
  payload: { answerId: string; isCorrect: boolean },
  userId: string,
  userRole: string,
) => {
  const result = await prisma.questionAnswer.update({
    where: {
      id: payload.answerId,
      ...(userRole !== 'SUPERADMIN' && {
        question: {
          instructorId: userId,
        },
      }),
    },
    data: {
      isCorrectAnswer: payload.isCorrect,
    },
    select: {
      id: true,
      providedAnswer: true,
      isCorrectAnswer: true,
      userId: true,
      questionId: true,
    },
  });

  return result;
};

const updateContent = async (
  id: string,
  payload: Partial<
    Pick<
      CourseContents,
      | 'description'
      | 'title'
      | 'status'
      | 'type'
      | 'text'
      | 'videoLink'
      | 'meetingLink'
    >
  >,
  userId: string,
  role: UserRoleEnum,
) => {
  await getContentWithCourseAccess(id, userId, role);

  const data: Record<string, unknown> = { ...payload };

  if (payload.videoLink === '') data.videoLink = null;
  if (payload.meetingLink === '') data.meetingLink = null;

  if (payload.type) {
    if (payload.type === 'TEXT') {
      data.videoLink = null;
      data.meetingLink = null;
    } else if (payload.type === 'VIDEO_LINK') {
      data.text = null;
      data.meetingLink = null;
    } else if (payload.type === 'MEETING_LINK') {
      data.text = null;
      data.videoLink = null;
    } else if (payload.type === 'VIDEO' || payload.type === 'PDF') {
      data.text = null;
      data.videoLink = null;
      data.meetingLink = null;
    } else if (payload.type === 'QUIZ') {
      data.text = null;
      data.videoLink = null;
      data.meetingLink = null;
    }
  }

  return prisma.courseContents.update({
    where: { id },
    data,
  });
};

const toggleDeleteContent = async (
  id: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const content = await getContentWithCourseAccess(id, userId, role, false);
  const scope = resolveContentScope(content);

  if (!content.isDeleted) {
    await prisma.$transaction(async tx => {
      if (scope === 'CHAPTER' && content.chapterId) {
        const items = await loadChapterLevelItems(tx, content.chapterId);
        await writeMixedIndexes(
          tx,
          removeFromMixedList(items, id, 'CONTENT'),
        );
      } else if (scope === 'SEMESTER' && content.semesterId) {
        const items = await loadSemesterLevelItems(tx, content.semesterId);
        await writeMixedIndexes(
          tx,
          removeFromMixedList(items, id, 'CONTENT'),
        );
      } else {
        const items = await loadCourseLevelItems(tx, content.courseId);
        await writeMixedIndexes(
          tx,
          removeFromMixedList(items, id, 'CONTENT'),
        );
      }
      await tx.courseContents.update({
        where: { id },
        data: { isDeleted: true, index: 10000 },
      });
    });
  } else {
    await prisma.$transaction(async tx => {
      const parents = {
        courseId: content.courseId,
        semesterId: content.semesterId,
        chapterId: content.chapterId,
      };
      const index = await getNextContentIndex(tx, parents);
      await tx.courseContents.update({
        where: { id },
        data: { isDeleted: false, index },
      });
    });
  }

  return prisma.courseContents.findUnique({ where: { id } });
};

const createQuiz = async (
  payload: Quiz,
  userId: string,
  role: UserRoleEnum,
) => {
  if (payload.type === 'MULTIPLE_CHOICE') {
    const quizOptions = payload.options;
    if (!quizOptions) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Quiz Option is Required');
    }
    const values = Object.values(quizOptions);
    const hasDuplicates = new Set(values).size !== values.length;

    if (hasDuplicates) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Quiz options must all be different.',
      );
    }
  }

  const isCourseContentExist = await getContentWithCourseAccess(
    payload.courseContentId,
    userId,
    role,
  );

  const count = await prisma.quiz.count({
    where: {
      courseContentId: payload.courseContentId,
      isDeleted: false,
    },
  });

  return prisma.quiz.create({
    data: {
      type: payload.type,
      question: payload.question,
      rightAnswer: payload.rightAnswer,
      options: payload.options ?? undefined,
      courseContentId: payload.courseContentId,
      index: count + 1,
      instructorId: isCourseContentExist.course.instructorId,
    },
  });
};

const updateQuiz = async (
  id: string,
  payload: Partial<Pick<Quiz, 'question' | 'options' | 'rightAnswer' | 'type'>>,
  userId: string,
  role: UserRoleEnum,
) => {
  if (payload.type === 'MULTIPLE_CHOICE') {
    const quizOptions = payload?.options;
    if (!quizOptions)
      throw new AppError(httpStatus.BAD_REQUEST, 'Quiz Option is required');
    const values = Object.values(quizOptions);
    const hasDuplicates = new Set(values).size !== values.length;

    if (hasDuplicates) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Quiz options must all be different.',
      );
    }
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      courseContent: {
        include: {
          course: { select: { instructorId: true } },
        },
      },
    },
  });

  if (!quiz) {
    throw new AppError(httpStatus.NOT_FOUND, 'Quiz not found');
  }

  if (
    role !== UserRoleEnum.SUPERADMIN &&
    quiz.courseContent.course.instructorId !== userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  return prisma.quiz.update({
    where: { id },
    data: payload,
  });
};

const getAllContentForSpecificCourse = async (
  courseId: string,
  userId: string,
  role: UserRoleEnum,
) => {
  await assertCourseAccess(courseId, userId, role);

  return prisma.courseContents.findMany({
    where: {
      courseId,
      isDeleted: false,
    },
    orderBy: {
      index: 'asc',
    },
  });
};

const getAllContentForSpecificCourseForUser = async (
  courseId: string,
  userId: string,
) => {
  const contents = await prisma.courseContents.findMany({
    where: {
      courseId,
      isDeleted: false,
    },
    include: {
      courseQuestions: {
        include: {
          questionAnswers: {
            take: 1,
            where: {
              userId: userId,
            },
          },
        },
      },
    },
    orderBy: {
      index: 'asc',
    },
  });

  return contents.map(content => ({
    ...content,
    hasAnswered: (content.courseQuestions?.questionAnswers ?? []).length > 0,
    courseQuestions: {
      ...content.courseQuestions,
      answer: content.courseQuestions?.questionAnswers[0],
      questionAnswers: undefined,
    },
  }));
};

const getSingleContent = async (
  contentId: string,
  userId: string,
  role: UserRoleEnum,
) => {
  await getContentWithCourseAccess(contentId, userId, role);

  const content = await prisma.courseContents.findUnique({
    where: { id: contentId },
    include: {
      quizzes: {
        where: {
          ...(role !== UserRoleEnum.SUPERADMIN && { isDeleted: false }),
        },
        orderBy: {
          index: 'asc',
        },
      },
    },
  });

  if (!content) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
  }

  return content;
};

const getSingleContentForUser = async (contentId: string, userId: string) => {
  const content = await prisma.courseContents.findUnique({
    where: {
      id: contentId,
      isDeleted: false,
    },
    include: {
      quizzes: {
        where: {
          isDeleted: false,
        },
        orderBy: {
          index: 'asc',
        },
      },
    },
  });

  if (!content) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
  }

  return content;
};

const getAllQuizForSpecificCourseContent = async (
  courseContentId: string,
  userId: string,
  role: UserRoleEnum,
) => {
  await getContentWithCourseAccess(courseContentId, userId, role);

  return prisma.quiz.findMany({
    where: {
      courseContentId,
      ...(role !== UserRoleEnum.SUPERADMIN && { isDeleted: false }),
    },
    orderBy: {
      index: 'asc',
    },
  });
};

const getAllQuizForSpecificCourseContentForUser = async (
  courseContentId: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const isCourseContentExist = await prisma.courseContents.findUnique({
    where: {
      id: courseContentId,
      isDeleted: false,
    },
  });

  if (!isCourseContentExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Course Content not found');
  }

  return prisma.quiz.findMany({
    where: {
      courseContentId,
      isDeleted: false,
    },
    orderBy: {
      index: 'asc',
    },
    ...(role === 'USER' && {
      omit: {
        rightAnswer: true,
        updatedAt: true,
      },
      include: {
        quizAnswers: {
          where: {
            userId: userId,
          },
          select: {
            answer: true,
          },
        },
      },
    }),
  });
};

const getSingleQuiz = async (
  quizId: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      courseContent: {
        include: {
          course: { select: { instructorId: true } },
        },
      },
    },
  });

  if (!quiz || (role !== UserRoleEnum.SUPERADMIN && quiz.isDeleted)) {
    throw new AppError(httpStatus.NOT_FOUND, 'Quiz not found');
  }

  if (
    role !== UserRoleEnum.SUPERADMIN &&
    quiz.courseContent.course.instructorId !== userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  return quiz;
};

const getSingleQuizForUser = async (
  quizId: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const quiz = await prisma.quiz.findUnique({
    where: {
      id: quizId,
      isDeleted: false,
    },
    omit: {
      ...(role === 'USER' && { rightAnswer: true }),
    },
    include: {
      courseContent: {
        select: {
          courseId: true,
        },
      },
    },
  });

  if (!quiz) {
    throw new AppError(httpStatus.NOT_FOUND, 'Quiz not found');
  }

  return quiz;
};

const toggleDeleteQuiz = async (
  id: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      courseContent: {
        include: {
          course: { select: { instructorId: true } },
        },
      },
    },
  });

  if (!quiz) {
    throw new AppError(httpStatus.NOT_FOUND, 'Quiz not found');
  }

  if (
    role !== UserRoleEnum.SUPERADMIN &&
    quiz.courseContent.course.instructorId !== userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  if (quiz.isDeleted) {
    const lastQuiz = await prisma.quiz.findFirst({
      where: {
        courseContentId: quiz.courseContentId,
        isDeleted: false,
      },
      orderBy: { index: 'desc' },
    });

    const newIndex = lastQuiz ? lastQuiz.index + 1 : 1;

    return prisma.quiz.update({
      where: { id },
      data: {
        isDeleted: false,
        index: newIndex,
      },
    });
  }

  return prisma.$transaction(async tx => {
    await tx.quiz.update({
      where: { id },
      data: {
        isDeleted: true,
        index: 1000,
      },
    });

    await tx.quiz.updateMany({
      where: {
        courseContentId: quiz.courseContentId,
        isDeleted: false,
        index: {
          gt: quiz.index,
        },
      },
      data: {
        index: {
          decrement: 1,
        },
      },
    });

    return tx.quiz.findUnique({ where: { id } });
  });
};

const changeContentIndex = async (
  contentId: string,
  newIndex: number,
  userId: string,
  role: UserRoleEnum,
) => {
  const content = await getContentWithCourseAccess(contentId, userId, role);
  const scope = resolveContentScope(content);

  await prisma.$transaction(async tx => {
    if (scope === 'CHAPTER' && content.chapterId) {
      await changeIndexInContainer(tx, {
        container: 'CHAPTER',
        containerId: content.chapterId,
        itemId: contentId,
        kind: 'CONTENT',
        newIndex,
      });
    } else if (scope === 'SEMESTER' && content.semesterId) {
      await changeIndexInContainer(tx, {
        container: 'SEMESTER',
        containerId: content.semesterId,
        itemId: contentId,
        kind: 'CONTENT',
        newIndex,
      });
    } else {
      await changeIndexInContainer(tx, {
        container: 'COURSE',
        containerId: content.courseId,
        itemId: contentId,
        kind: 'CONTENT',
        newIndex,
      });
    }
  });

  return prisma.courseContents.findUnique({ where: { id: contentId } });
};

const moveContent = async (
  contentId: string,
  payload: {
    scope: 'COURSE' | 'SEMESTER' | 'CHAPTER';
    semesterId?: string | null;
    chapterId?: string | null;
    newIndex: number;
  },
  userId: string,
  role: UserRoleEnum,
) => {
  const content = await getContentWithCourseAccess(contentId, userId, role);
  const fromScope = resolveContentScope(content);

  let targetParents: {
    courseId: string;
    semesterId: string | null;
    chapterId: string | null;
  };

  if (payload.scope === 'COURSE') {
    targetParents = {
      courseId: content.courseId,
      semesterId: null,
      chapterId: null,
    };
  } else if (payload.scope === 'SEMESTER') {
    if (!payload.semesterId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'semesterId is required');
    }
    targetParents = await validateAndResolveContentParents({
      courseId: content.courseId,
      semesterId: payload.semesterId,
      chapterId: null,
    });
  } else {
    if (!payload.chapterId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'chapterId is required');
    }
    targetParents = await validateAndResolveContentParents({
      courseId: content.courseId,
      semesterId: payload.semesterId,
      chapterId: payload.chapterId,
    });
  }

  const fromContainer =
    fromScope === 'CHAPTER'
      ? { container: 'CHAPTER' as const, id: content.chapterId! }
      : fromScope === 'SEMESTER'
        ? { container: 'SEMESTER' as const, id: content.semesterId! }
        : { container: 'COURSE' as const, id: content.courseId };

  const toContainer =
    payload.scope === 'CHAPTER'
      ? { container: 'CHAPTER' as const, id: targetParents.chapterId! }
      : payload.scope === 'SEMESTER'
        ? { container: 'SEMESTER' as const, id: targetParents.semesterId! }
        : { container: 'COURSE' as const, id: targetParents.courseId };

  await prisma.$transaction(async tx => {
    await moveItemBetweenContainers(tx, {
      itemId: contentId,
      kind: 'CONTENT',
      from: fromContainer,
      to: toContainer,
      newIndex: payload.newIndex,
      afterRemoveUpdate: async () => {
        await tx.courseContents.update({
          where: { id: contentId },
          data: {
            semesterId: targetParents.semesterId,
            chapterId: targetParents.chapterId,
          },
        });
      },
    });
  });

  return prisma.courseContents.findUnique({ where: { id: contentId } });
};

const changeQuizIndex = async (
  quizId: string,
  newIndex: number,
  userId: string,
  role: UserRoleEnum,
) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId, isDeleted: false },
    include: {
      courseContent: {
        include: {
          course: { select: { instructorId: true } },
        },
      },
    },
  });

  if (!quiz) {
    throw new AppError(httpStatus.NOT_FOUND, 'Quiz not found');
  }

  if (
    role !== UserRoleEnum.SUPERADMIN &&
    quiz.courseContent.course.instructorId !== userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  const currentIndex = quiz.index;
  const courseContentId = quiz.courseContentId;

  const totalCount = await prisma.quiz.count({
    where: {
      courseContentId,
      isDeleted: false,
    },
  });

  if (newIndex < 1 || newIndex > totalCount) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Index must be between 1 and ${totalCount}`,
    );
  }

  if (currentIndex === newIndex) {
    return quiz;
  }

  await prisma.$transaction(async tx => {
    if (currentIndex < newIndex) {
      await tx.quiz.updateMany({
        where: {
          courseContentId,
          isDeleted: false,
          index: {
            gt: currentIndex,
            lte: newIndex,
          },
        },
        data: {
          index: {
            decrement: 1,
          },
        },
      });
    } else {
      await tx.quiz.updateMany({
        where: {
          courseContentId,
          isDeleted: false,
          index: {
            gte: newIndex,
            lt: currentIndex,
          },
        },
        data: {
          index: {
            increment: 1,
          },
        },
      });
    }

    await tx.quiz.update({
      where: { id: quizId },
      data: { index: newIndex },
    });
  });

  return prisma.quiz.findUnique({ where: { id: quizId } });
};

export const CoursecontentService = {
  createFileContent,
  createTextOrLinkContent,
  updateFileContent,
  createQuizContent,
  updateContent,
  toggleDeleteContent,
  createQuiz,
  updateQuiz,
  getAllContentForSpecificCourse,
  getSingleContent,
  getAllQuizForSpecificCourseContent,
  getSingleQuiz,
  getAllContentForSpecificCourseForUser,
  getSingleContentForUser,
  getAllQuizForSpecificCourseContentForUser,
  getSingleQuizForUser,
  toggleDeleteQuiz,
  changeContentIndex,
  moveContent,
  changeQuizIndex,
  updateAnswerStatus,
};
