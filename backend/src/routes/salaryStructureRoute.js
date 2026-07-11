import express from 'express';
import {
    listSalaryStructures,
    getCurrentSalary,
    createSalaryStructure,
    updateSalaryStructure,
    deleteSalaryStructure,
} from '../controllers/salaryStructureController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/current', getCurrentSalary);
router.get('/', requireRole('admin', 'hr'), listSalaryStructures);
router.post('/', requireRole('admin', 'hr'), createSalaryStructure);
router.put('/:id', requireRole('admin', 'hr'), updateSalaryStructure);
router.delete('/:id', requireRole('admin', 'hr'), deleteSalaryStructure);

export default router;
