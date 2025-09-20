import httpStatus from 'http-status';
import AppError from "../errors/AppError";
import { prisma } from "./prisma";

export const checkSpecificPaidTier = async (tierId: string, tierName: string, userId: string) => {
    const payment = await prisma.payment.findUnique({
        where: {
            userId_tierId: {
                tierId,
                userId
            },
            status: 'SUCCESS'
        },
        select: {
            tier: {
                select: {
                    name: true,
                    price: true,
                    id: true,
                }
            }
        }
    });
    if (!payment) {
        throw new AppError(httpStatus.FORBIDDEN, `Please Buy the ${tierName} tier to unlock it.`)
    }
}