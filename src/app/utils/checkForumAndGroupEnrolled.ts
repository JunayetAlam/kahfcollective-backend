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
            groupId: true
        }
    })
    if (!isForumExist) {
        throw new AppError(httpStatus.NOT_FOUND, 'Forum Not found');
    }

    if (!needsValidation(role)) {
        return { forum: isForumExist };
    }



    await isGroupExist(isForumExist.groupId as string, userId)



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
