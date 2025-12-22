import { Forum, UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import { prisma } from '../../utils/prisma';
import AppError from '../../errors/AppError';
import { groupService } from '../Group/group.service';
import crypto from 'crypto';
import QueryBuilder from '../../builder/QueryBuilder';
import { checkForumAndGroupEnrolled } from '../../utils/checkForumAndGroupEnrolled';

const createCircleForum = async (payload: Pick<Forum, 'title' | 'description' | 'courseId' | 'groupId'>) => {
    const isCourseId = await prisma.course.findUnique({
        where: { id: payload.courseId as string, isDeleted: false },
        select: {
            id: true
        }
    });
    if (!isCourseId) {
        throw new AppError(httpStatus.NOT_FOUND, 'Course not found')
    }

    await groupService.isGroupExist(payload.groupId as string);
    return await prisma.forum.create({
        data: {
            ...payload,
            forumType: 'STUDY_CIRCLES'
        }
    })
};

const createLocationForum = async (payload: Pick<Forum, 'title' | 'description' | 'country' | 'groupId' | 'events'>) => {


    await groupService.isGroupExist(payload.groupId as string);

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
    payload: Partial<Pick<Forum, 'title' | 'description' | 'courseId' | 'groupId'>>
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

    if (payload.groupId) {
        await groupService.isGroupExist(payload.groupId);
    }

    return await prisma.forum.update({
        where: { id: forumId, forumType: 'STUDY_CIRCLES' },
        data: payload,
    });
};

const updateLocationForum = async (
    forumId: string,
    payload: Partial<Pick<Forum, 'title' | 'description' | 'country' | 'groupId' | 'events'>>
) => {
    const existingForum = await prisma.forum.findUnique({ where: { id: forumId } });
    if (!existingForum) {
        throw new AppError(httpStatus.NOT_FOUND, 'Forum not found');
    }

    if (payload.groupId) {
        await groupService.isGroupExist(payload.groupId);
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

    await checkForumAndGroupEnrolled(userId, id, role)


    const forum = await prisma.forum.findUnique({
        where: {
            id,
            isDeleted: false
        },
        select: {
            id: true,
            title: true,
            description: true,
            events: true,
            country: true,
            courseId: true,
            groupId: true,
            course: {
                select: {
                    id: true,
                    title: true
                }
            },
            forumType: true,
            group: {
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
        const UserAllGroup = await prisma.userGroup.findMany({
            where: {
                userId,
            },
            select: {
                id: true,
                groupId: true
            }
        });
        const groupIds = UserAllGroup.map(item => item.groupId);
        query.groupId = {
            in: groupIds
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
            group: {
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
    const { forum } = await checkForumAndGroupEnrolled(userId, id, role)

    query.groupId = forum.groupId
    query.user = { isDeleted: false }

    const userGroupQuery = new QueryBuilder<typeof prisma.userGroup>(prisma.userGroup, query);

    const result = await userGroupQuery
        .search(['user.fullName'])
        .filter()
        .sort()
        .customFields({
            user: {
                select: {
                    id: true,
                    fullName: true,
                    profile: true,
                    userGroups: {
                        select: {
                            group: {
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
