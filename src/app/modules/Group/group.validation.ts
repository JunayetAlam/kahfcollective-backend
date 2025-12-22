import { z } from "zod";

const createGroup = z.object({
    body: z
        .object({
            name: z.string(),
        })
        .strict(),
});

const updateGroup = z.object({
    body: z
        .object({
            name: z.string().optional(),
        })
        .strict(),
});
const toggleAssignGroup = z.object({
    body: z
        .object({
            userId: z.string(),
            groupId: z.string(),
        })
        .strict(),
});

export const groupValidation = {
    createGroup,
    updateGroup,
    toggleAssignGroup,
};
