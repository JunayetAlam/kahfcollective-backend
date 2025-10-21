import { CourseContents, Quiz, UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { prisma } from '../../utils/prisma';
import { toggleDelete } from '../../utils/toggleDelete';
import {
  deleteFromDigitalOceanAWS,
  uploadToDigitalOceanAWS,
} from '../../utils/uploadToDigitalOceanAWS';

const checkSuperAdmin = (role: UserRoleEnum, userId: string) => {
  if (role !== 'SUPERADMIN') {
    return {
      isDeleted: false,
      instructorId: userId,
    };
  } else {
    return { isDeleted: false };
  }
};

const createFileContent = async (
  payload: Pick<
    CourseContents,
    'courseId' | 'title' | 'description' | 'status' | 'type'
  >,
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
  }
  else {
    if (!file) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Please Provide PDF');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Only pdf files are allowed');
    }
  }





  const isCourseExist = await prisma.course.findUnique({
    where: {
      id: payload.courseId,
      ...checkSuperAdmin(role, userId),
    },
  });
  if (!isCourseExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Get count for this specific course
  const count = await prisma.courseContents.count({
    where: {
      courseId: payload.courseId,
      isDeleted: false,
    },
  });

  const { Location } = await uploadToDigitalOceanAWS(file);
  const result = await prisma.courseContents.create({
    data: {
      ...payload,
      index: count + 1,
      ...(payload.type === 'VIDEO' ? { videoUrl: Location } : { pdfUrl: Location }),
      instructorId: isCourseExist.instructorId,
    },
  });
  return result;
};

const updateFileContent = async (
  userId: string,
  role: UserRoleEnum,
  contentId: string,
  file: Express.Multer.File | undefined,
) => {
  console.log(contentId)
  const isContentExist = await prisma.courseContents.findUnique({
    where: {
      id: contentId,
      ...checkSuperAdmin(role, userId),
    },
  });
  if (!isContentExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content Not found');
  }
  if (isContentExist.type === 'VIDEO') {
    if (!file) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Please Provide Video');
    }
    if (!file.mimetype.startsWith('video/')) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Only video files are allowed');
    }
  }
  else {
    if (!file) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Please Provide PDF');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Only pdf files are allowed');
    }
  }



  const { Location } = await uploadToDigitalOceanAWS(file);

  const result = await prisma.courseContents.update({
    where: {
      id: contentId,
    },
    data: {
      ...(isContentExist.type === 'VIDEO' ? { videoUrl: Location } : { pdfUrl: Location }),
    },
  });
  const deletingUrl = isContentExist.type === 'VIDEO' ? isContentExist.videoUrl : isContentExist.pdfUrl
  if (deletingUrl) {
    await deleteFromDigitalOceanAWS(deletingUrl);
  }
  return result;
};

