import express from 'express';
import {
    listExperiences,
    createExperience,
    updateExperience,
    deleteExperience,
} from '../controllers/employeeExperienceController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router.get('/', listExperiences);
router.post('/', requireRole('admin', 'hr'), createExperience);
router.put('/:id', requireRole('admin', 'hr'), updateExperience);
router.delete('/:id', requireRole('admin', 'hr'), deleteExperience);

export default router;
