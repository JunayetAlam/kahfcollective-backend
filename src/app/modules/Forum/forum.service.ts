import { Forum, UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import { prisma } from '../../utils/prisma';
import AppError from '../../errors/AppError';
import { groupService } from '../Group/group.service';
import crypto from 'crypto';
import QueryBuilder from '../../builder/QueryBuilder';
import { checkForumAndGroupEnrolled } from '../../utils/checkForumAndGroupEnrolled';

type ForumWithGroups = {
    forumGroups?: { group: { id: string; name: string } }[];
    [key: string]: unknown;
};

const mapForumGroupFields = <T extends ForumWithGroups>(forum: T) => {
    const firstGroup = forum.forumGroups?.[0]?.group ?? null;
    return {
        ...forum,
        groupId: firstGroup?.id ?? null,
        group: firstGroup,
    };
};

type CircleForumPayload = Pick<Forum, 'title' | 'description' | 'courseId'> & { groupId: string };
type LocationForumPayload = Pick<Forum, 'title' | 'description' | 'country' | 'events'> & { groupId: string };

const createCircleForum = async (payload: CircleForumPayload) => {
    const { groupId, ...forumData } = payload;

    const isCourseId = await prisma.course.findUnique({
        where: { id: forumData.courseId as string, isDeleted: false },
        select: {
            id: true
        }
    });
    if (!isCourseId) {
        throw new AppError(httpStatus.NOT_FOUND, 'Course not found')
    }

    await groupService.isGroupExist(groupId);
    return await prisma.forum.create({
        data: {
            ...forumData,
            forumType: 'STUDY_CIRCLES',
            forumGroups: {
                create: { groupId },
            },
        }
    })
};

const createLocationForum = async (payload: LocationForumPayload) => {
    const { groupId, ...forumData } = payload;

    await groupService.isGroupExist(groupId);

    const events = forumData.events.map(item => ({
        ...item,
        id: crypto.randomBytes(2).toString('hex')
    })) || []

    return await prisma.forum.create({
        data: {
            ...forumData,
            events,
            forumType: 'LOCATION_BASED',
            forumGroups: {
                create: { groupId },
            },
        }
    })
};

const updateCircleForum = async (
    forumId: string,
    payload: Partial<Pick<Forum, 'title' | 'description' | 'courseId'> & { groupId: string }>
) => {
    const existingForum = await prisma.forum.findUnique({ where: { id: forumId } });
    if (!existingForum) {
        throw new AppError(httpStatus.NOT_FOUND, 'Forum not found');
    }

    const { groupId, ...forumData } = payload;

    if (forumData.courseId) {
        const isCourseId = await prisma.course.findUnique({
            where: { id: forumData.courseId, isDeleted: false },
            select: { id: true },
        });
        if (!isCourseId) throw new AppError(httpStatus.NOT_FOUND, 'Course not found');
    }

    if (groupId) {
        await groupService.isGroupExist(groupId);
        await prisma.forumGroup.deleteMany({ where: { forumId } });
        await prisma.forumGroup.create({ data: { forumId, groupId } });
    }

    if (Object.keys(forumData).length === 0) {
        return existingForum;
    }

    return await prisma.forum.update({
        where: { id: forumId, forumType: 'STUDY_CIRCLES' },
        data: forumData,
    });
};

const updateLocationForum = async (
    forumId: string,
    payload: Partial<Pick<Forum, 'title' | 'description' | 'country' | 'events'> & { groupId: string }>
) => {
    const existingForum = await prisma.forum.findUnique({ where: { id: forumId } });
    if (!existingForum) {
        throw new AppError(httpStatus.NOT_FOUND, 'Forum not found');
    }

    const { groupId, ...forumData } = payload;

    if (groupId) {
        await groupService.isGroupExist(groupId);
        await prisma.forumGroup.deleteMany({ where: { forumId } });
        await prisma.forumGroup.create({ data: { forumId, groupId } });
    }

    if (forumData.events) {
        forumData.events = forumData.events.map(event => ({
            ...event,
            id: event.id || crypto.randomBytes(2).toString('hex'),
        }));
    }

    if (Object.keys(forumData).length === 0) {
        return existingForum;
    }

    return await prisma.forum.update({
        where: { id: forumId, forumType: 'LOCATION_BASED' },
        data: forumData,
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
            course: {
                select: {
                    id: true,
                    title: true,
                    instructor: {
                        select: {
                            id: true,
                            fullName: true,
                            profile: true
                        }
                    }
                }
            },
            forumType: true,
            forumGroups: {
                select: {
                    group: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            },
            createdAt: true
        }
    });

    if (!forum) throw new AppError(httpStatus.NOT_FOUND, 'Forum not found');

    return mapForumGroupFields(forum);
};


const getAllForums = async (query: any, role: UserRoleEnum, userId: string) => {

    query.isDeleted = false
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
        query.OR = [
            { forAll: true },
            { forAllGroups: true },
            { forumGroups: { some: { groupId: { in: groupIds } } } },
        ];
    };
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
            forumGroups: {
                select: {
                    group: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
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

    return {
        ...result,
        data: result.data.map(mapForumGroupFields),
    };
};


const deleteForum = async (forumId: string) => {
    await prisma.forum.update({ where: { id: forumId }, data: { isDeleted: true } });
    return { message: 'Forum deleted successfully' };
};

const getAllConnectedUserToForum = async (id: string, userId: string, role: UserRoleEnum, query: Record<string, unknown>) => {
    const { forum } = await checkForumAndGroupEnrolled(userId, id, role)

    query.groupId = { in: forum.forumGroups.map(fg => fg.groupId) }
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
