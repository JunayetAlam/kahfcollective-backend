import express from 'express';
import auth from '../../middlewares/auth';
import { UserControllers } from './user.controller';
import { parseBody } from '../../middlewares/parseBody';
import validateRequest from '../../middlewares/validateRequest';
import { userValidation } from './user.validation';
import { upload } from '../../utils/fileUploader';

const router = express.Router();

router.get('/', auth('SUPERADMIN'), UserControllers.getAllUsers);
router.get(
  '/group-users/:groupId',
  auth('SUPERADMIN', 'INSTRUCTOR'),
  UserControllers.getGroupUsers,
);
router.get('/me', auth('ANY'), UserControllers.getMyProfile);

router.get('/:id', auth('ANY'), UserControllers.getUserDetails);

router.put(
  '/update-profile',
  auth('ANY'),
  parseBody,
  validateRequest.body(userValidation.updateUser),
  UserControllers.updateMyProfile,
);

router.put(
  '/update-profile-image',
  auth('ANY'),
  upload.single('file'),
  UserControllers.updateProfileImage,
);

router.put(
  '/user-role/:id',
  auth('SUPERADMIN'),
  validateRequest.body(userValidation.updateUserRoleSchema),
  UserControllers.updateUserRoleStatus,
);

router.put(
  '/user-status/:id',
  auth('SUPERADMIN'),
  validateRequest.body(userValidation.updateUserStatus),
  UserControllers.updateUserStatus,
);
router.put(
  '/toggle-verify-status/:id',
  auth('SUPERADMIN'),
  UserControllers.toggleIsUserVerified,
);
router.delete('/:id', auth('SUPERADMIN'), UserControllers.deleteUser);
router.post(
  '/create-multiple-user',
  auth('SUPERADMIN'),
  validateRequest.body(userValidation.createMultipleUser),
  UserControllers.createMultipleUser,
);

router.put(
  '/update-password/:id',
  auth('SUPERADMIN'),
  validateRequest.body(userValidation.updatePassword),
  UserControllers.updatePassword,
);

export const UserRouters = router;
