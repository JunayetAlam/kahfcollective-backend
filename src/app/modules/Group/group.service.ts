import httpStatus from 'http-status';
import { Group, UserRoleEnum } from '@prisma/client';
import AppError from '../../errors/AppError';
import { prisma } from '../../utils/prisma';
import QueryBuilder from '../../builder/QueryBuilder';
import { groupRepository } from './group.repository';
import { toggleDelete } from '../../utils/toggleDelete';
import { UserServices } from '../User/user.service';
import { get, getOrSet, GetOrSetCollection, set } from '../../redis/GetOrSet';
import { removeDataByPattern, updateData } from '../../redis/redis.utils';

const createGroup = async (data: Group) => {
  const result = await groupRepository.createGroup(data);
  await removeDataByPattern(`groups*`);
  return result;
};

const getAllGroups = async (
  query: Record<string, unknown>,
  role?: UserRoleEnum,
) => {
  if (role !== 'SUPERADMIN') {
    query.isDeleted = false;
  }

  const groupsQuery = new QueryBuilder<typeof prisma.group>(
    prisma.group,
    query,
  );
  const result = await GetOrSetCollection({
    key: `groups-${JSON.stringify(query)}`,
    ttl: 24 * 60 * 60,
    query: groupsQuery
      .search(['name'])
      .filter()
      .sort()
      .customFields({
        ...(role !== 'SUPERADMIN' && {
          id: true,
          name: true,
        }),
      })
      .exclude()
      .paginate()
      .execute(),
    singleDataKey: 'group',
  });

  return result;
};

const getGroupById = async (id: string, role?: UserRoleEnum) => {
  const result = await prisma.group.findUniqueOrThrow({
    where: {
      id,
      ...(role !== 'SUPERADMIN' && {
        isDeleted: false,
      }),
    },
    ...(role !== 'SUPERADMIN' && {
      select: {
        id: true,
        name: true,
      },
    }),
  });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Group not found');
  }
  return result;
};

const updateGroup = async (id: string, data: Partial<Group>) => {
  const result = await groupRepository.updateGroup(id, data);
  await updateData(`group-${id}-details`, { ...data }, 24 * 60 * 60);
  return result;
};

const toggleDeleteGroup = async (id: string) => {
  const data = await prisma.group.findUniqueOrThrow({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      isDeleted: true,
    },
  });
  const result = await prisma.group.update({
    where: {
      id,
    },
    data: {
      isDeleted: !data.isDeleted,
    },
  });
  if (!data.isDeleted) {
    await removeDataByPattern(`group-${id}-details`);
  } else {
    await set({
      key: `group-${id}-details`,
      ttl: 24 * 60 * 60,
      data: {
        id: data.id,
        name: data.name,
      },
    });
  }
  await removeDataByPattern(`groups*`);
  return result;
};

const isGroupExist = async (id: string) => {
  const group = await prisma.group.findUnique({
    where: { id, isDeleted: false },
    select: {
      id: true,
    },
  });
  if (!group) {
    throw new AppError(httpStatus.NOT_FOUND, 'Group not found');
  }
  return group;
};

const toggleAssignGroup = async (userId: string, groupId: string) => {
  await UserServices.isUserExist(userId);
  const IsUserGroupExistWithTheUser = await prisma.userGroup.findUnique({
    where: {
      groupId_userId: {
        userId,
        groupId,
      },
    },
  });
  if (IsUserGroupExistWithTheUser) {
    const result = await prisma.userGroup.delete({
      where: {
        id: IsUserGroupExistWithTheUser.id,
      },
    });
    await removeDataByPattern(`user-group-${userId}-${groupId}`);

    const userData = await get({ key: `user-${userId}-details` });
    if (userData) {
      await updateData(
        `user-${userId}-details`,
        {
          ...userData,
          userGroups: userData.userGroups.filter(
            (item: any) => item.group.id !== groupId,
          ),
        },
        24 * 60 * 60,
      );
    }
    return result;
  }
  const result = await prisma.userGroup.create({
    data: {
      groupId,
      userId,
    },
  });
  await set({
    key: `user-group-${userId}-${groupId}`,
    ttl: 24 * 60 * 60,
    data: {
      groupId,
      userId,
      id: result.id,
    },
  });

  const userData = await get({ key: `user-${userId}-details` });
  if (userData) {
    await updateData(
      `user-${userId}-details`,
      {
        ...userData,
        userGroups: [...userData.userGroups, { group: { id: groupId } }],
      },
      24 * 60 * 60,
    );
  }
  return result;
};

export const groupService = {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  toggleDeleteGroup,
  isGroupExist,
  toggleAssignGroup,
};
