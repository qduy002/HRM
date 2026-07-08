import express from 'express';
import {
    listMyBalances,
    listBalances,
    createBalance,
    updateBalance,
} from '../controllers/leaveBalanceController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/me', listMyBalances);
router.get('/', requireRole('admin', 'hr'), listBalances);
router.post('/', requireRole('admin', 'hr'), createBalance);
router.put('/:id', requireRole('admin', 'hr'), updateBalance);

export default router;
