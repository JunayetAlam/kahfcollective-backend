import express from 'express';
import { AuthRouters } from '../modules/Auth/auth.routes';
import { ContentRouters } from '../modules/Content/Content.route';
import { UserRouters } from '../modules/User/user.routes';
import { TierRouters } from '../modules/Tier/tier.route';
import { ForumRouters } from '../modules/Forum/forum.route';
import { CourseRouters } from '../modules/Course/course.route';
import { CourseContentRouters } from '../modules/CourseContent/coursecontent.route';
import { PaymentRoutes } from '../modules/Payment/payment.route';
import { PostRouters } from '../modules/Post/post.route';
import { QuizAnswerRouters } from '../modules/Quiz_Answer/quiz_answer.route';
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
    path: '/forums',
    route: ForumRouters,
  },

  {
    path: '/courses',
    route: CourseRouters,
  },
  {
    path: '/course-contents',
    route: CourseContentRouters,
  },
  {
    path: '/payments',
    route: PaymentRoutes,
  },
  {
    path: '/posts',
    route: PostRouters,
  },
  {
    path: '/answer-quizzes',
    route: QuizAnswerRouters,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
