import express from 'express';
import {
    listLevels,
    getLevel,
    createLevel,
    updateLevel,
    deleteLevel,
} from '../controllers/levelController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', listLevels);
router.get('/:id', getLevel);
router.post('/', requireRole('admin', 'hr'), createLevel);
router.put('/:id', requireRole('admin', 'hr'), updateLevel);
router.delete('/:id', requireRole('admin', 'hr'), deleteLevel);

export default router;
