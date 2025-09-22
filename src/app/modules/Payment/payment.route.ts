import express from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentValidation } from './payment.validation';

const router = express.Router();

router.get('/admin', auth('SUPERADMIN'), PaymentController.getAllForAdmin);
router.post(
    '/', 
    auth('USER', 'NOT_CHECK_ADMIN_VERIFICATION'),
    validateRequest.body(PaymentValidation.payment),
     PaymentController.checkoutPayment
    );
router.post('/cancel/:id', auth('ANY', 'NOT_CHECK_ADMIN_VERIFICATION'), PaymentController.cancelPayment);
router.get('/admin/:id', auth('SUPERADMIN'), PaymentController.getSingleForAdmin);
router.get('/', auth('USER'), PaymentController.getAllForUser);
router.get('/:id', auth('USER'), PaymentController.getSingleForUser);
router.get('/session/:stripeSessionId', auth('USER', 'NOT_CHECK_ADMIN_VERIFICATION'), PaymentController.singleTransactionHistoryBySessionId);

export const PaymentRoutes = router;
