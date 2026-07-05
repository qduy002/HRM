import { EmployeeExperience, Employee } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isValidationError, getValidationMessage } from '../utils/dbError.js';

const EDITABLE_FIELDS = ['companyName', 'position', 'fromDate', 'toDate', 'description'];

const findEmployeeInScope = (req) =>
    Employee.findOne({ where: { id: req.params.employeeId, ...scopeToCompany(req) } });

const handleValidation = (error, res) => {
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

export const listExperiences = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const items = await EmployeeExperience.findAll({
            where: { employeeId: employee.id, companyId: req.companyId },
            order: [['fromDate', 'DESC']],
        });
        return res.status(200).json({ experiences: items });
    } catch (error) {
        console.error('Lỗi khi lấy kinh nghiệm:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const createExperience = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        if (!data.companyName || !data.position) {
            return res.status(400).json({ message: 'Thiếu companyName hoặc position' });
        }
        const item = await EmployeeExperience.create({
            ...data,
            companyId: req.companyId,
            employeeId: employee.id,
        });
        return res.status(201).json({ experience: item });
    } catch (error) {
        const mapped = handleValidation(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi tạo kinh nghiệm:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const updateExperience = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const item = await EmployeeExperience.findOne({
            where: { id: req.params.id, employeeId: employee.id, companyId: req.companyId },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy kinh nghiệm' });
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        await item.update(data);
        return res.status(200).json({ experience: item });
    } catch (error) {
        const mapped = handleValidation(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi cập nhật kinh nghiệm:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const deleteExperience = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const item = await EmployeeExperience.findOne({
            where: { id: req.params.id, employeeId: employee.id, companyId: req.companyId },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy kinh nghiệm' });
        await item.destroy();
        return res.status(204).end();
    } catch (error) {
        console.error('Lỗi khi xóa kinh nghiệm:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
