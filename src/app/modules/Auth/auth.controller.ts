import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './auth.service';

const loginUser = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUserFromDB(res, req.body);
  if (result) {
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'User logged in successfully',
      data: result,
    });
  }
  // If result is undefined, response is already sent by service (verification email case)
});

const registerUser = catchAsync(async (req, res) => {
  const result = await AuthServices.registerUserIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'User registered successfully. Please check your email for the verification link.',
    data: result,
  });
});

const verifyEmail = catchAsync(async (req, res) => {
  const result = await AuthServices.verifyEmail(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Email verified successfully',
    data: result,
  });
});

const resendUserVerificationEmail = catchAsync(async (req, res) => {
  const { email } = req.body;
  const result = await AuthServices.resendUserVerificationEmail(email);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Verification email sent successfully',
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
    message: 'Password reset link has been sent to your email!',
    data: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const result = await AuthServices.resetPassword(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Password reset successfully',
    data: result,
  });
});

export const AuthControllers = {
  loginUser,
  registerUser,
  verifyEmail,
  resendUserVerificationEmail,
  changePassword,
  forgetPassword,
  resetPassword,
};