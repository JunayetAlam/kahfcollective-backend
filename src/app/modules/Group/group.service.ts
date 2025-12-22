import httpStatus from 'http-status';
import { Group, UserRoleEnum } from "@prisma/client";
import AppError from "../../errors/AppError";
import { prisma } from '../../utils/prisma';
import QueryBuilder from '../../builder/QueryBuilder';
import { groupRepository } from './group.repository';
import { toggleDelete } from '../../utils/toggleDelete';
import { UserServices } from '../User/user.service';

const createGroup = async (data: Group) => {
  return await groupRepository.createGroup(data);
};

const getAllGroups = async (query: Record<string, unknown>, role?: UserRoleEnum) => {
  if (role !== 'SUPERADMIN') {
    query.isDeleted = false;
  }

  const groupsQuery = new QueryBuilder<typeof prisma.group>(prisma.group, query);
  const result = await groupsQuery
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

const getGroupById = async (id: string, role?: UserRoleEnum) => {
  const result = await prisma.group.findUnique({
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
    throw new AppError(httpStatus.NOT_FOUND, 'Group not found');
  }
  return result;
};

const updateGroup = async (id: string, data: Partial<Group>) => {
  const result = await groupRepository.updateGroup(id, data);
  return result;
};

const toggleDeleteGroup = async (id: string) => {
  const result = await toggleDelete(id, 'groups');
  return result;
};

const isGroupExist = async (id: string) => {
  const group = await prisma.group.findUnique({
    where: { id, isDeleted: false },
    select: {
      id: true
    }
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
        groupId
      }
    }
  });
  if (IsUserGroupExistWithTheUser) {
    return await prisma.userGroup.delete({
      where: {
        id: IsUserGroupExistWithTheUser.id
      }
    })
  }
  return await prisma.userGroup.create({
    data: {
      groupId,
      userId
    }
  })
}



export const groupService = {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  toggleDeleteGroup,
  isGroupExist,
  toggleAssignGroup,
};
