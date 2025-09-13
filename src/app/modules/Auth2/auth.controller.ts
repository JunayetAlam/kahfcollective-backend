import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './auth.service';

const login = catchAsync(async (req, res) => {
  const result = await AuthServices.loginFromDB(res, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User logged in successfully',
    data: result,
  });
});

const loginWithOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.loginWithOtpFromDB(res, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User logged in successfully',
    data: result,
  });
});

const register = catchAsync(async (req, res) => {
  const result = await AuthServices.registerIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'User Created Successfully',
    data: result,
  });
});

const registerWithOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.registerWithOtpIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'User Created Successfully',
    data: result,
  });
});

const verifyEmail = catchAsync(async (req, res) => {
  const result = await AuthServices.verifyEmail(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Email Verified Successfully',
    data: result,
  });
});

const verifyEmailWithOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.verifyEmailWithOtp(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Email Verified Successfully',
    data: result,
  });
});

const resendVerification = catchAsync(async (req, res) => {
  const email = req.body.email;
  const result = await AuthServices.resendVerification(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Verification link sent successfully',
    data: result,
  });
});

const resendVerificationWithOtp = catchAsync(async (req, res) => {
  const email = req.body.email;
  const result = await AuthServices.resendVerificationWithOtp(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Verification OTP sent successfully',
    data: result,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await AuthServices.changePassword(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Password changed successfully',
    data: result,
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  const result = await AuthServices.forgetPassword(req.body.email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Verification OTP has sent to email',
    data: result,
  });
});

const verifyForgotPassOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.verifyForgotPassOtp(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'OTP has been verified',
    data: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const token = req.headers.authorization as string;
  const result = await AuthServices.resetPassword(req.body, token);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Password changed successfully',
    data: result,
  });
});

export const AuthControllers = {
  login,
  loginWithOtp,
  register,
  registerWithOtp,
  verifyEmail,
  verifyEmailWithOtp,
  resendVerification,
  resendVerificationWithOtp,
  changePassword,
  forgetPassword,
  verifyForgotPassOtp,
  resetPassword
};