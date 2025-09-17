import { z } from "zod";
import { userRole, userStatus } from "../../constant";

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
        role: z.enum(userRole)
    })
})
const updateUserStatus = z.object({
    body: z.object({
        status: z.enum(userStatus)
    })
})

export const userValidation = { updateUser, updateUserRoleSchema, updateUserStatus };