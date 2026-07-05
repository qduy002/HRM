import { EmployeeEducation, Employee } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isValidationError, getValidationMessage } from '../utils/dbError.js';

const EDITABLE_FIELDS = ['level', 'school', 'major', 'graduationYear', 'gpa', 'note'];

const findEmployeeInScope = (req) =>
    Employee.findOne({ where: { id: req.params.employeeId, ...scopeToCompany(req) } });

const handleValidation = (error, res) => {
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

export const listEducations = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const items = await EmployeeEducation.findAll({
            where: { employeeId: employee.id, companyId: req.companyId },
            order: [['graduationYear', 'DESC']],
        });
        return res.status(200).json({ educations: items });
    } catch (error) {
        console.error('Lỗi khi lấy học vấn:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const createEducation = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        if (!data.level || !data.school) {
            return res.status(400).json({ message: 'Thiếu level hoặc school' });
        }
        const item = await EmployeeEducation.create({
            ...data,
            companyId: req.companyId,
            employeeId: employee.id,
        });
        return res.status(201).json({ education: item });
    } catch (error) {
        const mapped = handleValidation(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi tạo học vấn:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const updateEducation = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const item = await EmployeeEducation.findOne({
            where: { id: req.params.id, employeeId: employee.id, companyId: req.companyId },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy học vấn' });
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        await item.update(data);
        return res.status(200).json({ education: item });
    } catch (error) {
        const mapped = handleValidation(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi cập nhật học vấn:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const deleteEducation = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const item = await EmployeeEducation.findOne({
            where: { id: req.params.id, employeeId: employee.id, companyId: req.companyId },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy học vấn' });
        await item.destroy();
        return res.status(204).end();
    } catch (error) {
        console.error('Lỗi khi xóa học vấn:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
