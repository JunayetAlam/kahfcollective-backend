import express from 'express';
import { UtilsController } from './utils.controller';
import auth from '../../middlewares/auth';
const router = express.Router();

router.post('/invalidate-full-redis',
    auth('SUPERADMIN', 'INSTRUCTOR'),
    UtilsController.invalidateFullRedis);

export const UtilsRoutes = router;
