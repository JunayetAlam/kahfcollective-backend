import httpStatus from 'http-status';
import { UserRoleEnum } from "@prisma/client";
import AppError from "../errors/AppError";
import { prisma } from './prisma';

const needsValidation = (role: UserRoleEnum) => {
    return role === 'USER';
};

export const checkForumAndGroupEnrolled = async (userId: string, forumId: string, role: UserRoleEnum) => {
    const isForumExist = await prisma.forum.findUnique({
        where: {
            id: forumId,
            isDeleted: false
        },
        select: {
            forAll: true,
            forAllGroups: true,
            forumGroups: {
                select: {
                    groupId: true
                }
            }
        }
    })
    if (!isForumExist) {
        throw new AppError(httpStatus.NOT_FOUND, 'Forum Not found');
    }

    if (!needsValidation(role)) {
        return { forum: isForumExist };
    }

    if (isForumExist.forAll || isForumExist.forAllGroups) {
        return { forum: isForumExist };
    }

    const groupIds = isForumExist.forumGroups.map(fg => fg.groupId);
    if (groupIds.length === 0) {
        throw new AppError(httpStatus.FORBIDDEN, 'You are not enrolled in this forum');
    }

    const membership = await prisma.userGroup.findFirst({
        where: {
            userId,
            groupId: { in: groupIds },
        },
    });

    if (!membership) {
        throw new AppError(httpStatus.FORBIDDEN, 'You are not enrolled in this forum');
    }

    return { forum: isForumExist }
};

export const isGroupExist = async (groupId: string, userId: string) => {
    await prisma.userGroup.findUnique({
        where: {
            groupId_userId: {
                groupId,
                userId
            }
        }
    })
}
