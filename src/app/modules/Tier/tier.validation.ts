import { z } from "zod";

const createTier = z.object({
    body: z
        .object({
            name: z.string(),
        })
        .strict(),
});

const updateTier = z.object({
    body: z
        .object({
            name: z.string().optional(),
        })
        .strict(),
});
const toggleAssignTier = z.object({
    body: z
        .object({
            userId: z.string(),
            tierId: z.string(),
        })
        .strict(),
});

export const tierValidation = {
    createTier,
    updateTier,
    toggleAssignTier,
};
