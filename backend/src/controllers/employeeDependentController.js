import { EmployeeDependent, Employee } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isValidationError, getValidationMessage } from '../utils/dbError.js';

const EDITABLE_FIELDS = [
    'name', 'relationship', 'dateOfBirth', 'identityNumber',
    'taxCode', 'deductionStartDate', 'deductionEndDate', 'note',
];

const findEmployeeInScope = (req) =>
    Employee.findOne({ where: { id: req.params.employeeId, ...scopeToCompany(req) } });

const handleValidation = (error, res) => {
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

export const listDependents = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const items = await EmployeeDependent.findAll({
            where: { employeeId: employee.id, companyId: req.companyId },
            order: [['createdAt', 'DESC']],
        });
        return res.status(200).json({ dependents: items });
    } catch (error) {
        console.error('Lỗi khi lấy người phụ thuộc:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const createDependent = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        if (!data.name || !data.relationship || !data.deductionStartDate) {
            return res.status(400).json({ message: 'Thiếu name, relationship hoặc deductionStartDate' });
        }
        const item = await EmployeeDependent.create({
            ...data,
            companyId: req.companyId,
            employeeId: employee.id,
        });
        return res.status(201).json({ dependent: item });
    } catch (error) {
        const mapped = handleValidation(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi tạo người phụ thuộc:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const updateDependent = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const item = await EmployeeDependent.findOne({
            where: { id: req.params.id, employeeId: employee.id, companyId: req.companyId },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy người phụ thuộc' });
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        await item.update(data);
        return res.status(200).json({ dependent: item });
    } catch (error) {
        const mapped = handleValidation(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi cập nhật người phụ thuộc:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const deleteDependent = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const item = await EmployeeDependent.findOne({
            where: { id: req.params.id, employeeId: employee.id, companyId: req.companyId },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy người phụ thuộc' });
        await item.destroy();
        return res.status(204).end();
    } catch (error) {
        console.error('Lỗi khi xóa người phụ thuộc:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
