import express from 'express';
import {
    listDepartments,
    getDepartment,
    createDepartment,
    updateDepartment,
    deleteDepartment,
} from '../controllers/departmentController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', listDepartments);
router.get('/:id', getDepartment);
router.post('/', requireRole('admin', 'hr'), createDepartment);
router.put('/:id', requireRole('admin', 'hr'), updateDepartment);
router.delete('/:id', requireRole('admin', 'hr'), deleteDepartment);

export default router;
