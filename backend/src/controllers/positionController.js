import { Position } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isForeignKeyViolation, isUniqueViolation, isValidationError, getValidationMessage } from '../utils/dbError.js';

const EDITABLE_FIELDS = ['code', 'name', 'description', 'isActive'];

const mapError = (error, res) => {
    if (isUniqueViolation(error)) {
        return res.status(409).json({ message: 'Mã chức danh đã tồn tại' });
    }
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

export const listPositions = async (req, res) => {
    try {
        const positions = await Position.findAll({
            where: scopeToCompany(req),
            order: [['name', 'ASC']],
        });
        return res.status(200).json({ positions });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách chức danh:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const getPosition = async (req, res) => {
    try {
        const position = await Position.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!position) return res.status(404).json({ message: 'Không tìm thấy chức danh' });
        return res.status(200).json({ position });
    } catch (error) {
        console.error('Lỗi khi lấy chức danh:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const createPosition = async (req, res) => {
    try {
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        if (!data.name) return res.status(400).json({ message: 'Thiếu tên chức danh' });
        const position = await Position.create({ ...data, companyId: req.companyId });
        return res.status(201).json({ position });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi tạo chức danh:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const updatePosition = async (req, res) => {
    try {
        const position = await Position.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!position) return res.status(404).json({ message: 'Không tìm thấy chức danh' });

        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        await position.update(data);
        return res.status(200).json({ position });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi cập nhật chức danh:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const deletePosition = async (req, res) => {
    try {
        const position = await Position.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!position) return res.status(404).json({ message: 'Không tìm thấy chức danh' });
        await position.destroy();
        return res.status(204).end();
    } catch (error) {
        if (isForeignKeyViolation(error)) {
            return res.status(400).json({
                message: 'Không thể xóa vì chức danh đang được tham chiếu',
            });
        }
        console.error('Lỗi khi xóa chức danh:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
