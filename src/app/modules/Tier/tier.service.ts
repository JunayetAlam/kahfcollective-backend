import httpStatus from 'http-status';
import { Tier, UserRoleEnum } from "@prisma/client";
import AppError from "../../errors/AppError";
import { prisma } from '../../utils/prisma';
import QueryBuilder from '../../builder/QueryBuilder';
import { tierRepository } from './tier.repository';
import { toggleDelete } from '../../utils/toggleDelete';
import { UserServices } from '../User/user.service';

const createTier = async (data: Tier) => {
  return await tierRepository.createTier(data);
};

const getAllTiers = async (query: Record<string, unknown>, role?: UserRoleEnum) => {
  if (role !== 'SUPERADMIN') {
    query.isDeleted = false;
  }

  const tiersQuery = new QueryBuilder<typeof prisma.tier>(prisma.tier, query);
  const result = await tiersQuery
    .search(['name'])
    .filter()
    .sort()
    .customFields({
      ...(role !== 'SUPERADMIN' && {
        id: true,
        name: true,
      })
    })
    .exclude()
    .paginate()
    .execute();

  return result;
};

const getTierById = async (id: string, role?: UserRoleEnum) => {
  const result = await prisma.tier.findUnique({
    where: {
      id,
      ...(role !== 'SUPERADMIN' && {
        isDeleted: false,
      })
    },
    ...(role !== 'SUPERADMIN' && {
      select: {
        id: true,
        name: true,
      }
    })
  });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tier not found');
  }
  return result;
};

const updateTier = async (id: string, data: Partial<Tier>) => {
  const result = await tierRepository.updateTier(id, data);
  return result;
};

const toggleDeleteTier = async (id: string) => {
  const result = await toggleDelete(id, 'tiers');
  return result;
};

const isTierExist = async (id: string) => {
  const tier = await prisma.tier.findUnique({
    where: { id, isDeleted: false },
    select: {
      id: true
    }
  });
  if (!tier) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tier not found');
  }
  return tier;
};

const toggleAssignTier = async (userId: string, tierId: string) => {
  await UserServices.isUserExist(userId);
  const IsUserTierExistWithTheUser = await prisma.userTier.findUnique({
    where: {
      tierId_userId: {
        userId,
        tierId
      }
    }
  });
  if (IsUserTierExistWithTheUser) {
    return await prisma.userTier.delete({
      where: {
        id: IsUserTierExistWithTheUser.id
      }
    })
  }
  return await prisma.userTier.create({
    data: {
      tierId,
      userId
    }
  })
}

export const tierService = {
  createTier,
  getAllTiers,
  getTierById,
  updateTier,
  toggleDeleteTier,
  isTierExist,
  toggleAssignTier
};
