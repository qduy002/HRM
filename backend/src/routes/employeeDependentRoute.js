import express from 'express';
import {
    listDependents,
    createDependent,
    updateDependent,
    deleteDependent,
} from '../controllers/employeeDependentController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router.get('/', listDependents);
router.post('/', requireRole('admin', 'hr'), createDependent);
router.put('/:id', requireRole('admin', 'hr'), updateDependent);
router.delete('/:id', requireRole('admin', 'hr'), deleteDependent);

export default router;