const createQuizContent = async (
  payload: Pick<
    CourseContents,
    'courseId' | 'title' | 'description' | 'status'
  > & { quizzes: Quiz[] },
  userId: string,
  role: UserRoleEnum,
) => {
  const isCourseExist = await prisma.course.findUnique({
    where: {
      id: payload.courseId,
      ...checkSuperAdmin(role, userId),
    },
  });
  if (!isCourseExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Get count for this specific course
  const count = await prisma.courseContents.count({
    where: {
      courseId: payload.courseId,
      isDeleted: false,
    },
  });

  const result = await prisma.courseContents.create({
    data: {
      title: payload.title,
      description: payload.description,
      status: payload.status,
      type: 'QUIZ',
      index: count + 1,
      courseId: payload.courseId,
      quizzes: {
        createMany: {
          data: payload.quizzes.map((item, index) => ({
            ...item,
            instructorId: userId,
            index: index + 1,
          })),
        },
      },
      instructorId: isCourseExist.instructorId,
    },
  });
  return result;
};

const updateAnswerStatus = async (
  payload: { answerId: string; isCorrect: boolean }, // Explicitly type the payload
  userId: string, // Use instructorId or adminId to verify permissions
  userRole: string,
) => {
  const authorizationCondition =
    userRole === 'SUPER_ADMIN'
      ? { id: payload.answerId } // Super Admin: Just check the answer ID
      : {
        // Instructor: Check answer ID AND that the user is the content instructor
        id: payload.answerId,
        question: {
          instructorId: userId,
        },
      };

  // 1. Find the answer and the associated question/content
  // const answerRecord = await prisma.questionAnswer.findFirst({
  //   where: authorizationCondition,
  //   // We need to check permissions based on the content/course owner
  //   select: {
  //     question: {
  //       // Assuming 'question' is the relation name to the CourseQuestions model
  //       select: {
  //         courseContent: {
  //           // Assuming 'courseContent' links to the CourseContents model
  //           select: {
  //             instructorId: true, // Get the original content creator/owner
  //           },
  //         },
  //       },
  //     },
  //   },
  // });

  // if (!answerRecord) {
  //   throw new AppError(httpStatus.NOT_FOUND, 'Answer not found');
  // }

  // 3. Update the answer status (isCorrect)
  const result = await prisma.questionAnswer.update({
    where: {
      id: payload.answerId,
      question: {
        instructorId: userId,
      },
    },
    data: {
      isCorrectAnswer: payload.isCorrect,
    },
    // Select the updated fields to return
    select: {
      id: true,
      providedAnswer: true,
      isCorrectAnswer: true, // This is the updated field
      userId: true,
      questionId: true,
    },
  });

  return result;
};

const updateContent = async (
  id: string,
  payload: Partial<Pick<CourseContents, 'description' | 'title' | 'status'>>,
  userId: string,
  role: UserRoleEnum,
) => {
  const result = await prisma.courseContents.update({
    where: {
      id,
      ...(role !== 'SUPERADMIN' && { isDeleted: false, instructorId: userId }),
    },
    data: payload,
  });
  return result;
};

const toggleDeleteContent = async (
  id: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const result = await toggleDelete(
    id,
    'course_contents',
    role !== 'SUPERADMIN' ? { instructorId: { $oid: userId } } : {},
  );
  return result;
};

const createQuiz = async (
  payload: Quiz,
  userId: string,
  role: UserRoleEnum,
) => {
  if (payload.type === 'MULTIPLE_CHOICE') {
    const quizOptions = payload.options;
    if (!quizOptions) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Quiz Option is Required')
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

  const isCourseContentExist = await prisma.courseContents.findUnique({
    where: {
      id: payload.courseContentId,
      ...checkSuperAdmin(role, userId),
    },
  });
  if (!isCourseContentExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Course Content not found');
  }

  // Get count for this specific course content
  const count = await prisma.quiz.count({
    where: {
      courseContentId: payload.courseContentId,
      isDeleted: false,
    },
  });

  // const result = await prisma.quiz.create({
  //   data: {
  //     ...payload,
  //     index: count + 1,
  //     instructorId: isCourseContentExist.instructorId,

  //   },
  // });
  // return result;
};

const updateQuiz = async (
  id: string,
  payload: Partial<Pick<Quiz, 'question' | 'options' | 'rightAnswer' | 'type'>>,
  userId: string,
  role: UserRoleEnum,
) => {
  if (payload.type === 'MULTIPLE_CHOICE') {
    const quizOptions = payload?.options;
    if (!quizOptions) throw new AppError(httpStatus.BAD_REQUEST, 'Quiz Option is required')
    const values = Object.values(quizOptions);
    const hasDuplicates = new Set(values).size !== values.length;

    if (hasDuplicates) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Quiz options must all be different.',
      );
    }
  }

  const result = await prisma.quiz.update({
    where: {
      id,
      ...(role !== 'SUPERADMIN' && { instructorId: userId, isDeleted: false }),
    },
    data: payload,
  });
  return result;
};

// 1. Get all content for a specific course (for owners/superadmins)
const getAllContentForSpecificCourse = async (
  courseId: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const contents = await prisma.courseContents.findMany({
    where: {
      courseId,
      ...(role !== 'SUPERADMIN' && { isDeleted: false, instructorId: userId }),
      ...(role !== 'USER' && {}),
    },
    orderBy: {
      index: 'asc',
    },
  });

  return contents;
};

// 1a. Get all content for a specific course (for normal users)
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

  const formattedData = contents.map(content => ({
    ...content,
    hasAnswered: (content.courseQuestions?.questionAnswers ?? []).length > 0,
    courseQuestions: {
      ...content.courseQuestions,
      // questionAnswers: undefined,
      answer: content.courseQuestions?.questionAnswers[0],
      questionAnswers: undefined,
    },
  }));

  return formattedData;
  return {
    ...contents,
    // questionAnswers: undefined,
    // isAnswered: contents.length > 0,
  };
};

