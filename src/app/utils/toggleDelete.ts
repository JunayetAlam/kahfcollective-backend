import { prisma } from "./prisma";

export const toggleDelete = async (id: string, collection: string, extraQuery?: Record<string, unknown> | undefined) => {
    const result = await prisma.$runCommandRaw({
        update: collection,
        updates: [
            {
                q: { _id: { $oid: id }, ...extraQuery },
                u: [{ $set: { isDeleted: { $not: "$isDeleted" } } }],
            },
        ],
        ordered: true,
    });
    return result
};