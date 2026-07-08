import crypto from 'crypto';
import path from 'path';
import { uploadObject, getPresignedDownloadUrl, deleteObject } from '../libs/r2.js';

const ALLOWED_MODULES = new Set(['documents', 'contracts', 'avatars', 'general']);

// Parse tên file gốc từ R2 key (bỏ prefix `timestamp-hash-`).
// VD: "uploads/1/.../1783521786410-4d7e2240-CV.pdf" → "CV.pdf"
const parseOriginalFilename = (key) => {
    const last = String(key).split('/').pop() || '';
    const m = last.match(/^\d+-[a-f0-9]+-(.+)$/);
    return m ? m[1] : last;
};

const sanitizeFilename = (name) =>
    name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 100);

// POST /api/uploads
// Multipart: field `file`
// Body: { module: 'documents'|'contracts'|'avatars'|'general', employeeId?: number }
export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Thiếu file' });
        }

        const { module = 'general', employeeId } = req.body;
        if (!ALLOWED_MODULES.has(module)) {
            return res.status(400).json({ message: `Module không hợp lệ: ${module}` });
        }

        const timestamp = Date.now();
        const hash = crypto.randomBytes(4).toString('hex');
        const ext = path.extname(req.file.originalname) || '';
        const cleanName = sanitizeFilename(path.basename(req.file.originalname, ext));
        const filename = `${timestamp}-${hash}-${cleanName}${ext}`;

        const parts = ['uploads', String(req.companyId)];
        if (employeeId) parts.push('employees', String(Number(employeeId)));
        parts.push(module, filename);
        const key = parts.join('/');

        await uploadObject(key, req.file.buffer, req.file.mimetype);

        return res.status(201).json({
            key,
            size: req.file.size,
            mimeType: req.file.mimetype,
            originalName: req.file.originalname,
        });
    } catch (error) {
        console.error('Lỗi khi upload file:', error);
        return res.status(500).json({ message: `Upload thất bại: ${error.message}` });
    }
};

// GET /api/uploads/presigned?key=<r2-key>&filename=<optional>&download=1
// Trả về URL tạm 1 giờ. FE có thể truyền `filename` để override tên khi tải.
// Nếu không, BE tự strip prefix `timestamp-hash-` từ key gốc.
// `download=1` → force browser tải xuống thay vì mở trong tab.
export const getDownloadUrl = async (req, res) => {
    try {
        const { key, filename, download } = req.query;
        if (!key) return res.status(400).json({ message: 'Thiếu key' });

        const tenantPrefix = `uploads/${req.companyId}/`;
        if (!String(key).startsWith(tenantPrefix)) {
            return res.status(403).json({ message: 'Key không thuộc tenant này' });
        }

        const displayName = filename ? String(filename) : parseOriginalFilename(key);
        const url = await getPresignedDownloadUrl(String(key), {
            filename: displayName,
            forceDownload: download === '1' || download === 'true',
        });
        return res.status(200).json({ url });
    } catch (error) {
        console.error('Lỗi khi tạo presigned URL:', error);
        return res.status(500).json({ message: 'Không tạo được URL download' });
    }
};

// DELETE /api/uploads?key=<r2-key>
// Dùng khi user xóa document/contract để dọn dẹp R2.
export const deleteFile = async (req, res) => {
    try {
        const { key } = req.query;
        if (!key) return res.status(400).json({ message: 'Thiếu key' });

        const tenantPrefix = `uploads/${req.companyId}/`;
        if (!String(key).startsWith(tenantPrefix)) {
            return res.status(403).json({ message: 'Key không thuộc tenant này' });
        }

        await deleteObject(String(key));
        return res.status(204).end();
    } catch (error) {
        console.error('Lỗi khi xóa file:', error);
        return res.status(500).json({ message: 'Xóa file thất bại' });
    }
};
