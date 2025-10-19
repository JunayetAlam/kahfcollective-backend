import { Content, UserRoleEnum } from '@prisma/client';
import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { prisma } from '../../utils/prisma';
import {
  deleteFromDigitalOceanAWS,
  uploadToDigitalOceanAWS,
} from '../../utils/uploadToDigitalOceanAWS';
import { tierService } from '../Tier/tier.service';
import { UserServices } from '../User/user.service';

// Create new content
const createContent = async (
  payload: Content,
  coverImageFile: Express.Multer.File | undefined,
  contentFile: Express.Multer.File | undefined,
  articlePDF: Express.Multer.File | undefined,
) => {
  await tierService.isTierExist(payload.tierId)
  await UserServices.isUserExist(payload.authorId)

  if (payload.contentType === 'ARTICLE') {
    if (!coverImageFile) {
      throw new AppError(httpStatus.NOT_FOUND, 'Cover Image not provied')
    } else {
      payload.coverImage = (
        await uploadToDigitalOceanAWS(coverImageFile)
      ).Location;
    }
    if (articlePDF) {
      payload.articlePDF = (
        await uploadToDigitalOceanAWS(articlePDF)
      ).Location;
    }
  }

  if (payload.contentType === 'SERMONS') {
    if (!contentFile) {
      throw new AppError(httpStatus.NOT_FOUND, 'Content file not provided')
    } else {
      payload.fileLink = (
        await uploadToDigitalOceanAWS(contentFile)
      ).Location;
    }
  }



  const content = await prisma.content.create({
    data: {
      ...payload,
    },
  });

  return content;
};

// Get content by ID with author info
const getContentById = async (id: string) => {
  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      tier: {
        select: {
          id: true,
          name: true
        }
      }
    },
  });

  if (!content) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
  }

  return content;
};

// Get all content, ordered by creation date
const getAllContents = async (query: any, role: UserRoleEnum, userId: string) => {
  query.isDeleted = false

  if (query.isFeatured) {
    if (query.isFeatured === 'true') {
      query.isFeatured = true
    }
    else if (query.isFeatured === 'false') {
      query.isFeatured = false
    }
    else {
      delete query.isFeatured
    }
  }
  if (role === 'USER') {
    const UserAllTier = await prisma.userTier.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        tierId: true
      }
    });
    const tierIds = UserAllTier.map(item => item.tierId);
    query.tierId = {
      in: tierIds
    }
  };

  const contentQuery = new QueryBuilder(prisma.content, query);
  const result = await contentQuery
    .search(['title'])
    .filter()
    .sort()
    .exclude()
    .paginate()
    .customFields({
      author: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
      tier: {
        select: {
          id: true,
          name: true
        }
      },
      description: true,
      contentType: true,
      coverImage: true,
      articlePDF: true,
      createdAt: true,
      isFeatured: true,
      type: true,
      authorId: true,
      fileLink: true,
      id: true,
      title: true,
      updatedAt: true,
    })
    .execute();
  return result;
};


const updateContent = async (
  id: string,
  payload: Partial<Omit<Content, 'id' | 'createdAt' | 'updatedAt'>>,
  coverImageFile: Express.Multer.File | undefined,
  contentFile: Express.Multer.File | undefined,
  articlePDF: Express.Multer.File | undefined,
) => {

  if (payload.tierId) {
    await tierService.isTierExist(payload.tierId)
  }
  if (payload.authorId) {
    await UserServices.isUserExist(payload.authorId)
  }

  if (payload?.contentType === 'ARTICLE') {
    if (coverImageFile) {
      payload.coverImage = (
        await uploadToDigitalOceanAWS(coverImageFile)
      ).Location;
    }
    if (articlePDF) {
      payload.articlePDF = (
        await uploadToDigitalOceanAWS(articlePDF)
      ).Location;
    }
  }

  if (payload?.contentType === 'SERMONS' && contentFile) {
    payload.fileLink = (
      await uploadToDigitalOceanAWS(contentFile)
    ).Location;
  }


  const updated = await prisma.content.update({
    where: { id },
    data: { ...payload },
  });

  return updated;
};

const deleteContent = async (id: string) => {
  await prisma.content.update({
    where: { id },
    data: {
      isDeleted: true
    }
  });

  return { message: 'Content deleted successfully' };
};

const toggleIsFeatured = async (id: string) => {
  // First, get the current state of the item
  const currentItem = await prisma.content.findUnique({
    where: { id, }
  });

  if (!currentItem) {
    throw new Error("Item not found");
  }

  if (!currentItem.isFeatured) {
    await prisma.content.updateMany({
      where: {
        id: { not: id },
        isFeatured: true,
        contentType: currentItem.contentType
      },
      data: {
        isFeatured: false
      }
    });
  }

  // Then toggle the current item's isFeatured status
  const result = await prisma.content.update({
    where: {
      id: id
    },
    data: {
      isFeatured: currentItem.isFeatured ? false : true
    }
  })

  return result;
};

export const ContentService = {
  createContent,
  getContentById,
  getAllContents,
  updateContent,
  deleteContent,
  toggleIsFeatured
};
