import httpStatus from 'http-status';
import { User, UserRoleEnum, UserStatus } from '@prisma/client';
import QueryBuilder from '../../builder/QueryBuilder';
import { prisma } from '../../utils/prisma';
import { Request } from 'express';
import AppError from '../../errors/AppError';
import { deleteFromDigitalOceanAWS, uploadToDigitalOceanAWS } from '../../utils/uploadToDigitalOceanAWS';

const getAllUsersFromDB = async (query: any) => {
  query.isDeleted = false
  const usersQuery = new QueryBuilder<typeof prisma.user>(prisma.user, query);
  const result = await usersQuery
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
        select: {
          courseId: true
        }
      },
      userGroups: {
        select: {
          group: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    })
    .exclude()
    .paginate()
    .execute();

  return result;
};

const getGroupUsers = async (groupId: string, query: any) => {
  query.userGroups = {
    some: {
      groupId
    }
  }
  query.role = 'USER'
  const result = getAllUsersFromDB(query);
  return result
};


const getMyProfileFromDB = async (id: string) => {
  const Profile = await prisma.user.findUniqueOrThrow({
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

      userGroups: {
        select: {
          group: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      }
    }
  });

  return Profile;
};

const getUserDetailsFromDB = async (id: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id, isDeleted: false },
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

      currentClass: true,
      roll: true,
      subject: true,
      introduction: true,

      status: true,
      userGroups: {
        select: {
          group: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  })

  return user;
};

const updateProfileImg = async (id: string, previousImg: string, req: Request, file: Express.Multer.File | undefined) => {

  if (file) {
    const { Location } = await uploadToDigitalOceanAWS(file)
    const result = await prisma.user.update({
      where: {
        id
      },
      data: {
        profile: Location
      }
    });
    if (previousImg) {
      deleteFromDigitalOceanAWS(previousImg)
    }
    req.user.profile = Location;
    return result
  }
  throw new AppError(httpStatus.NOT_FOUND, 'Please provide image')
};

const updateMyProfileIntoDB = async (
  id: string,

  payload: Partial<User>,
) => {
  delete payload.email


  const result = await prisma.user.update({
    where: {
      id
    },
    data: payload
  })
  return result
};

const updateUserRoleStatusIntoDB = async (id: string, role: UserRoleEnum, myId: string) => {
  if (id === myId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot change your own role')
  }
  const result = await prisma.user.update({
    where: {
      id: id,
      isDeleted: false
    },
    data: {
      role: role
    },
  });
  return result;
};

const updateProfileStatus = async (id: string, status: UserStatus, myId: string) => {
  if (id === myId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot change your own status')
  }
  const result = await prisma.user.update({
    where: {
      id,
      isDeleted: false
    },
    data: {
      status
    },
    select: {
      id: true,
      status: true,
      role: true
    },
  })
  return result
}

const isUserExist = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id, isDeleted: false },
    select: {
      id: true
    }
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found')
  }
  return user
}

const toggleIsUserVerified = async (id: string, myId: string) => {
  if (id === myId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot change your own status')
  }
  const result = await prisma.$runCommandRaw({
    update: "users",
    updates: [
      {
        q: { _id: { $oid: id }, isDeleted: false },
        u: [{ $set: { isUserVerified: { $not: "$isUserVerified" } } }],
      },
    ],
    ordered: true,
  });
  return result
};

const expireUserMonthlySubscription = async () => {
  const now = new Date();
  return await prisma.user.updateMany({
    where: {
      expireIn: { lte: now },
      status: "ACTIVE",
      role: "USER",
    },
    data: {
      isUserVerified: false,
    },
  });
};

const deleteUser = async (id: string, myId: string) => {
  if (id === myId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You cannot remove yourself')
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { id, isDeleted: false },
  });
  if (user.role === 'SUPERADMIN') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Super Admin Cannot deletable')
  }
  const deleteUser = await prisma.user.update({
    where: { id },
    data: {
      isDeleted: true,
      status: 'ACTIVE',
      isEmailVerified: false,
      isUserVerified: false,
      emailVerificationToken: '',
    }
  });
  return deleteUser
};

// const createMultipleUser = async ()






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
  deleteUser
};