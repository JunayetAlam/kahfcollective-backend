import httpStatus from 'http-status';
import { Tier, UserRoleEnum } from "@prisma/client";
import AppError from "../../errors/AppError";
import { prisma } from '../../utils/prisma';
import { stripe } from '../../utils/stripe';
import QueryBuilder from '../../builder/QueryBuilder';
import { tierRepository } from './tier.repository';

const createTier = async (data: Tier) => {

  const stripeProduct = await stripe.products.create({
    name: data.name
  })

  if (!stripeProduct) {
    throw new AppError(httpStatus.EXPECTATION_FAILED, 'Fail to create Stripe Product')
  }

  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: data.price * 100,
    currency: 'usd'
  })

  if (!stripePrice) {
    throw new AppError(httpStatus.EXPECTATION_FAILED, 'Fail to create Stripe price')
  }

  data.stripeProductId = stripeProduct.id
  data.stripePriceId = stripePrice.id

  return await tierRepository.createTier(data);
};

const getAllTiers = async (query: Record<string, unknown>, role?: UserRoleEnum) => {
  if (role !== 'SUPERADMIN') {
    query.isDeleted = false;
    query.isHide = false
  }

  const tiersQuery = new QueryBuilder<typeof prisma.tier>(prisma.tier, query);
  const result = await tiersQuery
    .search(['name'])
    .filter()
    .sort()
    .customFields({
      ...(role !== 'SUPERADMIN' && {
        id: true,
        name: true,
        image: true,
        price: true
      })
    })
    .exclude()
    .paginate()
    .execute();

  return result;
};

const getTierById = async (id: string, role?: UserRoleEnum) => {
  const result = await prisma.tier.findUnique({
    where: {
      id,
      ...(role !== 'SUPERADMIN' && {
        isDeleted: false,
        isHide: false
      })
    }
  });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tier not found')
  };
  return result
};

const updateTier = async (id: string, data: Partial<Tier>) => {

  const tier = await prisma.tier.findFirstOrThrow({
    where: { id },
    select: {
      name: true,
      price: true,
      stripeProductId: true,
      stripePriceId: true
    }
  });

  if (data?.name) {

    if (tier.stripeProductId) {
      await stripe.products.update(tier.stripeProductId, {
        name: data.name
      });
    }
  }

  if (data?.price && data.price !== tier.price) {
    if (!tier.stripeProductId) throw new Error('Stripe Product ID missing');

    const newStripePrice = await stripe.prices.create({
      product: tier.stripeProductId,
      unit_amount: data.price * 100,
      currency: 'usd'
    });

    data.stripePriceId = newStripePrice.id;
  }

  const result = await tierRepository.updateTier(id, data);
  return result;
};

const toggleDeleteTier = async (id: string) => {
  const result = await prisma.$runCommandRaw({
    update: "tiers",
    updates: [
      {
        q: { _id: { $oid: id } },
        u: [{ $set: { isDeleted: { $not: "$isDeleted" } } }],
      },
    ],
    ordered: true,
  });
  return result
};

const toggleHideTier = async (id: string) => {

  const result = await prisma.$runCommandRaw({
    update: "tiers",
    updates: [
      {
        q: { _id: { $oid: id } },
        u: [{ $set: { isHide: { $not: "$isHide" } } }],
      },
    ],
    ordered: true,
  });
  return result
};

const togglePopularTier = async (id: string) => {
  const data = await prisma.tier.findUnique({
    where: { id },
    select: { isMostPopular: true, isDeleted: true, isHide: true },
  });

  if (!data) throw new AppError(httpStatus.NOT_FOUND, 'Tier not found');
  if (data.isDeleted) throw new AppError(httpStatus.BAD_REQUEST, 'Tier already deleted');
  if (data.isHide) throw new AppError(httpStatus.BAD_REQUEST, 'Tier is hide');

  await prisma.$transaction(async (prismaTx) => {
    await prismaTx.tier.update({
      where: { id },
      data: { isMostPopular: !data.isMostPopular },
    });

    if (!data.isMostPopular) {
      await prismaTx.tier.updateMany({
        where: { isMostPopular: true, NOT: { id } },
        data: { isMostPopular: false },
      });
    }
  });

  return prisma.tier.findUnique({
    where: { id },
    select: { isMostPopular: true },
  });
};

const isTierExist = async (id: string) => {
  const tier = await prisma.tier.findUnique({
    where: { id, isDeleted: false },
    select: {
      id: true
    }
  });
  if (!tier) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tier not found')
  }
  return tier
}

export const tierService = {
  createTier,
  getAllTiers,
  getTierById,
  updateTier,
  toggleDeleteTier,
  toggleHideTier,
  togglePopularTier,
  isTierExist
};
