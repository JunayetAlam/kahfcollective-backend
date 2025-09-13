import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { AuthControllers } from './auth.controller';
import { authValidation } from './auth.validation';
import auth from '../../middlewares/auth';
const router = express.Router();

router.post(
  '/login',
  validateRequest.body(authValidation.loginUser),
  AuthControllers.login,
);

router.post(
  '/login-with-otp',
  validateRequest.body(authValidation.loginUser),
  AuthControllers.loginWithOtp,
);

router.post(
  '/register',
  validateRequest.body(authValidation.registerUser),
  AuthControllers.register,
);

router.post(
  '/register-with-otp',
  validateRequest.body(authValidation.registerUser),
  AuthControllers.registerWithOtp,
);

router.post(
  '/verify-email',
  validateRequest.body(authValidation.verifyTokenValidationSchema),
  AuthControllers.verifyEmail,
);

router.post(
  '/verify-email-with-otp',
  validateRequest.body(authValidation.verifyOtpValidationSchema),
  AuthControllers.verifyEmailWithOtp,
);

router.post(
  '/resend-verification',
  validateRequest.body(authValidation.forgetPasswordValidationSchema),
  AuthControllers.resendVerification,
);

router.post(
  '/resend-verification-with-otp',
  validateRequest.body(authValidation.forgetPasswordValidationSchema),
  AuthControllers.resendVerificationWithOtp,
);

router.post(
  '/change-password',
  auth('USER', 'SUPERADMIN'),
  AuthControllers.changePassword,
);

router.post(
  '/forget-password',
  validateRequest.body(authValidation.forgetPasswordValidationSchema),
  AuthControllers.forgetPassword,
);

router.post(
  '/forget-password/verify-otp',
  validateRequest.body(authValidation.verifyOtpValidationSchema),
  AuthControllers.verifyForgotPassOtp,
);

router.post(
  '/reset-password',
  validateRequest.body(authValidation.resetPasswordValidationSchema),
  AuthControllers.resetPassword,
);

export const AuthRouters = router;