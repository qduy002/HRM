import express from 'express';
import {
    listBranches,
    getBranch,
    createBranch,
    updateBranch,
    deleteBranch,
} from '../controllers/branchController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Read: mọi tenant user
router.get('/', listBranches);
router.get('/:id', getBranch);

// Write: admin + hr
router.post('/', requireRole('admin', 'hr'), createBranch);
router.put('/:id', requireRole('admin', 'hr'), updateBranch);
router.delete('/:id', requireRole('admin', 'hr'), deleteBranch);

export default router;
