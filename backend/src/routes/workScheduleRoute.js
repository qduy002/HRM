import express from 'express';
import {
    listWorkSchedules,
    createWorkSchedule,
    updateWorkSchedule,
    deleteWorkSchedule,
} from '../controllers/workScheduleController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', listWorkSchedules);
router.post('/', requireRole('admin', 'hr'), createWorkSchedule);
router.put('/:id', requireRole('admin', 'hr'), updateWorkSchedule);
router.delete('/:id', requireRole('admin', 'hr'), deleteWorkSchedule);

export default router;
