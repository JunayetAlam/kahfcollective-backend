import { z } from "zod";

const createTier = z.object({
    body: z
        .object({
            name: z.string(),
            price: z.number(),
            points: z.array(z.string())
        })
        .strict(),
});

const updateTier = z.object({
    body: z
        .object({
            name: z.string().optional(),
            price: z.number().optional(),
            points: z.array(z.string()).optional()
        })
        .strict(),
});

export const tierValidation = {
    createTier,
    updateTier,
};
