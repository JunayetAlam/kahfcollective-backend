import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import config from '../../../config';
import AppError from '../../errors/AppError';
import { verification } from '../../utils/generateEmailVerificationLink';
import { generateToken } from '../../utils/generateToken';
import {
  generateOTP,
  getOtpStatusMessage,
  otpExpiryTime,
} from '../../utils/otp';
import { insecurePrisma, prisma } from '../../utils/prisma';
import { sendLinkViaMail, sendOtpViaMail } from '../../utils/sendMail';
import sendResponse from '../../utils/sendResponse';
import { verifyOtp } from '../../utils/verifyOtp';
import { verifyToken } from '../../utils/verifyToken';

const loginWithOtpFromDB = async (
  res: Response,
  payload: {
    email: string;
    password: string;
  },
) => {
  const userData = await insecurePrisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });
  const isCorrectPassword: Boolean = await bcrypt.compare(
    payload.password,
    userData.password,
  );

  if (!isCorrectPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password incorrect');
  }

  if (userData.role !== 'SUPERADMIN' && !userData.isEmailVerified) {
    const otp = generateOTP();

    await prisma.user.update({
      where: { email: userData.email },
      data: {
        otp,
        otpExpiry: otpExpiryTime(),
      },
    });
    sendOtpViaMail(payload.email, otp);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: ' Please check your email for the verification OTP.',
      data: '',
    });
  } else {
    const accessToken = await generateToken(
      {
        id: userData.id,
        name: userData.fullName,
        email: userData.email,
        role: userData.role,
      },
      config.jwt.access_secret as Secret,
      config.jwt.access_expires_in as SignOptions['expiresIn'],
    );
    return {
      id: userData.id,
      name: userData.fullName,
      email: userData.email,
      role: userData.role,
      accessToken: accessToken,
    };
  }
};

const loginFromDB = async (
  res: Response,
  payload: {
    email: string;
    password: string;
  },
) => {
  const userData = await insecurePrisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });
  const isCorrectPassword: Boolean = await bcrypt.compare(
    payload.password,
    userData.password,
  );

  if (!isCorrectPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password incorrect');
  }

  if (userData.role !== 'SUPERADMIN' && !userData.isEmailVerified) {
    const verificationToken = generateToken(
      {
        id: 'email-verification-token',
        name: userData.fullName,
        email: userData.email,
        role: userData.role,
      },
      config.jwt.access_secret as Secret,
      config.jwt.access_expires_in as SignOptions['expiresIn'],
    );

    const link = `${config.base_url_client}/auth/verifyMail?token=${verificationToken}`;

    await prisma.user.update({
      where: { email: userData.email },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpires: otpExpiryTime(),
      },
    });
    sendLinkViaMail(payload.email, link);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: ' Please check your email for the verification link.',
      data: '',
    });
  } else {
    const accessToken = await generateToken(
      {
        id: userData.id,
        name: userData.fullName,
        email: userData.email,
        role: userData.role,
      },
      config.jwt.access_secret as Secret,
      config.jwt.access_expires_in as SignOptions['expiresIn'],
    );
    return {
      id: userData.id,
      name: userData.fullName,
      email: userData.email,
      role: userData.role,
      accessToken: accessToken,
    };
  }
};

const registerWithOtpIntoDB = async (payload: User) => {
  const hashedPassword: string = await bcrypt.hash(payload.password, 12);

  const isUserExistWithTheGmail = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (isUserExistWithTheGmail?.id) {
    throw new AppError(httpStatus.CONFLICT, 'User already exists');
  }

  const otp = generateOTP();
  const userData: User = {
    ...payload,
    password: hashedPassword,
    otp,
    otpExpiry: otpExpiryTime(),
  };

  const newUser = await prisma.user.create({
    data: userData,
  });

  try {
    sendOtpViaMail(newUser.email, otp);
  } catch {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send OTP email',
    );
  }

  return 'Please check mail to verify your email';
};

