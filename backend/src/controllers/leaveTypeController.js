import { LeaveType } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isForeignKeyViolation, isUniqueViolation, isValidationError, getValidationMessage } from '../utils/dbError.js';
import { seedDefaultLeaveTypes } from '../utils/leave.js';

const EDITABLE_FIELDS = ['code', 'name', 'daysPerYear', 'isPaid', 'requiresApproval', 'color', 'isActive'];

const mapError = (error, res) => {
    if (isUniqueViolation(error)) {
        return res.status(409).json({ message: 'Mã loại phép đã tồn tại' });
    }
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

export const listLeaveTypes = async (req, res) => {
    try {
        const items = await LeaveType.findAll({
            where: scopeToCompany(req),
            order: [['name', 'ASC']],
        });
        return res.status(200).json({ leaveTypes: items });
    } catch (error) {
        console.error('Lỗi lấy leave_types:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const createLeaveType = async (req, res) => {
    try {
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        if (!data.code || !data.name) return res.status(400).json({ message: 'Thiếu code hoặc name' });
        const item = await LeaveType.create({ ...data, companyId: req.companyId });
        return res.status(201).json({ leaveType: item });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi tạo leave_type:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const updateLeaveType = async (req, res) => {
    try {
        const item = await LeaveType.findOne({ where: { id: req.params.id, ...scopeToCompany(req) } });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy loại phép' });
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        await item.update(data);
        return res.status(200).json({ leaveType: item });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi cập nhật leave_type:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const deleteLeaveType = async (req, res) => {
    try {
        const item = await LeaveType.findOne({ where: { id: req.params.id, ...scopeToCompany(req) } });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy loại phép' });
        await item.destroy();
        return res.status(204).end();
    } catch (error) {
        if (isForeignKeyViolation(error)) {
            return res.status(400).json({ message: 'Không thể xóa loại phép đang có đơn hoặc balance' });
        }
        console.error('Lỗi xóa leave_type:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/leave-types/seed-defaults
// Idempotent — tạo 6 loại phép chuẩn nếu chưa có.
export const seedDefaults = async (req, res) => {
    try {
        const created = await seedDefaultLeaveTypes(req.companyId, null);
        return res.status(200).json({
            created,
            message: created > 0 ? `Đã tạo ${created} loại phép chuẩn.` : 'Đã có sẵn 6 loại phép chuẩn, không tạo mới.',
        });
    } catch (error) {
        console.error('Lỗi seed leave_types:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
