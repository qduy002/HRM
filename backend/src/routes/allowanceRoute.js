import express from 'express';
import {
    listAllowances,
    createAllowance,
    updateAllowance,
    deleteAllowance,
} from '../controllers/allowanceController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', listAllowances);
router.post('/', requireRole('admin', 'hr'), createAllowance);
router.put('/:id', requireRole('admin', 'hr'), updateAllowance);
router.delete('/:id', requireRole('admin', 'hr'), deleteAllowance);

export default router;
