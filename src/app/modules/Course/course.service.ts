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
import { removeDataByPattern, updateData } from '../../redis/redis.utils';
import { get } from '../../redis/GetOrSet';
import { deleteFromStorage, uploadToStorage } from '../../utils/uploadToStorage';
import { AndMethodQuery, singleCourseGetOrQuery } from './course.utils';
import { UserServices } from '../User/user.service';
import { buildCourseTree, courseTreeInclude } from './course.tree';

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
      query.AND = AndMethodQuery(userId),
        delete query.enrollCourses;
    } else {
      query.OR = singleCourseGetOrQuery(userId,)
      delete query.forAll;
      delete query.enrollCourses;
    }
  } else if (!role || !userId) {
    query.forAll = true;
    delete query.enrollCourses;
  } else {
    delete query.enrollCourses;
    if (query.forAll === 'true') {
      query.forAll = true
    } else {
      delete query.forAll
    }
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
              ...(!query.forAll && {
                _count: {
                  select: {
                    userGroups: {
                      where: {
                        user: {
                          isDeleted: false,
                        }
                      }
                    }
                  }
                }
              })
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
          enrollCourses: true,
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
      ...courseTreeInclude,
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

  const items = buildCourseTree(course);

  return {
    ...course,
    items,
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

const getCourseGroupIds = async (courseId: string) => {
  const course = await prisma.course.findUniqueOrThrow({
    where: { id: courseId },
    select: {
      groupCourses: {
        where: { group: { isDeleted: false } },
        select: { group: { select: { id: true } } },
      },
    },
  });
  return course.groupCourses.map(item => item.group.id);
};

const assertUserInCourseGroup = async (userId: string, courseId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
      role: UserRoleEnum.USER,
    },
    select: {
      id: true,
      userGroups: { select: { groupId: true } },
    },
  });

  if (!user) {
    return { ok: false as const, reason: 'User not found' };
  }

  const courseGroupIds = await getCourseGroupIds(courseId);
  const inGroup = user.userGroups.some(ug =>
    courseGroupIds.includes(ug.groupId),
  );
  if (!inGroup) {
    return {
      ok: false as const,
      reason: 'User is not assigned to a class for this course',
    };
  }

  return { ok: true as const, user };
};

const syncUserEnrollCache = async (
  userId: string,
  courseId: string,
  enrolled: boolean,
) => {
  const userData = await get({ key: `user-${userId}-details` });
  if (!userData) return;

  const current = Array.isArray(userData.enrollCourses)
    ? userData.enrollCourses
    : [];

  await updateData(
    `user-${userId}-details`,
    {
      ...userData,
      enrollCourses: enrolled
        ? [...current.filter((item: any) => item.courseId !== courseId), { courseId }]
        : current.filter((item: any) => item.courseId !== courseId),
    },
    24 * 60 * 60,
  );
};

const toggleEnrollCourse = async (userId: string, courseId: string) => {
  const check = await assertUserInCourseGroup(userId, courseId);
  if (!check.ok) {
    throw new AppError(httpStatus.BAD_REQUEST, check.reason);
  }

  const existing = await prisma.enrollCourse.findUnique({
    where: {
      userId_courseId: { courseId, userId },
    },
  });

  if (existing) {
    const result = await prisma.enrollCourse.delete({
      where: { userId_courseId: { courseId, userId } },
    });
    await syncUserEnrollCache(userId, courseId, false);
    removeDataByPattern(`users-enrolled-*`);
    removeDataByPattern(`users-multiple-group-*`);
    removeDataByPattern(`users-*`);
    return result;
  }

  const result = await prisma.enrollCourse.create({
    data: { userId, courseId },
  });
  await syncUserEnrollCache(userId, courseId, true);
  removeDataByPattern(`users-*`);
  removeDataByPattern(`users-multiple-group-*`);
  removeDataByPattern(`users-enrolled-*`);
  return result;
};

const bulkEnrollCourse = async ({
  courseId,
  assign = [],
  unassign = [],
}: {
  courseId: string;
  assign?: string[];
  unassign?: string[];
}) => {
  await prisma.course.findUniqueOrThrow({
    where: { id: courseId, isDeleted: false },
    select: { id: true },
  });

  const assignIds = [...new Set(assign.filter(Boolean))];
  const unassignIds = [...new Set(unassign.filter(Boolean))];

  let assigned = 0;
  let unassigned = 0;
  const errorDetails: { userId: string; reason: string }[] = [];

  for (const userId of assignIds) {
    const check = await assertUserInCourseGroup(userId, courseId);
    if (!check.ok) {
      errorDetails.push({ userId, reason: check.reason });
      continue;
    }

    const existing = await prisma.enrollCourse.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing) {
      continue;
    }

    await prisma.enrollCourse.create({ data: { userId, courseId } });
    await syncUserEnrollCache(userId, courseId, true);
    assigned += 1;
  }

  for (const userId of unassignIds) {
    const check = await assertUserInCourseGroup(userId, courseId);
    if (!check.ok) {
      errorDetails.push({ userId, reason: check.reason });
      continue;
    }

    const existing = await prisma.enrollCourse.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!existing) {
      continue;
    }

    await prisma.enrollCourse.delete({
      where: { userId_courseId: { userId, courseId } },
    });
    await syncUserEnrollCache(userId, courseId, false);
    unassigned += 1;
  }

  removeDataByPattern(`users-*`);
  removeDataByPattern(`users-multiple-group-*`);
  removeDataByPattern(`users-enrolled-*`);

  return {
    assigned,
    unassigned,
    errors: errorDetails.length,
    errorDetails,
  };
};

const enrolledUserOnCourse = async (courseId: string, query: Record<string, any>) => {
  query.AND = [
    {
      enrollCourses: {
        some: {
          courseId,
        },
      },
    },
    {
      userGroups: {
        some: {
          group: {
            isDeleted: false,
            groupCourses: {
              some: {
                courseId,
                course: {
                  isDeleted: false,
                },
              },
            },
          },
        },
      },
    },
  ];
  const result = UserServices.getAllUsersFromDB(query, 'users-enrolled');
  return result;
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
  bulkEnrollCourse,
  enrolledUserOnCourse,
  toggleAssignCourseToGroup,
  toggleAllowToAll,
};
