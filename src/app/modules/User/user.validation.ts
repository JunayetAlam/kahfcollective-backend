import { z } from 'zod';
import { userRole, userStatus } from '../../constant';
import { GenderEnum, UserRoleEnum } from '@prisma/client';

const updateUser = z.object({
  body: z
    .object({
      fullName: z.string().optional(),
      phoneNumber: z.string().optional(),
      introduction: z.string().optional(),
      address: z.string().optional(),
    })
    .strict(),
});

const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.nativeEnum(UserRoleEnum),
  }),
});
const updateUserStatus = z.object({
  body: z.object({
    status: z.enum(userStatus),
  }),
});

const createMultipleUser = z.object({
  body: z.object({
    users: z.array(
      z.object({
        fullName: z.string(),
        email: z.string().email(),
        password: z.string(),
        isUserVerified: z.boolean().optional(),
        gender: z.nativeEnum(GenderEnum).optional(),
        address: z.string(),
        phoneNumber: z.string(),
        introduction: z.string().optional(),
        currentClass: z.string(),
        roll: z.number(),
        subject: z.string(),
      }),
    ),
  }),
});

const updatePassword = z.object({
  body: z.object({
    password: z.string(),
  }),
});

export const userValidation = {
  updateUser,
  updateUserRoleSchema,
  updateUserStatus,
  createMultipleUser,
  updatePassword,
};
