import { RightAnswer } from "@prisma/client";
import { z } from "zod";

const ansQuiz = z.object({
    body: z.object({
        quizId: z.string(),
        answer: z.nativeEnum(RightAnswer)
    }).strict()
})


export const quizAnswerValidation = { ansQuiz };
