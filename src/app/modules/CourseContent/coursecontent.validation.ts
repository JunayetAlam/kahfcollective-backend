import { ContentStatusEnum, RightAnswer } from '@prisma/client';
import { z } from 'zod';

const OptionsSchema = z
  .object({
    A: z.string().trim(),
    B: z.string().trim(),
    C: z.string().trim(),
    D: z.string().trim(),
  })
  .strict();

const normalQuizZodType = z.object({
  options: OptionsSchema,
  question: z.string(),
  rightAnswer: z.nativeEnum(RightAnswer),
});

const updateContent = z.object({
  body: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.nativeEnum(ContentStatusEnum).optional(),
    })
    .strict(),
});

const createVideoContent = z.object({
  body: z
    .object({
      courseId: z.string(),
      title: z.string(),
      description: z.string(),
      status: z.nativeEnum(ContentStatusEnum),
    })
    .strict(),
});

const createQuestionContent = z.object({
  body: z
    .object({
      courseId: z.string(),
      title: z.string(),
      status: z.nativeEnum(ContentStatusEnum),
      question: z.string(),
      description: z.string(),
    })
    .strict(),
});

const updateQuestionContent = z.object({
  body: z
    .object({
      title: z.string().optional(),
      contentId: z.string(),
      status: z.nativeEnum(ContentStatusEnum).optional(),
      question: z.string().optional(),
    })
    .strict(),
});

const updateAnswerStatus = z.object({
  body: z
    .object({
      answerId: z.string(),
      isCorrect: z.boolean(),
    })
    .strict(),
});

const answerQuestionContent = z.object({
  body: z
    .object({
      questionId: z.string(),
      answer: z.string(),
    })
    .strict(),
});

const createQuizContent = z.object({
  body: z
    .object({
      courseId: z.string(),
      title: z.string(),
      description: z.string(),
      status: z.nativeEnum(ContentStatusEnum),
      quizzes: z.array(normalQuizZodType).min(1),
    })
    .strict(),
});

const createQuiz = z.object({
  body: normalQuizZodType
    .extend({
      courseContentId: z.string(),
    })
    .strict(),
});
const changeIndex = z.object({
  body: z.object({
    newIndex: z.number(),
  }),
});
const updateQuiz = z.object({
  body: z
    .object({
      options: OptionsSchema.optional(),
      question: z.string().optional(),
      rightAnswer: z.nativeEnum(RightAnswer).optional(),
    })
    .strict(),
});

export const CoursecontentValidation = {
  createVideoContent,
  createQuizContent,
  createQuiz,
  updateContent,
  changeIndex,
  updateQuiz,
  answerQuestionContent,
  createQuestionContent,
  updateQuestionContent,
  updateAnswerStatus,
};
