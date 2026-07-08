import express from 'express';
import {
    checkIn,
    checkOut,
    getMyToday,
    listMyAttendances,
    listAttendances,
    markAbsent,
    updateAttendance,
} from '../controllers/attendanceController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Employee routes
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/today', getMyToday);
router.get('/me', listMyAttendances);

// HR routes
router.get('/', requireRole('admin', 'hr'), listAttendances);
router.post('/mark-absent', requireRole('admin', 'hr'), markAbsent);
router.put('/:id', requireRole('admin', 'hr'), updateAttendance);

export default router;
