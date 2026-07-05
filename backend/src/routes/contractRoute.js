import express from 'express';
import {
    listContracts,
    createContract,
    updateContract,
    deleteContract,
} from '../controllers/contractController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router.get('/', listContracts);
router.post('/', requireRole('admin', 'hr'), createContract);
router.put('/:contractId', requireRole('admin', 'hr'), updateContract);
router.delete('/:contractId', requireRole('admin', 'hr'), deleteContract);

export default router;
