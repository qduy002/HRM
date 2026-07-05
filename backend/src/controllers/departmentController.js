import { Department, Branch } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isForeignKeyViolation, isUniqueViolation, isValidationError, getValidationMessage } from '../utils/dbError.js';

const EDITABLE_FIELDS = [
    'branchId',
    'parentDepartmentId',
    'code',
    'name',
    'description',
    'managerId',
    'isActive',
];

const validateBranchOwnership = async (branchId, companyId) => {
    const branch = await Branch.findOne({ where: { id: branchId, companyId } });
    return !!branch;
};

const validateParentOwnership = async (parentId, companyId) => {
    if (parentId == null) return true;
    const parent = await Department.findOne({ where: { id: parentId, companyId } });
    return !!parent;
};

const mapError = (error, res) => {
    if (isUniqueViolation(error)) {
        return res.status(409).json({ message: 'Mã phòng ban đã tồn tại' });
    }
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

export const listDepartments = async (req, res) => {
    try {
        const departments = await Department.findAll({
            where: scopeToCompany(req),
            include: [
                { model: Branch, attributes: ['id', 'code', 'name'] },
                { model: Department, as: 'parent', attributes: ['id', 'code', 'name'] },
            ],
            order: [['name', 'ASC']],
        });
        return res.status(200).json({ departments });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách phòng ban:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const getDepartment = async (req, res) => {
    try {
        const department = await Department.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
            include: [
                { model: Branch, attributes: ['id', 'code', 'name'] },
                { model: Department, as: 'parent', attributes: ['id', 'code', 'name'] },
                { model: Department, as: 'children', attributes: ['id', 'code', 'name'] },
            ],
        });
        if (!department) return res.status(404).json({ message: 'Không tìm thấy phòng ban' });
        return res.status(200).json({ department });
    } catch (error) {
        console.error('Lỗi khi lấy phòng ban:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const createDepartment = async (req, res) => {
    try {
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        if (!data.branchId || !data.code || !data.name) {
            return res.status(400).json({ message: 'Thiếu branchId, code hoặc name' });
        }

        if (!(await validateBranchOwnership(data.branchId, req.companyId))) {
            return res.status(400).json({ message: 'Chi nhánh không tồn tại trong công ty' });
        }
        if (!(await validateParentOwnership(data.parentDepartmentId, req.companyId))) {
            return res.status(400).json({ message: 'Phòng ban cha không tồn tại trong công ty' });
        }

        const department = await Department.create({ ...data, companyId: req.companyId });
        return res.status(201).json({ department });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi tạo phòng ban:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const updateDepartment = async (req, res) => {
    try {
        const department = await Department.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!department) return res.status(404).json({ message: 'Không tìm thấy phòng ban' });

        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));

        if (data.branchId && !(await validateBranchOwnership(data.branchId, req.companyId))) {
            return res.status(400).json({ message: 'Chi nhánh không tồn tại trong công ty' });
        }
        if ('parentDepartmentId' in data) {
            if (data.parentDepartmentId === department.id) {
                return res.status(400).json({ message: 'Không thể chọn chính nó làm phòng ban cha' });
            }
            if (!(await validateParentOwnership(data.parentDepartmentId, req.companyId))) {
                return res.status(400).json({ message: 'Phòng ban cha không tồn tại trong công ty' });
            }
        }

        await department.update(data);
        return res.status(200).json({ department });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi cập nhật phòng ban:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const deleteDepartment = async (req, res) => {
    try {
        const department = await Department.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!department) return res.status(404).json({ message: 'Không tìm thấy phòng ban' });

        await department.destroy();
        return res.status(204).end();
    } catch (error) {
        if (isForeignKeyViolation(error)) {
            return res.status(400).json({
                message: 'Không thể xóa vì phòng ban đang được tham chiếu',
            });
        }
        console.error('Lỗi khi xóa phòng ban:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
