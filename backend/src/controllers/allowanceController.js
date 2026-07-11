import { Allowance } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isForeignKeyViolation, isUniqueViolation, isValidationError, getValidationMessage } from '../utils/dbError.js';

const EDITABLE_FIELDS = ['code', 'name', 'defaultAmount', 'isTaxable', 'description', 'isActive'];

const mapError = (error, res) => {
    if (isUniqueViolation(error)) {
        return res.status(409).json({ message: 'Mã phụ cấp đã tồn tại' });
    }
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

export const listAllowances = async (req, res) => {
    try {
        const items = await Allowance.findAll({
            where: scopeToCompany(req),
            order: [['name', 'ASC']],
        });
        return res.status(200).json({ allowances: items });
    } catch (error) {
        console.error('Lỗi list allowances:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const createAllowance = async (req, res) => {
    try {
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        if (!data.code || !data.name) return res.status(400).json({ message: 'Thiếu code hoặc name' });
        const item = await Allowance.create({ ...data, companyId: req.companyId });
        return res.status(201).json({ allowance: item });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi tạo allowance:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const updateAllowance = async (req, res) => {
    try {
        const item = await Allowance.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy phụ cấp' });

        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        await item.update(data);
        return res.status(200).json({ allowance: item });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi cập nhật allowance:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const deleteAllowance = async (req, res) => {
    try {
        const item = await Allowance.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy phụ cấp' });
        await item.destroy();
        return res.status(204).end();
    } catch (error) {
        if (isForeignKeyViolation(error)) {
            return res.status(400).json({ message: 'Không thể xóa vì phụ cấp đang được gán cho NV' });
        }
        console.error('Lỗi xóa allowance:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