const registerIntoDB = async (payload: User) => {
  const hashedPassword: string = await bcrypt.hash(payload.password, 12);

  const isUserExistWithTheGmail = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (isUserExistWithTheGmail?.id) {
    throw new AppError(httpStatus.CONFLICT, 'User already exists');
  }

  const verificationToken = generateToken(
    {
      id: 'email-verification-token',
      name: payload.fullName,
      email: payload.email,
      role: payload.role,
    },
    config.jwt.access_secret as Secret,
    config.jwt.access_expires_in as SignOptions['expiresIn'],
  );

  const userData: User = {
    ...payload,
    password: hashedPassword,
    emailVerificationToken: verificationToken,
  };

  const newUser = await prisma.user.create({
    data: userData,
  });

  try {
    const link = `${config.base_url_client}/auth/verifyMail?token=${verificationToken}`;
    sendLinkViaMail(newUser.email, link);
  } catch {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send verification link',
    );
  }

  return 'Please check mail to verify your email';
};

const verifyEmailWithOtp = async (payload: { email: string; otp: string }) => {
  const { userData } = await verifyOtp(payload);
  await prisma.user.update({
    where: {
      email: userData.email,
    },
    data: {
      otp: null,
      otpExpiry: null,
      isEmailVerified: true,
      emailVerificationToken: verification.generateEmailVerificationToken(),
      emailVerificationTokenExpires: new Date(Date.now() + 3600 * 1000),
    },
    select: {
      id: true,
    },
  });

  const accessToken = await generateToken(
    {
      id: userData.id,
      name: userData.fullName,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.access_secret as Secret,
    config.jwt.access_expires_in as SignOptions['expiresIn'],
  );
  return {
    id: userData.id,
    name: userData.fullName,
    email: userData.email,
    role: userData.role,
    accessToken: accessToken,
  };
};

const verifyEmail = async (payload: { token: string }) => {
  const verifyUserToken = verifyToken(
    payload.token,
    config.jwt.access_secret as Secret,
  );

  if (verifyUserToken.id !== 'email-verification-token') {
    throw new AppError(httpStatus.FORBIDDEN, 'Invalid Token');
  }

  const user = await insecurePrisma.user.findUniqueOrThrow({
    where: {
      email: verifyUserToken.email,
      role: verifyUserToken.role,
    },
  });
  if (payload.token !== user.emailVerificationToken) {
    throw new AppError(httpStatus.FORBIDDEN, 'Invalid Token');
  }
  if (user.status === 'BLOCKED') {
    throw new AppError(httpStatus.FORBIDDEN, 'You are blocked!');
  }
  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      isEmailVerified: true,
    },
  });
  const accessToken = generateToken(
    {
      id: user.id,
      name: user.fullName,
      email: user.email,
      role: user.role,
    },
    config.jwt.access_secret as Secret,
    config.jwt.access_expires_in as SignOptions['expiresIn'],
  );
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    role: user.role,
    accessToken: accessToken,
  };
};

const resendVerificationWithOtp = async (email: string) => {
  const user = await insecurePrisma.user.findFirstOrThrow({
    where: {
      email,
    },
  });

  if (user.status === 'BLOCKED') {
    throw new AppError(httpStatus.FORBIDDEN, 'User is blocked');
  }

  if (user.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email is already verified');
  }

  const otp = generateOTP();
  const expiry = otpExpiryTime();

  await prisma.user.update({
    where: { email },
    data: {
      otp,
      otpExpiry: expiry,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
    },
  });

  try {
    await sendOtpViaMail(email, otp);
  } catch {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send OTP email',
    );
  }

  return {
    message: 'Verification OTP sent successfully. Please check your inbox.',
  };
};

const resendVerification = async (email: string) => {
  const user = await insecurePrisma.user.findFirstOrThrow({
    where: {
      email,
    },
  });

  if (user.status === 'BLOCKED') {
    throw new AppError(httpStatus.FORBIDDEN, 'User is blocked');
  }

  if (user.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email is already verified');
  }

  const verificationToken = generateToken(
    {
      id: 'email-verification-token',
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
    },
    config.jwt.access_secret as Secret,
    config.jwt.access_expires_in as SignOptions['expiresIn'],
  );

  const link = `${config.base_url_client}/auth/verifyMail?token=${verificationToken}`;

  await prisma.user.update({
    where: { email },
    data: {
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpires: otpExpiryTime(),
      otp: null,
      otpExpiry: null,
    },
  });

  try {
    await sendLinkViaMail(email, link);
  } catch {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send verification link',
    );
  }

  return {
    message: 'Verification link sent successfully. Please check your inbox.',
  };
};

