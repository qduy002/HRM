import express from 'express';
import {
    listShifts,
    getShift,
    createShift,
    updateShift,
    deleteShift,
} from '../controllers/shiftController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', listShifts);
router.get('/:id', getShift);
router.post('/', requireRole('admin', 'hr'), createShift);
router.put('/:id', requireRole('admin', 'hr'), updateShift);
router.delete('/:id', requireRole('admin', 'hr'), deleteShift);

export default router;
