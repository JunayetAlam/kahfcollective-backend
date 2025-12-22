import { Group } from "@prisma/client";
import { prisma } from "../../utils/prisma";
import QueryBuilder from "../../builder/QueryBuilder";

const createGroup = async (data: Group) => {
    return await prisma.group.create({ data });
};

const getAllGroups = async (query: Record<string, unknown>) => {
    const groupsQuery = new QueryBuilder<typeof prisma.group>(prisma.group, query);
    const result = await groupsQuery
        .search(['name'])
        .filter()
        .sort()
        .exclude()
        .paginate()
        .execute();

    return result;
};

const getGroupById = async (id: string) => {
    return await prisma.group.findUnique({ where: { id } });
};

const updateGroup = async (id: string, data: Partial<Group>) => {
    return await prisma.group.update({ where: { id }, data });
};

const deleteGroup = async (id: string) => {
    return await prisma.group.delete({ where: { id } });
};

export const groupRepository = { createGroup, getAllGroups, getGroupById, updateGroup, deleteGroup };
