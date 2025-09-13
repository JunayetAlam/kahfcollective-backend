import express from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';

const router = express.Router();

router.get('/admin', auth('SUPERADMIN'), PaymentController.getAllForAdmin);
router.post('/cancel/:id', auth('ANY'), PaymentController.cancelPayment);
router.get('/admin/:id', auth('SUPERADMIN'), PaymentController.getSingleForAdmin);
router.get('/', auth('USER'), PaymentController.getAllForUser);
router.get('/:id', auth('USER'), PaymentController.getSingleForUser);
router.get('/session/:stripeSessionId', auth('USER'), PaymentController.singleTransactionHistoryBySessionId);

export const PaymentRoutes = router;
