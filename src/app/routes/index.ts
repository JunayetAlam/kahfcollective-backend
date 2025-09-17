import express from 'express';
import { AuthRouters } from '../modules/Auth/auth.routes';
import { ContentRouters } from '../modules/Content/Content.route';
import { MessageRouters } from '../modules/Messages/message.route';
import { NotificationsRouters } from '../modules/Notification/notification.route';
import { UserRouters } from '../modules/User/user.routes';
const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRouters,
  },
  {
    path: '/users',
    route: UserRouters,
  },
  {
    path: '/messages',
    route: MessageRouters,
  },
  {
    path: '/notifications',
    route: NotificationsRouters,
  },
  {
    path: '/contents',
    route: ContentRouters,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