const changePassword = async (user: any, payload: any) => {
  const userData = await insecurePrisma.user.findUniqueOrThrow({
    where: {
      email: user.email,
      status: 'ACTIVE',
    },
  });

  const isCorrectPassword: boolean = await bcrypt.compare(
    payload.oldPassword,
    userData.password,
  );

  if (!isCorrectPassword) {
    throw new Error('Password incorrect!');
  }

  const hashedPassword: string = await bcrypt.hash(payload.newPassword, 12);

  await prisma.user.update({
    where: {
      id: userData.id,
    },
    data: {
      password: hashedPassword,
    },
  });

  return {
    message: 'Password changed successfully!',
  };
};

const forgetPassword = async (email: string) => {
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email,
    },
    select: {
      status: true,
      id: true,
      otpExpiry: true,
      otp: true,
    },
  });

  if (userData.status === 'BLOCKED') {
    throw new AppError(httpStatus.BAD_REQUEST, 'User has blocked');
  }
  if (
    userData.otp &&
    userData.otpExpiry &&
    new Date(userData.otpExpiry).getTime() > Date.now()
  ) {
    const message = getOtpStatusMessage(userData.otpExpiry);
    throw new AppError(httpStatus.CONFLICT, message);
  }
  const otp = generateOTP();
  const expireTime = otpExpiryTime();
  try {
    await prisma.$transaction(async tx => {
      await tx.user.update({
        where: { email },
        data: {
          otp,
          otpExpiry: expireTime,
        },
      });
      try {
        await sendOtpViaMail(email, otp);
      } catch (emailErr) {
        await tx.user.update({
          where: { email },
          data: {
            otp: null,
            otpExpiry: null,
          },
        });
        throw new AppError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Failed to send OTP email',
        );
      }
    });
  } catch (error) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send OTP');
  }
};

const verifyForgotPassOtp = async (payload: { email: string; otp: string }) => {
  const { userData } = await verifyOtp(payload);

  const resetToken = generateToken(
    {
      id: userData.id,
      name: userData.fullName,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.access_secret as Secret,
    '600s',
  );

  const resetUILink = `${config.base_url_client}/auth/reset-password?email=${userData.email}&token=${resetToken}`;

  await prisma.user.update({
    where: {
      email: payload.email,
    },
    data: {
      otp: null,
      otpExpiry: null,
    },
  });

  return { resetUILink, expireInMinutes: 5 };
};

const resetPassword = async (
  payload: {
    email: string;
    newPassword: string;
  },
  token: string,
) => {
  if (!token) {
    throw new AppError(httpStatus.FORBIDDEN, 'Token is missing!');
  }

  const userData = await prisma.user.findFirstOrThrow({
    where: {
      email: payload.email,
    },
  });

  if (userData.status === 'BLOCKED') {
    throw new AppError(httpStatus.FORBIDDEN, 'User has blocked');
  }

  const decoded = jwt.verify(
    token,
    config.jwt.access_secret as string,
  ) as JwtPayload;

  const { email, role } = decoded;
  if (email !== payload.email) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are forbidden!');
  }

  if (!decoded || !decoded.exp) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid token');
  }

  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await prisma.user.update({
    where: {
      email: email,
    },
    data: {
      password: newHashedPassword,
    },
  });
};

export const AuthServices = {
  loginWithOtpFromDB,
  loginFromDB,
  registerWithOtpIntoDB,
  registerIntoDB,
  verifyEmailWithOtp,
  verifyEmail,
  resendVerificationWithOtp,
  resendVerification,
  changePassword,
  forgetPassword,
  verifyForgotPassOtp,
  resetPassword,
};
