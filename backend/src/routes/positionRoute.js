import express from 'express';
import {
    listPositions,
    getPosition,
    createPosition,
    updatePosition,
    deletePosition,
} from '../controllers/positionController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', listPositions);
router.get('/:id', getPosition);
router.post('/', requireRole('admin', 'hr'), createPosition);
router.put('/:id', requireRole('admin', 'hr'), updatePosition);
router.delete('/:id', requireRole('admin', 'hr'), deletePosition);

export default router;
