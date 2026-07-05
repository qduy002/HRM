import express from 'express';
import {
    listEducations,
    createEducation,
    updateEducation,
    deleteEducation,
} from '../controllers/employeeEducationController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router.get('/', listEducations);
router.post('/', requireRole('admin', 'hr'), createEducation);
router.put('/:id', requireRole('admin', 'hr'), updateEducation);
router.delete('/:id', requireRole('admin', 'hr'), deleteEducation);

export default router;
