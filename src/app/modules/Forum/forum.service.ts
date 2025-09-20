import { Forum, UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import { prisma } from '../../utils/prisma';
import AppError from '../../errors/AppError';
import { tierService } from '../Tier/tier.service';
import crypto from 'crypto';
import QueryBuilder from '../../builder/QueryBuilder';
import { checkSpecificPaidTier } from '../../utils/isBuyTheSpecificTier';

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

    if (role === 'USER') {
        const joinForum = await prisma.joinForum.findUnique({
            where: {
                userId_forumId: {
                    forumId: id,
                    userId,
                },

            }
        });

        if (!joinForum || joinForum.isLeave === true) {
            throw new AppError(httpStatus.FORBIDDEN, 'Please Join on Discussion First')
        };
    }


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
            joinForums: {
                select: {
                    id: true,
                    userId: true,
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            profile: true,
                            gender: true
                        }
                    }
                }
            },
            createdAt: true
        }
    });

    if (!forum) throw new AppError(httpStatus.NOT_FOUND, 'Forum not found');

    return forum;
};


const getAllForums = async (query: any, role: UserRoleEnum) => {
    if (role === 'USER') {
        query.status = 'PUBLISHED'
    }
    query.isDeleted = false
    const forumQuery = new QueryBuilder(prisma.forum, query);

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


const joinForum = async (userId: string, forumId: string) => {
    const isForumExist = await prisma.forum.findUnique({
        where: {
            id: forumId,
            isDeleted: false,
        },
        select: {
            tier: {
                select: {
                    id: true,
                    name: true,
                }
            },
        }
    });
    if (!isForumExist) {
        throw new AppError(httpStatus.NOT_FOUND, 'Forum not found')
    };
    if (!isForumExist.tier) {
        throw new AppError(httpStatus.NOT_FOUND, 'Tier not found')
    }
    await checkSpecificPaidTier(isForumExist.tier.id, isForumExist.tier.name, userId);

    const isAlreadyJoined = await prisma.joinForum.findUnique({
        where: {
            userId_forumId: {
                userId,
                forumId
            }
        },
        select: {
            isLeave: true,
            id: true,
        }
    });
    if (isAlreadyJoined && isAlreadyJoined.isLeave === false) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Already joined')
    };
    if (isAlreadyJoined && isAlreadyJoined.isLeave === true) {
        return await prisma.joinForum.update({
            where: {
                id: isAlreadyJoined.id
            },
            data: { isLeave: false }
        })
    } else {
        return await prisma.joinForum.create({
            data: {
                forumId,
                userId
            }
        })
    }
};

const getAllConnectedUserToForum = async (id: string, userId: string, role: UserRoleEnum, query: Record<string, unknown>) => {
    if (role === 'USER') {
        const joinForum = await prisma.joinForum.findUnique({
            where: {
                userId_forumId: {
                    forumId: id,
                    userId
                }
            }
        });

        if (!joinForum || joinForum.isLeave === true) {
            throw new AppError(httpStatus.FORBIDDEN, 'Please Join on Discussion First')
        };
    }
    query.forumId = id
    query.isDeleted = false;
    query.isLeave = false

    const joinForumQuery = new QueryBuilder<typeof prisma.joinForum>(prisma.joinForum, query);
    const result = await joinForumQuery
        .search(['user.fullName'])
        .filter()
        .sort()
        .customFields({
            user: {
                select: {
                    id: true,
                    fullName: true,
                    profile: true,
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
    joinForum,
    getAllConnectedUserToForum,
};
