import { GenderEnum } from '@prisma/client';
import z from 'zod';

const loginUser = z.object({
  body: z
    .object({
      email: z
        .string({
          required_error: 'Email is required!',
        })
        .email({
          message: 'Invalid email format!',
        }),
      password: z.string({
        required_error: 'Password is required!',
      }),
    })
    .strict(),
});

const registerUser = z.object({
  body: z
    .object({
      fullName: z.string(),
      email: z.string().email(),
      phoneNumber: z.string(),
      password: z.string().min(6).max(16),
      address: z.string().min(1),
      introduction: z.string().min(1),
      isReferredBySheikhSalmam: z.boolean(),
      referredBy: z.string().optional(),
      majorOrProfession: z.string().min(1),
      haveTakenCoursesBefore: z.boolean(),
      coursesName: z.string().optional(),
      howLongInCourse: z.string().optional(),
      isTakeCourseWithSheikh: z.boolean(),
      gender: z.nativeEnum(GenderEnum),
    })
    .strict(),
});

const verifyEmailValidationSchema = z.object({
  body: z.object({
    token: z
      .string({
        required_error: 'Verification token is required',
      })
      .min(1, {
        message: 'Token cannot be empty',
      }),
  }),
});

const resendVerificationEmailValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email({
        message: 'Use a valid email format',
      }),
  }),
});

const changePasswordValidationSchema = z.object({
  body: z
    .object({
      oldPassword: z.string({
        required_error: 'Current password is required!',
      }),
      newPassword: z
        .string({
          required_error: 'New password is required!',
        })
        .min(6, {
          message: 'Password must be at least 6 characters long',
        }),
    })
    .strict(),
});

const forgetPasswordValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email({
        message: 'Use a valid email format',
      }),
  }),
});

const resetPasswordValidationSchema = z.object({
  body: z.object({
    newPassword: z
      .string({
        required_error: 'New password is required!',
      })
      .min(6, {
        message: 'Password must be at least 6 characters long',
      }),
    token: z
      .string({
        required_error: 'Verification token is required',
      })
      .min(1, {
        message: 'Token cannot be empty',
      }),
  }),
});

export const authValidation = {
  loginUser,
  registerUser,
  verifyEmailValidationSchema,
  resendVerificationEmailValidationSchema,
  changePasswordValidationSchema,
  forgetPasswordValidationSchema,
  resetPasswordValidationSchema,
};
