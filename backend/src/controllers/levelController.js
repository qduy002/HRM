import { Level } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import {
    isForeignKeyViolation,
    isUniqueViolation,
    isValidationError,
    getValidationMessage,
    getConstraintName,
} from '../utils/dbError.js';

const EDITABLE_FIELDS = ['code', 'name', 'rank', 'description'];

const mapError = (error, res) => {
    if (isUniqueViolation(error)) {
        const constraint = getConstraintName(error);
        if (constraint.includes('rank')) {
            return res.status(409).json({ message: 'Thứ tự (rank) đã tồn tại' });
        }
        return res.status(409).json({ message: 'Mã cấp bậc đã tồn tại' });
    }
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

export const listLevels = async (req, res) => {
    try {
        const levels = await Level.findAll({
            where: scopeToCompany(req),
            order: [['rank', 'ASC']],
        });
        return res.status(200).json({ levels });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách cấp bậc:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const getLevel = async (req, res) => {
    try {
        const level = await Level.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!level) return res.status(404).json({ message: 'Không tìm thấy cấp bậc' });
        return res.status(200).json({ level });
    } catch (error) {
        console.error('Lỗi khi lấy cấp bậc:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const createLevel = async (req, res) => {
    try {
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        if (!data.name || data.rank == null) {
            return res.status(400).json({ message: 'Thiếu name hoặc rank' });
        }
        const level = await Level.create({ ...data, companyId: req.companyId });
        return res.status(201).json({ level });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi tạo cấp bậc:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const updateLevel = async (req, res) => {
    try {
        const level = await Level.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!level) return res.status(404).json({ message: 'Không tìm thấy cấp bậc' });

        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        await level.update(data);
        return res.status(200).json({ level });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi cập nhật cấp bậc:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const deleteLevel = async (req, res) => {
    try {
        const level = await Level.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!level) return res.status(404).json({ message: 'Không tìm thấy cấp bậc' });
        await level.destroy();
        return res.status(204).end();
    } catch (error) {
        if (isForeignKeyViolation(error)) {
            return res.status(400).json({
                message: 'Không thể xóa vì cấp bậc đang được tham chiếu',
            });
        }
        console.error('Lỗi khi xóa cấp bậc:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
