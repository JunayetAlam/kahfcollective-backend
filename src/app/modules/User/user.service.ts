import httpStatus from 'http-status';
import { Group, User, UserRoleEnum, UserStatus } from '@prisma/client';
import QueryBuilder from '../../builder/QueryBuilder';
import { prisma } from '../../utils/prisma';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import AppError from '../../errors/AppError';
import {
  deleteFromDigitalOceanAWS,
  uploadToDigitalOceanAWS,
} from '../../utils/uploadToDigitalOceanAWS';
import { removeDataByPattern, updateData } from '../../redis/redis.utils';
import {
  getMany,
  getOrSet,
  GetOrSetCollection,
  set,
} from '../../redis/GetOrSet';
import { UsersRedis } from './user.redis';

const getAllUsersFromDB = async (query: any) => {
  query.isDeleted = false;
  const usersQuery = new QueryBuilder<typeof prisma.user>(prisma.user, query);
  const result = await GetOrSetCollection({
    key: `users-${JSON.stringify(query)}`,
    ttl: 24 * 60 * 60,
    query: usersQuery
      .search(['fullName', 'email'])
      .filter()
      .sort()
      .customFields({
        id: true,
        address: true,
        fullName: true,
        email: true,
        profile: true,
        gender: true,
        phoneNumber: true,
        role: true,
        introduction: true,

        currentClass: true,
        roll: true,
        subject: true,

        status: true,
        isUserVerified: true,
        enrollCourses: {
          where: {
            course: {
              isDeleted: false,
            },
          },
          select: {
            courseId: true,
          },
        },
        userGroups: {
          where: {
            group: {
              isDeleted: false,
            },
          },
          select: {
            group: {
              select: {
                id: true,
              },
            },
          },
        },
      })
      .exclude()
      .paginate()
      .execute(),
    singleDataKey: 'user',
    // newData: true,
  });

  const users: (User & { userGroups: { group: Group }[] })[] = result.data;

  const newUser = await UsersRedis(users);

  return {
    data: newUser,
    meta: result.meta,
  };
};

const getGroupUsers = async (groupId: string, query: any) => {
  query.userGroups = {
    some: {
      groupId,
    },
  };
  query.role = 'USER';
  const result = getAllUsersFromDB(query);
  return result;
};

