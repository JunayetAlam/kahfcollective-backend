import {
  Course,
  CourseContentTypeEnum,
  CourseStatus,
  UserRoleEnum,
} from '@prisma/client';
import httpStatus from 'http-status';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { prisma } from '../../utils/prisma';
import { toggleDelete } from '../../utils/toggleDelete';
import { updateData } from '../../redis/redis.utils';
import { get } from '../../redis/GetOrSet';

const createCourse = async (data: Course, userId: string) => {
  data.instructorId = userId;

  await prisma.group.findUniqueOrThrow({
    where: {
      id: data.groupId,
    },
  });

  return await prisma.course.create({
    data: {
      ...data,
      status: 'ACTIVE',
    },
  });
};

const getAllCourses = async ({
  query,
  role,
  userId,
}: {
  query: Record<string, unknown>;
  role?: UserRoleEnum;
  userId?: string;
}) => {
  if (role === UserRoleEnum.INSTRUCTOR) {
    query.instructorId = userId;
  }
  query.isDeleted = false;
  if (role === UserRoleEnum.USER) {
    query.status = 'ACTIVE';
    query.enrollCourses = {
      some: {
        userId,
      },
    };
  }

  const coursesQuery = new QueryBuilder<typeof prisma.course>(
    prisma.course,
    query,
  );

  const result = await coursesQuery
    .search(['title', 'description'])
    .filter()
    .sort()
    .customFields({
      id: true,
      title: true,
      description: true,
      status: true,
      language: true,
      createdAt: true,
      updatedAt: true,
      groupId: true,

      group: {
        select: {
          name: true,
        },
      },
      instructor: {
        select: {
          id: true,
          fullName: true,
        },
      },
      _count: {
        select: {
          courseContents: {
            where: {
              isDeleted: false,
              status: 'PUBLISHED',
            },
          },
          enrollCourses: {
            where: {
              user: {
                isDeleted: false,
              },
            },
          },
        },
      },
      ...(role === 'USER' && {
        completeCourses: {
          where: {
            userId,
          },
        },
      }),
    })
    .exclude()
    .paginate()
    .execute();

  return result;
};

const getCourseById = async ({
  id,
  role,
  userId,
}: {
  id: string;
  role?: UserRoleEnum;
  userId?: string;
}) => {
  const query: any = {
    id,
  };
  if (role === UserRoleEnum.INSTRUCTOR) {
    query.instructorId = userId;
  }

  if (role === UserRoleEnum.USER) {
    query.isDeleted = false;
    query.status = 'ACTIVE';
    const userAllGroup = await prisma.userGroup.findMany({
      where: {
        userId,
      },
      select: {
        groupId: true,
      },
    });
    const userAllGroupId = userAllGroup.map(item => item.groupId);
    query.groupId = {
      in: userAllGroupId,
    };
  }

  const course = await prisma.course.findUnique({
    where: query,
    include: {
      instructor: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
      courseContents: {
        where: { isDeleted: false },
        select: {
          id: true,
          type: true,
          status: true,
          index: true,
          createdAt: true,
          title: true,
          description: true,
          courseQuestions: true,
        },

        orderBy: { index: 'asc' },
      },
      ...(role === 'USER' && {
        completeCourses: {
          where: {
            userId,
          },
        },
      }),
    },
  });

  if (!course) {
    throw new AppError(httpStatus.NOT_FOUND, 'Course not found');
  }

  const lessonsCount = course.courseContents.filter(
    content => content.type === CourseContentTypeEnum.VIDEO,
  ).length;

  const testsCount = course.courseContents.filter(
    content => content.type === CourseContentTypeEnum.QUIZ,
  ).length;

  return {
    ...course,
    lessons: lessonsCount,
    tests: testsCount,
  };
};

