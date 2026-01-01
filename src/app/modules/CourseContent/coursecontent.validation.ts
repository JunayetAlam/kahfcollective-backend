import { ContentStatusEnum, CourseContentTypeEnum, QuizType } from '@prisma/client';
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
  type: z.enum(QuizType),
  options: OptionsSchema.optional(),
  question: z.string(),
  rightAnswer: z.string(),
});

const updateContent = z.object({
  body: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(ContentStatusEnum).optional(),
    })
    .strict(),
});

const createVideoContent = z.object({
  body: z
    .object({
      courseId: z.string(),
      type: z.enum(CourseContentTypeEnum),
      title: z.string(),
      description: z.string(),
      status: z.enum(ContentStatusEnum),
    })
    .strict(),
});

const createQuestionContent = z.object({
  body: z
    .object({
      courseId: z.string(),
      title: z.string(),
      status: z.enum(ContentStatusEnum),
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
      status: z.enum(ContentStatusEnum).optional(),
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
      status: z.enum(ContentStatusEnum),
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
      rightAnswer: z.string().optional(),
      type: z.enum(QuizType)
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