const getMyProfileFromDB = async (id: string) => {
  const Profile = await getOrSet({
    key: `user-${id}-details`,
    ttl: 24 * 60 * 60,
    query: prisma.user.findUniqueOrThrow({
      where: {
        id: id,
      },
      select: {
        id: true,
        address: true,
        fullName: true,
        email: true,
        profile: true,
        gender: true,
        phoneNumber: true,
        role: true,
        isUserVerified: true,
        status: true,

        currentClass: true,
        roll: true,
        subject: true,
        introduction: true,

        enrollCourses: {
          where: {
            course: {
              isDeleted: false,
            },
          },
          select: {
            courseId: true,
          },
        },
        userGroups: {
          where: {
            group: {
              isDeleted: false,
            },
          },
          select: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  });

  const newUser = await UsersRedis([Profile]);

  return newUser[0];
};

const getUserDetailsFromDB = async (id: string) => {
  const user = await getOrSet({
    key: `user-${id}-details`,
    ttl: 24 * 60 * 60,
    query: prisma.user.findUniqueOrThrow({
      where: {
        id: id,
      },
      select: {
        id: true,
        address: true,
        fullName: true,
        email: true,
        profile: true,
        gender: true,
        phoneNumber: true,
        role: true,
        introduction: true,

        currentClass: true,
        roll: true,
        subject: true,

        status: true,
        isUserVerified: true,
        enrollCourses: {
          where: {
            course: {
              isDeleted: false,
            },
          },
          select: {
            courseId: true,
          },
        },
        userGroups: {
          where: {
            group: {
              isDeleted: false,
            },
          },
          select: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  });

  const newUser = await UsersRedis([user]);

  return newUser[0];
};

const updateProfileImg = async (
  id: string,
  previousImg: string,
  req: Request,
  file: Express.Multer.File | undefined,
) => {
  if (file) {
    const { Location } = await uploadToDigitalOceanAWS(file);
    const result = await prisma.user.update({
      where: {
        id,
      },
      data: {
        profile: Location,
      },
    });
    if (previousImg) {
      deleteFromDigitalOceanAWS(previousImg);
    }
    req.user.profile = Location;
    await updateData(`user-${id}-*`, { profile: Location }, 60 * 60 * 24);
    return result;
  }
  throw new AppError(httpStatus.NOT_FOUND, 'Please provide image');
};

const updateMyProfileIntoDB = async (
  id: string,

  payload: Partial<User>,
) => {
  delete payload.email;

  const result = await prisma.user.update({
    where: {
      id,
    },
    data: payload,
  });
  await updateData(`user-${id}-*`, { ...payload }, 60 * 60 * 24);
  return result;
};

const updateUserRoleStatusIntoDB = async (
  id: string,
  role: UserRoleEnum,
  myId: string,
) => {
  if (id === myId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You cannot change your own role',
    );
  }
  const result = await prisma.user.update({
    where: {
      id: id,
      isDeleted: false,
    },
    data: {
      role: role,
    },
  });
  await updateData(`user-${id}-*`, { role }, 60 * 60 * 24);
  return result;
};

const updateProfileStatus = async (
  id: string,
  status: UserStatus,
  myId: string,
) => {
  if (id === myId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You cannot change your own status',
    );
  }
  const result = await prisma.user.update({
    where: {
      id,
      isDeleted: false,
    },
    data: {
      status,
    },
    select: {
      id: true,
      status: true,
      role: true,
    },
  });
  await updateData(`user-${id}-*`, { status }, 60 * 60 * 24);
  return result;
};

const isUserExist = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id, isDeleted: false },
    select: {
      id: true,
    },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

const toggleIsUserVerified = async (id: string, myId: string) => {
  if (id === myId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You cannot change your own status',
    );
  }
  const user = await getOrSet({
    key: `user-${id}-details`,
    ttl: 24 * 60 * 60,
    query: prisma.user.findUniqueOrThrow({
      where: {
        id,
      },
      select: {
        id: true,
        isUserVerified: true,
      },
    }),
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  const result = await prisma.user.update({
    where: {
      id,
      isDeleted: false,
    },
    data: {
      isUserVerified: !user.isUserVerified,
    },
  });
  await updateData(
    `user-${id}-details`,
    { isUserVerified: !user.isUserVerified },
    60 * 60 * 24,
  );
  return result;
};

const expireUserMonthlySubscription = async () => {
  const now = new Date();
  const result = await prisma.user.updateMany({
    where: {
      expireIn: { lte: now },
      status: 'ACTIVE',
      role: 'USER',
    },
    data: {
      isUserVerified: false,
    },
  });
  await removeDataByPattern(`user*`);
  return result;
};

const deleteUser = async (id: string, myId: string) => {
  if (id === myId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot remove yourself');
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { id, isDeleted: false },
  });
  if (user.role === 'SUPERADMIN') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Super Admin Cannot deletable');
  }
  const deleteUser = await prisma.user.update({
    where: { id },
    data: {
      isDeleted: true,
      status: 'ACTIVE',
      isEmailVerified: false,
      isUserVerified: false,
      emailVerificationToken: '',
    },
  });
  await removeDataByPattern(`user-${id}-*`);
  await removeDataByPattern(`users*`);
  return deleteUser;
};

const createMultipleUser = async (users: User[]) => {
  const uniqueEmail = [...new Set(users.map(user => user.email))];
  const isUserExist = await prisma.user.findMany({
    where: {
      email: {
        in: uniqueEmail,
      },
    },
  });
  if (isUserExist.length > 0) {
    const allEmail = isUserExist.map(user => user.email);
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User already exist with email ${allEmail.join(', ')}`,
    );
  }
  const allUsers = await Promise.all(
    uniqueEmail.map(async email => {
      const returnUser = users.find(u => u.email === email) as User;
      const hashedPassword: string = await bcrypt.hash(
        returnUser?.password,
        12,
      );
      return {
        email: email,
        fullName: returnUser?.fullName,
        phoneNumber: returnUser?.phoneNumber,
        password: hashedPassword,
        visiblePassword: returnUser?.visiblePassword,
        role: 'USER' as UserRoleEnum,
        isCreatedByAdmin: true,
        status: returnUser?.status || 'ACTIVE',
        isUserVerified: returnUser?.isUserVerified || true,
        isEmailVerified: true,
        gender: returnUser?.gender,
        address: returnUser?.address,
        currentClass: returnUser?.currentClass,
        roll: returnUser?.roll,
        subject: returnUser?.subject,
        introduction: returnUser?.introduction || '',
      };
    }),
  );

  const result = await prisma.user.createMany({
    data: allUsers,
  });
  await removeDataByPattern(`users*`);
  return result;
};

const updatePassword = async (id: string, password: string) => {
  const hashedPassword: string = await bcrypt.hash(password, 12);
  const result = await prisma.user.update({
    where: { id },
    data: { password: hashedPassword, visiblePassword: password },
  });
  return result;
};

export const UserServices = {
  getAllUsersFromDB,
  getMyProfileFromDB,
  getUserDetailsFromDB,
  updateMyProfileIntoDB,
  updateUserRoleStatusIntoDB,
  updateProfileStatus,
  updateProfileImg,
  isUserExist,
  toggleIsUserVerified,
  expireUserMonthlySubscription,
  getGroupUsers,
  deleteUser,
  updatePassword,
  createMultipleUser,
};
