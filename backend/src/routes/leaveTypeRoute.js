import express from 'express';
import {
    listLeaveTypes,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
    seedDefaults,
} from '../controllers/leaveTypeController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', listLeaveTypes);
router.post('/seed-defaults', requireRole('admin', 'hr'), seedDefaults);
router.post('/', requireRole('admin', 'hr'), createLeaveType);
router.put('/:id', requireRole('admin', 'hr'), updateLeaveType);
router.delete('/:id', requireRole('admin', 'hr'), deleteLeaveType);

export default router;
