import { ContentStatusEnum, QuizType } from '@prisma/client';
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
      type: z
        .enum([
          'VIDEO',
          'QUIZ',
          'PDF',
          'TEXT',
          'VIDEO_LINK',
          'MEETING_LINK',
        ])
        .optional(),
      text: z.string().optional().nullable(),
      videoLink: z
        .union([z.string().url(), z.literal(''), z.null()])
        .optional(),
      meetingLink: z
        .union([z.string().url(), z.literal(''), z.null()])
        .optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.type === 'TEXT') {
        const plain = (data.text || '').replace(/<[^>]*>/g, '').trim();
        if (!plain) {
          ctx.addIssue({
            code: 'custom',
            message: 'Text content is required',
            path: ['text'],
          });
        }
      }
      if (data.type === 'VIDEO_LINK') {
        if (!data.videoLink) {
          ctx.addIssue({
            code: 'custom',
            message: 'Video link is required',
            path: ['videoLink'],
          });
        }
      }
      if (data.type === 'MEETING_LINK') {
        if (!data.meetingLink) {
          ctx.addIssue({
            code: 'custom',
            message: 'Meeting link is required',
            path: ['meetingLink'],
          });
        }
      }
    }),
});

const createVideoContent = z.object({
  body: z
    .object({
      courseId: z.string(),
      semesterId: z.string().optional().nullable(),
      chapterId: z.string().optional().nullable(),
      type: z.enum(['VIDEO', 'PDF']),
      title: z.string(),
      description: z.string(),
      status: z.enum(ContentStatusEnum),
    })
    .strict(),
});

const createTextOrLinkContent = z.object({
  body: z
    .object({
      courseId: z.string(),
      semesterId: z.string().optional().nullable(),
      chapterId: z.string().optional().nullable(),
      type: z.enum(['TEXT', 'VIDEO_LINK', 'MEETING_LINK']),
      title: z.string(),
      description: z.string(),
      status: z.enum(ContentStatusEnum),
      text: z.string().optional(),
      videoLink: z.string().url().optional(),
      meetingLink: z.string().url().optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.type === 'TEXT') {
        const plain = (data.text || '').replace(/<[^>]*>/g, '').trim();
        if (!plain) {
          ctx.addIssue({
            code: 'custom',
            message: 'Text content is required',
            path: ['text'],
          });
        }
      }
      if (data.type === 'VIDEO_LINK' && !data.videoLink) {
        ctx.addIssue({
          code: 'custom',
          message: 'Video link is required',
          path: ['videoLink'],
        });
      }
      if (data.type === 'MEETING_LINK' && !data.meetingLink) {
        ctx.addIssue({
          code: 'custom',
          message: 'Meeting link is required',
          path: ['meetingLink'],
        });
      }
    }),
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
      semesterId: z.string().optional().nullable(),
      chapterId: z.string().optional().nullable(),
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
    newIndex: z.number().int().positive(),
  }),
});

const moveContent = z.object({
  body: z
    .object({
      scope: z.enum(['COURSE', 'SEMESTER', 'CHAPTER']),
      semesterId: z.string().optional().nullable(),
      chapterId: z.string().optional().nullable(),
      newIndex: z.number().int().positive(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.scope === 'SEMESTER' && !data.semesterId) {
        ctx.addIssue({
          code: 'custom',
          message: 'semesterId is required for SEMESTER scope',
          path: ['semesterId'],
        });
      }
      if (data.scope === 'CHAPTER' && !data.chapterId) {
        ctx.addIssue({
          code: 'custom',
          message: 'chapterId is required for CHAPTER scope',
          path: ['chapterId'],
        });
      }
    }),
});

const updateQuiz = z.object({
  body: z
    .object({
      options: OptionsSchema.optional(),
      question: z.string().optional(),
      rightAnswer: z.string().optional(),
      type: z.enum(QuizType),
    })
    .strict(),
});

export const CoursecontentValidation = {
  createVideoContent,
  createTextOrLinkContent,
  createQuizContent,
  createQuiz,
  updateContent,
  changeIndex,
  moveContent,
  updateQuiz,
  answerQuestionContent,
  createQuestionContent,
  updateQuestionContent,
  updateAnswerStatus,
};
