import express from 'express';
import { upload } from '../middlewares/uploadMiddleware.js';
import { uploadFile, getDownloadUrl, deleteFile } from '../controllers/uploadController.js';

const router = express.Router();

router.post('/', upload.single('file'), uploadFile);
router.get('/presigned', getDownloadUrl);
router.delete('/', deleteFile);

export default router;
