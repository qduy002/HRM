import express from 'express';
import {
    listEmergencyContacts,
    createEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
} from '../controllers/emergencyContactController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router.get('/', listEmergencyContacts);
router.post('/', requireRole('admin', 'hr'), createEmergencyContact);
router.put('/:id', requireRole('admin', 'hr'), updateEmergencyContact);
router.delete('/:id', requireRole('admin', 'hr'), deleteEmergencyContact);

export default router;
