import httpStatus from 'http-status';
import { Course, CourseContentTypeEnum, CourseStatus, UserRoleEnum } from "@prisma/client";
import AppError from "../../errors/AppError";
import { prisma } from '../../utils/prisma';
import QueryBuilder from '../../builder/QueryBuilder';
import { tierService } from '../Tier/tier.service';
import { toggleDelete } from '../../utils/toggleDelete';

const createCourse = async (data: Course, userId: string) => {
    data.instructorId = userId;

    return await prisma.course.create({
        data: {
            ...data,
            status: 'ACTIVE'
        }
    });
};

const getAllCourses = async ({ query, role, userId }: { query: Record<string, unknown>, role?: UserRoleEnum, userId?: string }) => {
    if (role === UserRoleEnum.USER) {
        query.isDeleted = false;
        query.status = 'ACTIVE';
    }

    const coursesQuery = new QueryBuilder<typeof prisma.course>(prisma.course, query);

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
            instructor: {
                select: {
                    id: true,
                    fullName: true
                }
            },
            _count: {
                select: {
                    courseContents: {
                        where: {
                            type: 'VIDEO'
                        }
                    }
                }
            },
            ...(role === 'USER' && {
                completeCourses: {
                    where: {
                        userId
                    }
                }
            })
        })
        .exclude()
        .paginate()
        .execute()

    return result
};

const getCourseById = async ({ id, role, userId }: { id: string, role?: UserRoleEnum, userId?: string }) => {
    const whereClause: any = {
        id,
        ...(role !== UserRoleEnum.SUPERADMIN && {
            isDeleted: false,
            status: 'ACTIVE'
        })
    };

    const course = await prisma.course.findUnique({
        where: whereClause,
        include: {
            instructor: {
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    profile: true
                }
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
                },
                orderBy: { index: 'asc' }
            },
            ...(role === 'USER' && {
                completeCourses: {
                    where: {
                        userId
                    }
                }
            })

        }
    });

    if (!course) {
        throw new AppError(httpStatus.NOT_FOUND, 'Course not found');
    }

    const lessonsCount = course.courseContents.filter(
        content => content.type === CourseContentTypeEnum.VIDEO
    ).length;

    const testsCount = course.courseContents.filter(
        content => content.type === CourseContentTypeEnum.QUIZ
    ).length;

    return {
        ...course,
        lessons: lessonsCount,
        tests: testsCount
    };
};

const updateCourse = async (id: string, data: Partial<Course>, userId?: string, role?: UserRoleEnum) => {

    return await prisma.course.update({
        where: {
            id,
            ...(role !== 'SUPERADMIN' && { instructorId: userId })
        },
        data,
        include: {

            instructor: {
                select: {
                    id: true,
                    fullName: true
                }
            }
        }
    });
};

const toggleDeleteCourse = async (id: string, role: UserRoleEnum, userId: string) => {

    const result = await toggleDelete(id, 'courses', role !== 'SUPERADMIN' ? { instructorId: userId } : {})
    return result
};

const toggleCourseStatus = async (id: string, status: CourseStatus, role: UserRoleEnum, userId: string) => {
    return await prisma.course.update({
        where: {
            id,
            ...(role !== 'SUPERADMIN' && { instructorId: userId })
        },
        data: { status },
        include: {

            instructor: {
                select: {
                    id: true,
                    fullName: true
                }
            }
        }
    });
};

const isCourseExist = async (id: string) => {
    const course = await prisma.course.findFirst({
        where: {
            id,
            isDeleted: false,
            status: 'ACTIVE'
        },
        select: { id: true }
    });

    if (!course) {
        throw new AppError(httpStatus.NOT_FOUND, 'Course not found or not published');
    }

    return course;
};

const toggleCompleteCourse = async (userId: string, courseId: string) => {
    const IsCompletedCourse = await prisma.completeCourse.findUnique({
        where: {
            courseId_userId: {
                userId,
                courseId
            }
        }
    });
    if (IsCompletedCourse) {
        return await prisma.completeCourse.delete({
            where: {
                id: IsCompletedCourse.id
            }
        })
    }
    return await prisma.completeCourse.create({
        data: {
            courseId,
            userId
        }
    })
}

export const CourseService = {
    createCourse,
    getAllCourses,
    getCourseById,
    updateCourse,
    toggleDeleteCourse,
    toggleCourseStatus,
    isCourseExist,
    toggleCompleteCourse
};