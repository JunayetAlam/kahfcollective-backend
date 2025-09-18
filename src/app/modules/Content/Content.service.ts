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

// Create new content
const createContent = async (
  payload: Content,
  coverImageFile?: Express.Multer.File,
  contentFile?: Express.Multer.File,
) => {
  const isTierExist = await prisma.tier.findUnique({
    where: {
      id: payload.tierId,
      isDeleted: false
    },
    select: {
      id: true
    }
  })
  if (!isTierExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tier not found')
  }
  const isAuthorExist = await prisma.user.findUnique({
    where: {
      id: payload.authorId,
    },
    select: {
      id: true
    }
  })
  if (!isAuthorExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tier not found')
  }
  if (payload.contentType === 'ARTICLE') {
    if (!coverImageFile) {
      throw new AppError(httpStatus.NOT_FOUND, 'Cover Image not provied')
    } else {
      payload.coverImage = (
        await uploadToDigitalOceanAWS(coverImageFile)
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
const getAllContents = async (query: any) => {
  const notificationQuery = new QueryBuilder(prisma.content, query);
  const result = await notificationQuery
    .search(['name'])
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
      createdAt: true,
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
  coverImageFile?: Express.Multer.File,
  contentFile?: Express.Multer.File,
) => {


  if (payload.tierId) {
    const isTierExist = await prisma.tier.findUnique({
      where: {
        id: payload.tierId,
        isDeleted: false
      },
      select: {
        id: true
      }
    })
    if (!isTierExist) {
      throw new AppError(httpStatus.NOT_FOUND, 'Tier not found')
    }
  }
  if (payload.authorId) {
    const isAuthorExist = await prisma.user.findUnique({
      where: {
        id: payload.authorId,
      },
      select: {
        id: true
      }
    })
    if (!isAuthorExist) {
      throw new AppError(httpStatus.NOT_FOUND, 'Tier not found')
    }
  }

  if (payload?.contentType === 'ARTICLE' && coverImageFile) {
    payload.coverImage = (
      await uploadToDigitalOceanAWS(coverImageFile)
    ).Location;
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

export const ContentService = {
  createContent,
  getContentById,
  getAllContents,
  updateContent,
  deleteContent,
};
