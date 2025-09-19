import httpStatus from 'http-status';
import QueryBuilder from '../../builder/QueryBuilder';
import { prisma } from '../../utils/prisma';
import AppError from '../../errors/AppError';
import { UserRoleEnum } from '@prisma/client';
import { checkout } from '../../utils/StripeUtils';

const getAllPayments = async (query: Record<string, any>) => {
    const paymentQuery = new QueryBuilder<typeof prisma.payment>(prisma.payment, query);
    const result = await paymentQuery
        .search(['user.firstName', 'user.lastName', 'user.email', 'product.title', 'stripePaymentId', 'stripeSessionId'])
        .filter()
        .sort()
        .customFields({
            id: true,
            amount: true,
            userId: true,
            paymentMethodType: true,
            createdAt: true,
            status: true,
            stripeCustomerId: true,
            stripePaymentId: true,
            stripeSessionId: true,
            user: {
                select: {
                    profile: true,
                    fullName: true,
                    email: true
                }
            },


        })
        .exclude()
        .paginate()
        .execute()
    return result
};

const singleTransactionHistory = async (query: { id: string, userId?: string }) => {
    const result = await prisma.payment.findUnique({
        where: query,
        select: {
            id: true,
            amount: true,
            userId: true,
            paymentMethodType: true,
            createdAt: true,
            stripeCustomerId: true,
            stripePaymentId: true,
            stripeSessionId: true,
            currency: true,
            status: true,

            user: {
                select: {
                    profile: true,
                    fullName: true,
                    email: true
                }
            },

        }
    });
    if (!result) {
        throw new AppError(httpStatus.NOT_FOUND, 'Transaction history not found')
    }
    return result
}
const singleTransactionHistoryBySessionId = async (query: { stripeSessionId: string, userId?: string }) => {
    const result = await prisma.payment.findUnique({
        where: query,
        select: {
            id: true,
            amount: true,
            userId: true,
            paymentMethodType: true,
            createdAt: true,
            stripeCustomerId: true,
            stripePaymentId: true,
            stripeSessionId: true,
            currency: true,
            status: true,

            user: {
                select: {
                    profile: true,
                    fullName: true,
                    email: true
                }
            },

        }
    });
    if (!result) {
        throw new AppError(httpStatus.NOT_FOUND, 'Transaction history not found')
    }
    return result
}

const buyTier = async (userId: string, email: string, tierId: string) => {
    const tier = await prisma.tier.findUnique({
        where: {
            id: tierId,
            isDeleted: false,
            isHide: false
        }
    })
    if (!tier) {
        throw new AppError(httpStatus.NOT_FOUND, 'Tier not found')
    }

    let payment = await prisma.payment.findUnique({
        where: {
            userId_tierId: {
                tierId,
                userId
            }
        }
    });

    if (payment && payment.status === 'SUCCESS') {
        throw new AppError(httpStatus.BAD_REQUEST, 'Already purchased the tier')
    };

    if (!payment) {
        payment = await prisma.payment.create({
            data: {
                tierId,
                userId,
                amount: tier.price,
            }
        })
    }

    const paymentUrl = await checkout({ stripePriceId: tier.stripePriceId, email: email, paymentId: payment?.id || '' })

    return {
        payment,
        stripePriceId: tier.stripePriceId,
        paymentUrl: paymentUrl
    }

};
const cancelPayment = async (id: string, userId: string, role: UserRoleEnum) => {
    return await prisma.payment.update({
        where: {
            id,
            ...(role !== 'SUPERADMIN' && { userId })
        },
        data: {
            status: 'CANCELED'
        },
    })

}




export const PaymentService = {
    getAllPayments,
    singleTransactionHistory,
    cancelPayment,
    singleTransactionHistoryBySessionId,
    buyTier
};
