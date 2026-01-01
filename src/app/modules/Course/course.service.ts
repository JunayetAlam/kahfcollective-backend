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
import { deleteFromStorage, uploadToStorage } from '../../utils/uploadToStorage';
import { singleCourseGetOrQuery } from './course.utils';

const createCourse = async (data: Course, thumbnail?: Express.Multer.File) => {
  await prisma.user.findUniqueOrThrow({
    where: {
      id: data.instructorId,
      isDeleted: false,
      isUserVerified: true,
    },
  });

  if (thumbnail) {
    const link = await uploadToStorage(thumbnail);
    data.thumbnail = link.Location;
  }
  return await prisma.course.create({
    data: {
      ...data,
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

  query.isDeleted = false;


  if (role === UserRoleEnum.USER && userId) {

    query.status = 'ACTIVE';
    if (query.forAll === 'true') {
      query.forAll = true;
    } else if (query.enrollCourses === 'true' && userId) {
      query.groupCourses = {
        some: {
          group: {
            userGroups: {
              some: {
                userId,
              }
            },
            isDeleted: false,
          },
        }
      }
      delete query.enrollCourses;
    } else {
      query.OR = singleCourseGetOrQuery(userId)
      delete query.forAll;
      delete query.enrollCourses;
    }
  } else if (!role || !userId) {
    query.forAll = true;
    delete query.enrollCourses;
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
      createdAt: true,
      updatedAt: true,
      thumbnail: true,

      groupCourses: {
        where: {
          group: {
            isDeleted: false,
          },
        },
        select: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
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


  if (role === UserRoleEnum.USER && userId) {
    query.isDeleted = false;
    query.status = 'ACTIVE';
    query.OR = singleCourseGetOrQuery(userId)
  } else if (!role || !userId) {
    query.isDeleted = false;
    query.status = 'ACTIVE';
    query.forAll = true;
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

const updateCourse = async ({
  id,
  data,
  thumbnail,
}: {
  id: string;
  data: Partial<Course>;
  thumbnail?: Express.Multer.File;
  userId?: string;
  role?: UserRoleEnum;
}) => {

  const course = await prisma.course.findFirstOrThrow({
    where: {
      id,
    },
    select: {
      thumbnail: true,
    },
  });

  if (data.instructorId) {
    const instructor = await prisma.user.findUnique({
      where: {
        id: data.instructorId,
        isDeleted: false,
        isUserVerified: true,
      },
    });
    if (!instructor) {
      throw new AppError(httpStatus.NOT_FOUND, 'Instructor not found');
    }
  }
  let location = ''
  if (thumbnail) {
    const link = await uploadToStorage(thumbnail);
    if (link.Location) {
      data.thumbnail = link.Location;
      location = link.Location;
    }
  }
  try {
    const result = await prisma.course.update({
      where: {
        id,
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
    if (course.thumbnail && location) {
      deleteFromStorage(course.thumbnail)
    }
    return result
  } catch (error) {
    if (location) {
      deleteFromStorage(location)
    }
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Something went wrong')
  }
};

const toggleDeleteCourse = async (
  id: string,
) => {
  const result = await toggleDelete(id, 'courses');
  return result;
};

const toggleCourseStatus = async (
  id: string,
  status: CourseStatus,
) => {
  return await prisma.course.update({
    where: {
      id,
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
      groupCourses: {
        where: {
          group: {
            isDeleted: false,
          },
        },
        select: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
  const groups = course.groupCourses.map(item => item.group.id);
  if (!allGroupId.find(item => groups.includes(item))) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User is not under the Course Group`,
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

const toggleAssignCourseToGroup = async (courseId: string, groupId: string) => {
  const result = await prisma.groupCourse.findUnique({
    where: {
      courseId_groupId: {
        courseId,
        groupId,
      },
    },
  });

  if (result) {
    await prisma.groupCourse.delete({
      where: {
        courseId_groupId: {
          courseId,
          groupId,
        },
      },
    });
    return result;
  }
  return await prisma.groupCourse.create({
    data: {
      courseId,
      groupId,
    },
  });
};



const toggleAllowToAll = async (courseId: string) => {
  const course = await prisma.course.findUniqueOrThrow({
    where: {
      id: courseId,
    },
    select: {
      forAll: true,
    },
  });

  const result = await prisma.course.update({
    where: {
      id: courseId,
    },
    data: {
      forAll: !course.forAll,
    },
  });
  return result;
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
  toggleAssignCourseToGroup,
  toggleAllowToAll
};
