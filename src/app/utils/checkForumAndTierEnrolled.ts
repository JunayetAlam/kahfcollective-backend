import httpStatus from 'http-status';
import { UserRoleEnum } from "@prisma/client";
import AppError from "../errors/AppError";
import { prisma } from './prisma';

const needsValidation = (role: UserRoleEnum) => {
    return role === 'USER';
};

export const checkForumAndTierEnrolled = async (userId: string, forumId: string, role: UserRoleEnum) => {
    const isForumExist = await prisma.forum.findUnique({
        where: {
            id: forumId,
            isDeleted: false
        },
        select: {
            tierId: true
        }
    })
    if (!isForumExist) {
        throw new AppError(httpStatus.NOT_FOUND, 'Forum Not found');
    }

    if (!needsValidation(role)) {
        return { forum: isForumExist };
    }



    await isTierExist(isForumExist.tierId as string, userId)



    return { forum: isForumExist }
};

export const isTierExist = async (tierId: string, userId: string) => {
    await prisma.userTier.findUnique({
        where: {
            tierId_userId: {
                tierId,
                userId
            }
        }
    })
}
