import { z } from "zod";
import { userRole, userStatus } from "../../constant";
import { UserRoleEnum } from "@prisma/client";

const updateUser = z.object({
    body: z.object({
        fullName: z.string().optional(),
        phoneNumber: z.string().optional(),
        introduction: z.string().optional(),
        address: z.string().optional(),
        
    }).strict(),
});

const updateUserRoleSchema = z.object({
    body: z.object({
        role: z.nativeEnum(UserRoleEnum)
    })
})
const updateUserStatus = z.object({
    body: z.object({
        status: z.enum(userStatus)
    })
})

export const userValidation = { updateUser, updateUserRoleSchema, updateUserStatus };