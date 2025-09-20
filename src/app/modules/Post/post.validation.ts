import { z } from "zod";

const postOrReply = z.object({
    body: z
        .object({
            message: z.string(),
        })
        .strict(),
});


export const postValidation = {
   postOrReply
};