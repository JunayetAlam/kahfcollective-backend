import express from 'express';
import { AuthRouters } from '../modules/Auth/auth.routes';
import { ContentRouters } from '../modules/Content/Content.route';
import { UserRouters } from '../modules/User/user.routes';
import { TierRouters } from '../modules/Tier/tier.route';
import { AssetRouters } from '../modules/Asset/asset.route';
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
    path: '/contents',
    route: ContentRouters,
  },
  {
    path: '/tiers',
    route: TierRouters,
  },
  {
    path: '/assets',
    route: AssetRouters,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
