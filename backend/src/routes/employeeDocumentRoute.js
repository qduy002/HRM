import express from 'express';
import {
    listDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
} from '../controllers/employeeDocumentController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router.get('/', listDocuments);
router.post('/', requireRole('admin', 'hr'), createDocument);
router.put('/:id', requireRole('admin', 'hr'), updateDocument);
router.delete('/:id', requireRole('admin', 'hr'), deleteDocument);

export default router;
