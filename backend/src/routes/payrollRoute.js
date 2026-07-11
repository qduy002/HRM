import express from 'express';
import {
    generatePayrolls,
    previewPayroll,
    listPayrolls,
    getPayroll,
    getMyPayslip,
    finalizePayroll,
    unlockPayroll,
    markPaid,
    exportPayrollCSV,
} from '../controllers/payrollController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/my', getMyPayslip);
router.get('/export', requireRole('admin', 'hr'), exportPayrollCSV);
router.get('/', requireRole('admin', 'hr'), listPayrolls);
router.get('/:id', getPayroll); // NV có thể view detail của payslip mình

router.post('/generate', requireRole('admin', 'hr'), generatePayrolls);
router.post('/preview', requireRole('admin', 'hr'), previewPayroll);
router.post('/:id/finalize', requireRole('admin', 'hr'), finalizePayroll);
router.post('/:id/unlock', requireRole('admin', 'hr'), unlockPayroll);
router.post('/:id/mark-paid', requireRole('admin', 'hr'), markPaid);

export default router;
