import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { AuthControllers } from './auth.controller';
import { authValidation } from './auth.validation';
import auth from '../../middlewares/auth';

const router = express.Router();

router.post(
  '/login',
  validateRequest.body(authValidation.loginUser),
  AuthControllers.loginUser,
);

router.post(
  '/register',
  validateRequest.body(authValidation.registerUser),
  AuthControllers.registerUser,
);

router.post(
  '/verify-email',
  validateRequest.body(authValidation.verifyEmailValidationSchema),
  AuthControllers.verifyEmail,
);

router.post(
  '/resend-verification-email',
  validateRequest.body(authValidation.resendVerificationEmailValidationSchema),
  AuthControllers.resendUserVerificationEmail,
);

router.post(
  '/change-password',
  auth('ANY'),
  validateRequest.body(authValidation.changePasswordValidationSchema),
  AuthControllers.changePassword,
);

router.post(
  '/forget-password',
  validateRequest.body(authValidation.forgetPasswordValidationSchema),
  AuthControllers.forgetPassword,
);

router.post(
  '/reset-password',
  validateRequest.body(authValidation.resetPasswordValidationSchema),
  AuthControllers.resetPassword,
);

export const AuthRouters = router;