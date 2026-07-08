import { Shift } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isForeignKeyViolation, isUniqueViolation, isValidationError, getValidationMessage } from '../utils/dbError.js';

const EDITABLE_FIELDS = ['code', 'name', 'startTime', 'endTime', 'breakMinutes', 'isActive'];

const mapError = (error, res) => {
    if (isUniqueViolation(error)) {
        return res.status(409).json({ message: 'Mã ca đã tồn tại' });
    }
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

export const listShifts = async (req, res) => {
    try {
        const shifts = await Shift.findAll({
            where: scopeToCompany(req),
            order: [['startTime', 'ASC']],
        });
        return res.status(200).json({ shifts });
    } catch (error) {
        console.error('Lỗi lấy danh sách ca:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const getShift = async (req, res) => {
    try {
        const shift = await Shift.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!shift) return res.status(404).json({ message: 'Không tìm thấy ca' });
        return res.status(200).json({ shift });
    } catch (error) {
        console.error('Lỗi lấy ca:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const createShift = async (req, res) => {
    try {
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        if (!data.code || !data.name || !data.startTime || !data.endTime) {
            return res.status(400).json({ message: 'Thiếu code, name, startTime hoặc endTime' });
        }
        const shift = await Shift.create({ ...data, companyId: req.companyId });
        return res.status(201).json({ shift });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi tạo ca:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const updateShift = async (req, res) => {
    try {
        const shift = await Shift.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!shift) return res.status(404).json({ message: 'Không tìm thấy ca' });

        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        await shift.update(data);
        return res.status(200).json({ shift });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi cập nhật ca:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const deleteShift = async (req, res) => {
    try {
        const shift = await Shift.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!shift) return res.status(404).json({ message: 'Không tìm thấy ca' });
        await shift.destroy();
        return res.status(204).end();
    } catch (error) {
        if (isForeignKeyViolation(error)) {
            return res.status(400).json({ message: 'Không thể xóa ca đang được gán cho NV' });
        }
        console.error('Lỗi xóa ca:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
