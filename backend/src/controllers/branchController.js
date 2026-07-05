import { Branch } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isForeignKeyViolation, isUniqueViolation, isValidationError, getValidationMessage } from '../utils/dbError.js';

const EDITABLE_FIELDS = ['code', 'name', 'address', 'phone', 'email', 'managerId', 'isActive'];

const mapDuplicateError = (error, res) => {
    if (isUniqueViolation(error)) {
        return res.status(409).json({ message: 'Mã chi nhánh đã tồn tại' });
    }
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

export const listBranches = async (req, res) => {
    try {
        const branches = await Branch.findAll({
            where: scopeToCompany(req),
            order: [['name', 'ASC']],
        });
        return res.status(200).json({ branches });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách chi nhánh:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const getBranch = async (req, res) => {
    try {
        const branch = await Branch.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!branch) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
        return res.status(200).json({ branch });
    } catch (error) {
        console.error('Lỗi khi lấy chi nhánh:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const createBranch = async (req, res) => {
    try {
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        if (!data.code || !data.name) {
            return res.status(400).json({ message: 'Thiếu code hoặc name' });
        }
        const branch = await Branch.create({ ...data, companyId: req.companyId });
        return res.status(201).json({ branch });
    } catch (error) {
        const mapped = mapDuplicateError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi tạo chi nhánh:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const updateBranch = async (req, res) => {
    try {
        const branch = await Branch.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!branch) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });

        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        await branch.update(data);
        return res.status(200).json({ branch });
    } catch (error) {
        const mapped = mapDuplicateError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi cập nhật chi nhánh:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const deleteBranch = async (req, res) => {
    try {
        const branch = await Branch.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!branch) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });

        await branch.destroy();
        return res.status(204).end();
    } catch (error) {
        if (isForeignKeyViolation(error)) {
            return res.status(400).json({
                message: 'Không thể xóa vì còn phòng ban đang thuộc chi nhánh này',
            });
        }
        console.error('Lỗi khi xóa chi nhánh:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