// 2. Get single content (for owners/superadmins)
const getSingleContent = async (
  contentId: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const content = await prisma.courseContents.findUnique({
    where: {
      id: contentId,
      ...(role !== 'SUPERADMIN' && { isDeleted: false, instructorId: userId }),
    },
    include: {
      quizzes: {
        where: {
          ...(role !== 'SUPERADMIN' && { isDeleted: false }),
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

// 2a. Get single content (for normal users)
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

// 3. Get all quiz for a specific course content (for owners/superadmins)
const getAllQuizForSpecificCourseContent = async (
  courseContentId: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const isCourseContentExist = await prisma.courseContents.findUnique({
    where: {
      id: courseContentId,
      ...checkSuperAdmin(role, userId),
    },
  });

  if (!isCourseContentExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Course Content not found');
  }

  const quizzes = await prisma.quiz.findMany({
    where: {
      courseContentId,
      ...(role !== 'SUPERADMIN' && { isDeleted: false, instructorId: userId }),
    },
    orderBy: {
      index: 'asc',
    },
  });

  return quizzes;
};

// 3a. Get all quiz for a specific course content (for normal users)
const getAllQuizForSpecificCourseContentForUser = async (
  courseContentId: string,
  userId: string,
  role: UserRoleEnum
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

  const quizzes = await prisma.quiz.findMany({
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
            answer: true
          }
        }
      }
    })
  });

  return quizzes;
};

// 4. Get single quiz (for owners/superadmins)
const getSingleQuiz = async (
  quizId: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const quiz = await prisma.quiz.findUnique({
    where: {
      id: quizId,
      ...(role !== 'SUPERADMIN' && { isDeleted: false, instructorId: userId }),
    },
  });

  if (!quiz) {
    throw new AppError(httpStatus.NOT_FOUND, 'Quiz not found');
  }

  return quiz;
};

// 4a. Get single quiz (for normal users)
const getSingleQuizForUser = async (quizId: string, userId: string, role: UserRoleEnum) => {
  const quiz = await prisma.quiz.findUnique({
    where: {
      id: quizId,
      isDeleted: false,
    },
    omit: {
      ...(role === 'USER' && { rightAnswer: true })
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

// 5. Toggle delete quiz
const toggleDeleteQuiz = async (
  id: string,
  userId: string,
  role: UserRoleEnum,
) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: { courseContent: true },
  });

  if (!quiz) {
    throw new AppError(httpStatus.NOT_FOUND, 'Quiz not found');
  }

  if (role !== UserRoleEnum.SUPERADMIN && quiz.instructorId !== userId) {
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

    return await prisma.quiz.update({
      where: { id },
      data: {
        isDeleted: false,
        index: newIndex,
      },
    });
  } else {
    return await prisma.$transaction(async tx => {
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

      return await tx.quiz.findUnique({ where: { id } });
    });
  }
};

// 6. Change index for course content
const changeContentIndex = async (
  contentId: string,
  newIndex: number,
  userId: string,
  role: UserRoleEnum,
) => {
  // First, get the content to check if it exists and get its current index and courseId
  const content = await prisma.courseContents.findUnique({
    where: {
      id: contentId,
      isDeleted: false,
      ...(role !== 'SUPERADMIN' && { instructorId: userId }),
    },
  });

  if (!content) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
  }

  const currentIndex = content.index;
  const courseId = content.courseId;

  // Get the total count of contents for this course
  const totalCount = await prisma.courseContents.count({
    where: {
      courseId,
      isDeleted: false,
    },
  });

  // Validate new index
  if (newIndex < 1 || newIndex > totalCount) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Index must be between 1 and ${totalCount}`,
    );
  }

  // If the index is the same, no need to update
  if (currentIndex === newIndex) {
    return content;
  }

  await prisma.$transaction(async tx => {
    if (currentIndex < newIndex) {
      // Moving down: decrease index of items between current and new position
      await tx.courseContents.updateMany({
        where: {
          courseId,
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
      // Moving up: increase index of items between new and current position
      await tx.courseContents.updateMany({
        where: {
          courseId,
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

    // Update the target content's index
    await tx.courseContents.update({
      where: {
        id: contentId,
      },
      data: {
        index: newIndex,
      },
    });
  });

  return await prisma.courseContents.findUnique({
    where: { id: contentId },
  });
};

// 7. Change index for quiz
const changeQuizIndex = async (
  quizId: string,
  newIndex: number,
  userId: string,
  role: UserRoleEnum,
) => {
  // First, get the quiz to check if it exists and get its current index and courseContentId
  const quiz = await prisma.quiz.findUnique({
    where: {
      id: quizId,
      isDeleted: false,
      ...(role !== 'SUPERADMIN' && { instructorId: userId }),
    },
  });

  if (!quiz) {
    throw new AppError(httpStatus.NOT_FOUND, 'Quiz not found');
  }

  const currentIndex = quiz.index;
  const courseContentId = quiz.courseContentId;

  // Get the total count of quizzes for this course content
  const totalCount = await prisma.quiz.count({
    where: {
      courseContentId,
      isDeleted: false,
    },
  });

  // Validate new index
  if (newIndex < 1 || newIndex > totalCount) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Index must be between 1 and ${totalCount}`,
    );
  }

  // If the index is the same, no need to update
  if (currentIndex === newIndex) {
    return quiz;
  }

  await prisma.$transaction(async tx => {
    if (currentIndex < newIndex) {
      // Moving down: decrease index of items between current and new position
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
      // Moving up: increase index of items between new and current position
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

    // Update the target quiz's index
    await tx.quiz.update({
      where: {
        id: quizId,
      },
      data: {
        index: newIndex,
      },
    });
  });

  return await prisma.quiz.findUnique({
    where: { id: quizId },
  });
};

export const CoursecontentService = {
  createFileContent,
  updateFileContent,
  createQuizContent,
  updateContent,
  toggleDeleteContent,
  createQuiz,
  updateQuiz,
  // For owners/superadmins
  getAllContentForSpecificCourse,
  getSingleContent,
  getAllQuizForSpecificCourseContent,
  getSingleQuiz,
  // For normal users
  getAllContentForSpecificCourseForUser,
  getSingleContentForUser,
  getAllQuizForSpecificCourseContentForUser,
  getSingleQuizForUser,
  // Other methods
  toggleDeleteQuiz,
  changeContentIndex,
  changeQuizIndex,
  updateAnswerStatus,

};
