import express from 'express';
import {
    listEmployeeAllowances,
    getCurrentEmployeeAllowances,
    createEmployeeAllowance,
    updateEmployeeAllowance,
    deleteEmployeeAllowance,
} from '../controllers/employeeAllowanceController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/current', getCurrentEmployeeAllowances);
router.get('/', listEmployeeAllowances);
router.post('/', requireRole('admin', 'hr'), createEmployeeAllowance);
router.put('/:id', requireRole('admin', 'hr'), updateEmployeeAllowance);
router.delete('/:id', requireRole('admin', 'hr'), deleteEmployeeAllowance);

export default router;
