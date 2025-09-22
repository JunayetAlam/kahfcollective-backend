import { Forum, UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import { prisma } from '../../utils/prisma';
import AppError from '../../errors/AppError';
import { tierService } from '../Tier/tier.service';
import crypto from 'crypto';
import QueryBuilder from '../../builder/QueryBuilder';
import { checkForumAndTierEnrolled } from '../../utils/checkForumAndTierEnrolled';

const createCircleForum = async (payload: Pick<Forum, 'title' | 'description' | 'courseId' | 'tierId'>) => {
    const isCourseId = await prisma.course.findUnique({
        where: { id: payload.courseId as string, isDeleted: false },
        select: {
            id: true
        }
    });
    if (!isCourseId) {
        throw new AppError(httpStatus.NOT_FOUND, 'Course not found')
    }

    await tierService.isTierExist(payload.tierId as string);
    return await prisma.forum.create({
        data: {
            ...payload,
            forumType: 'STUDY_CIRCLES'
        }
    })
};

const createLocationForum = async (payload: Pick<Forum, 'title' | 'description' | 'country' | 'tierId' | 'events'>) => {


    await tierService.isTierExist(payload.tierId as string);

    const events = payload.events.map(item => ({
        ...item,
        id: crypto.randomBytes(2).toString('hex')
    })) || []
    payload.events = events
    return await prisma.forum.create({
        data: {
            ...payload,
            forumType: 'LOCATION_BASED'
        }
    })
};

const updateCircleForum = async (
    forumId: string,
    payload: Partial<Pick<Forum, 'title' | 'description' | 'courseId' | 'tierId'>>
) => {
    const existingForum = await prisma.forum.findUnique({ where: { id: forumId } });
    if (!existingForum) {
        throw new AppError(httpStatus.NOT_FOUND, 'Forum not found');
    }

    if (payload.courseId) {
        const isCourseId = await prisma.course.findUnique({
            where: { id: payload.courseId, isDeleted: false },
            select: { id: true },
        });
        if (!isCourseId) throw new AppError(httpStatus.NOT_FOUND, 'Course not found');
    }

    if (payload.tierId) {
        await tierService.isTierExist(payload.tierId);
    }

    return await prisma.forum.update({
        where: { id: forumId, forumType: 'STUDY_CIRCLES' },
        data: payload,
    });
};

const updateLocationForum = async (
    forumId: string,
    payload: Partial<Pick<Forum, 'title' | 'description' | 'country' | 'tierId' | 'events'>>
) => {
    const existingForum = await prisma.forum.findUnique({ where: { id: forumId } });
    if (!existingForum) {
        throw new AppError(httpStatus.NOT_FOUND, 'Forum not found');
    }

    if (payload.tierId) {
        await tierService.isTierExist(payload.tierId);
    }

    if (payload.events) {
        payload.events = payload.events.map(event => ({
            ...event,
            id: event.id || crypto.randomBytes(2).toString('hex'),
        }));
    }

    return await prisma.forum.update({
        where: { id: forumId, forumType: 'LOCATION_BASED' },
        data: payload,
    });
};

const getSingleForum = async (id: string, userId: string, role: UserRoleEnum) => {

    await checkForumAndTierEnrolled(userId, id, role)


    const forum = await prisma.forum.findUnique({
        where: {
            id,
            ...(role === 'USER' && { isDeleted: false }),
        },
        select: {
            id: true,
            title: true,
            description: true,
            events: true,
            country: true,
            courseId: true,
            tierId: true,
            course: {
                select: {
                    id: true,
                    title: true
                }
            },
            forumType: true,
            tier: {
                select: {
                    id: true,
                    name: true
                }
            },
            createdAt: true
        }
    });

    if (!forum) throw new AppError(httpStatus.NOT_FOUND, 'Forum not found');

    return forum;
};


const getAllForums = async (query: any, role: UserRoleEnum, userId: string) => {

    query.isDeleted = false
    const forumQuery = new QueryBuilder(prisma.forum, query);
    if (role === 'USER') {
        const UserAllTier = await prisma.userTier.findMany({
            where: {
                userId,
            },
            select: {
                id: true,
                tierId: true
            }
        });
        const tierIds = UserAllTier.map(item => item.tierId);
        query.tierId = {
            in: tierIds
        }
    };
    const result = await forumQuery
        .search(['title', 'description'])
        .filter()
        .sort()
        .exclude()
        .paginate()
        .customFields({
            id: true,
            title: true,
            description: true,
            events: true,
            country: true,
            course: {
                select: {
                    id: true,
                    title: true,
                    instructor: {
                        select: {
                            fullName: true,
                            id: true,
                            profile: true
                        }
                    }
                }
            },
            forumType: true,
            tier: {
                select: {
                    id: true,
                    name: true
                }
            },
            _count: {
                select: {
                    posts: {
                        where: {
                            isDeleted: false,
                        }
                    }
                }
            },
            createdAt: true
        })
        .execute();
    return result;
};


const deleteForum = async (forumId: string) => {
    await prisma.forum.update({ where: { id: forumId }, data: { isDeleted: true } });
    return { message: 'Forum deleted successfully' };
};

const getAllConnectedUserToForum = async (id: string, userId: string, role: UserRoleEnum, query: Record<string, unknown>) => {
    const { forum } = await checkForumAndTierEnrolled(userId, id, role)

    query.tierId = forum.tierId



    const userTierQuery = new QueryBuilder<typeof prisma.userTier>(prisma.userTier, query);
    const result = await userTierQuery
        .search(['user.fullName'])
        .filter()
        .sort()
        .customFields({
            user: {
                select: {
                    id: true,
                    fullName: true,
                    profile: true,
                    userTiers: {
                        select: {
                            tier: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                },
            },
        })
        .exclude()
        .paginate()
        .execute()
    return result

}



export const ForumService = {
    createCircleForum,
    createLocationForum,
    updateCircleForum,
    updateLocationForum,
    getSingleForum,
    getAllForums,
    deleteForum,
    getAllConnectedUserToForum,
};
