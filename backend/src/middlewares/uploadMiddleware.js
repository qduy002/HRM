import multer from 'multer';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME = new Set([
    // PDF
    'application/pdf',
    // Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    // Word/Excel
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
            return cb(new Error(`Loại file không hỗ trợ: ${file.mimetype}`));
        }
        cb(null, true);
    },
});
