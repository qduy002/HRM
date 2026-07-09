import express from 'express';
import {
    listMyRequests,
    listPendingApproval,
    listAllRequests,
    createRequest,
    managerApprove,
    hrApprove,
    directApprove,
    reject,
    cancel,
} from '../controllers/leaveRequestController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/me', listMyRequests);
router.get('/pending-approval', listPendingApproval);
router.get('/', requireRole('admin', 'hr'), listAllRequests);

router.post('/', createRequest);
router.post('/:id/cancel', cancel);
router.post('/:id/reject', reject);
router.post('/:id/manager-approve', requireRole('admin', 'manager'), managerApprove);
router.post('/:id/hr-approve', requireRole('admin', 'hr'), hrApprove);
router.post('/:id/direct-approve', requireRole('admin'), directApprove);

export default router;
