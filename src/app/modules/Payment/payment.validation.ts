import { PaymentType } from "@prisma/client";
import { z } from "zod";

const payment = z.object({
    body: z.object({
        paymentType: z.enum(PaymentType),
        amount: z.number().optional()
    }).strict()
})
export const PaymentValidation = { payment };
