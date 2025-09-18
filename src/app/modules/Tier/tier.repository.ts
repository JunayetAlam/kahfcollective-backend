import { Tier } from "@prisma/client";
import { prisma } from "../../utils/prisma";
import QueryBuilder from "../../builder/QueryBuilder";

const createTier = async (data: Tier) => {
    return await prisma.tier.create({ data });
};

const getAllTiers = async (query: Record<string, unknown>) => {
    const tiersQuery = new QueryBuilder<typeof prisma.tier>(prisma.tier, query);
    const result = await tiersQuery
        .search(['name'])
        .filter()
        .sort()
        .exclude()
        .paginate()
        .execute();

    return result;
};

const getTierById = async (id: string) => {
    return await prisma.tier.findUnique({ where: { id } });
};

const updateTier = async (id: string, data: Partial<Tier>) => {
    return await prisma.tier.update({ where: { id }, data });
};

const deleteTier = async (id: string) => {
    return await prisma.tier.delete({ where: { id } });
};

export const tierRepository = { createTier, getAllTiers, getTierById, updateTier, deleteTier };