const updateCourse = async (
  id: string,
  data: Partial<Course>,
  userId?: string,
  role?: UserRoleEnum,
) => {
  if (data.groupId) {
    await prisma.group.findUniqueOrThrow({
      where: {
        id: data.groupId,
      },
    });
  }
  return await prisma.course.update({
    where: {
      id,
      ...(role !== 'SUPERADMIN' && { instructorId: userId }),
    },
    data,
    include: {
      instructor: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });
};

const toggleDeleteCourse = async (
  id: string,
  role: UserRoleEnum,
  userId: string,
) => {
  const result = await toggleDelete(id, 'courses');
  return result;
};

const toggleCourseStatus = async (
  id: string,
  status: CourseStatus,
  role: UserRoleEnum,
  userId: string,
) => {
  return await prisma.course.update({
    where: {
      id,
      ...(role !== 'SUPERADMIN' && { instructorId: userId }),
    },
    data: { status },
    include: {
      instructor: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });
};

const isCourseExist = async (id: string) => {
  const course = await prisma.course.findFirst({
    where: {
      id,
      isDeleted: false,
      status: 'ACTIVE',
    },
    select: { id: true },
  });

  if (!course) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Course not found or not published',
    );
  }

  return course;
};

const toggleCompleteCourse = async (userId: string, courseId: string) => {
  const IsCompletedCourse = await prisma.completeCourse.findUnique({
    where: {
      courseId_userId: {
        userId,
        courseId,
      },
    },
  });
  if (IsCompletedCourse) {
    return await prisma.completeCourse.delete({
      where: {
        id: IsCompletedCourse.id,
      },
    });
  }
  return await prisma.completeCourse.create({
    data: {
      courseId,
      userId,
    },
  });
};

const toggleEnrollCourse = async (userId: string, courseId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
      isDeleted: false,
    },
    select: {
      id: true,
      userGroups: {
        select: {
          groupId: true,
        },
      },
    },
  });
  const allGroupId = user.userGroups.map(item => item.groupId);
  const course = await prisma.course.findUniqueOrThrow({
    where: {
      id: courseId,
    },
    select: {
      groupId: true,
      group: {
        select: {
          name: true,
        },
      },
    },
  });
  if (!allGroupId.includes(course.groupId)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User is not under the ${course.group.name} Group`,
    );
  }

  const isAlreadyEnrolled = await prisma.enrollCourse.findUnique({
    where: {
      userId_courseId: {
        courseId,
        userId,
      },
    },
  });
  if (isAlreadyEnrolled) {
    const result = await prisma.enrollCourse.delete({
      where: {
        userId_courseId: {
          courseId,
          userId,
        },
      },
    });
    const userData = await get({ key: `user-${userId}-details` });
    if (userData) {
      await updateData(
        `user-${userId}-details`,
        {
          ...userData,
          enrollCourses: [
            ...userData.enrollCourses.filter(
              (item: any) => item.courseId !== courseId,
            ),
          ],
        },
        24 * 60 * 60,
      );
    }
    return result;
  }

  const result = await prisma.enrollCourse.create({
    data: {
      userId,
      courseId,
    },
  });

  const userData = await get({ key: `user-${userId}-details` });
  if (userData) {
    await updateData(
      `user-${userId}-details`,
      {
        ...userData,
        enrollCourses: [...userData.enrollCourses, { courseId }],
      },
      24 * 60 * 60,
    );
  }
  return result;
};

const enrolledUserOnCourse = async (courseId: string) => {
  const result = await prisma.enrollCourse.findMany({
    where: {
      courseId,
      user: {
        isDeleted: false,
      },
    },
    select: {
      user: {
        select: {
          fullName: true,
          email: true,
          id: true,
        },
      },
    },
  });
  const returnedResult = result.map(item => item.user);
  return returnedResult;
};

export const CourseService = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  toggleDeleteCourse,
  toggleCourseStatus,
  isCourseExist,
  toggleCompleteCourse,
  toggleEnrollCourse,
  enrolledUserOnCourse,
};
