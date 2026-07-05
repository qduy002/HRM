import express from 'express';
import { getMe, getAllUsers } from '../controllers/userController.js';
import { requireRole } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';

const router = express.Router();

// /me — dùng cho cả super_admin lẫn tenant users
router.get('/me', getMe);

// Các route dưới đây bắt buộc là tenant user
router.use(tenantMiddleware);
router.get('/', requireRole('admin', 'hr'), getAllUsers);

export default router;
