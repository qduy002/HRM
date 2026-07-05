import express from 'express';
import {
    listEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    grantAccount,
    changePosition,
    listPositionHistory,
} from '../controllers/employeeController.js';
import { requireRole } from '../middlewares/authMiddleware.js';
import contractRoute from './contractRoute.js';
import employeeDependentRoute from './employeeDependentRoute.js';
import emergencyContactRoute from './emergencyContactRoute.js';
import employeeEducationRoute from './employeeEducationRoute.js';
import employeeExperienceRoute from './employeeExperienceRoute.js';
import employeeDocumentRoute from './employeeDocumentRoute.js';

const router = express.Router();

// Employee CRUD
router.get('/', listEmployees);
router.get('/:id', getEmployee);
router.post('/', requireRole('admin', 'hr'), createEmployee);
router.put('/:id', requireRole('admin', 'hr'), updateEmployee);
router.delete('/:id', requireRole('admin', 'hr'), deleteEmployee);

// Employee actions
router.post('/:id/grant-account', requireRole('admin', 'hr'), grantAccount);
router.post('/:id/change-position', requireRole('admin', 'hr'), changePosition);
router.get('/:id/positions', listPositionHistory);

// Nested sub-resources — dùng mergeParams để inherit :employeeId
router.use('/:employeeId/contracts', contractRoute);
router.use('/:employeeId/dependents', employeeDependentRoute);
router.use('/:employeeId/emergency-contacts', emergencyContactRoute);
router.use('/:employeeId/educations', employeeEducationRoute);
router.use('/:employeeId/experiences', employeeExperienceRoute);
router.use('/:employeeId/documents', employeeDocumentRoute);

export default router;
