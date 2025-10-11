import { z } from "zod";

const ansQuiz = z.object({
    body: z.object({
        quizId: z.string(),
        answer: z.string()
    }).strict()
})


export const quizAnswerValidation = { ansQuiz };
