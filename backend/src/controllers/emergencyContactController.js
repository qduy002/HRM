import { EmergencyContact, Employee } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isValidationError, getValidationMessage } from '../utils/dbError.js';

const EDITABLE_FIELDS = [
    'name', 'relationship', 'phone', 'alternatePhone', 'address', 'priority', 'note',
];

const findEmployeeInScope = (req) =>
    Employee.findOne({ where: { id: req.params.employeeId, ...scopeToCompany(req) } });

const handleValidation = (error, res) => {
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

export const listEmergencyContacts = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const items = await EmergencyContact.findAll({
            where: { employeeId: employee.id, companyId: req.companyId },
            order: [['priority', 'ASC'], ['createdAt', 'DESC']],
        });
        return res.status(200).json({ emergencyContacts: items });
    } catch (error) {
        console.error('Lỗi khi lấy liên hệ khẩn cấp:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const createEmergencyContact = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        if (!data.name || !data.relationship || !data.phone) {
            return res.status(400).json({ message: 'Thiếu name, relationship hoặc phone' });
        }
        const item = await EmergencyContact.create({
            ...data,
            companyId: req.companyId,
            employeeId: employee.id,
        });
        return res.status(201).json({ emergencyContact: item });
    } catch (error) {
        const mapped = handleValidation(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi tạo liên hệ khẩn cấp:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const updateEmergencyContact = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const item = await EmergencyContact.findOne({
            where: { id: req.params.id, employeeId: employee.id, companyId: req.companyId },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy liên hệ khẩn cấp' });
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        await item.update(data);
        return res.status(200).json({ emergencyContact: item });
    } catch (error) {
        const mapped = handleValidation(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi cập nhật liên hệ khẩn cấp:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const deleteEmergencyContact = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const item = await EmergencyContact.findOne({
            where: { id: req.params.id, employeeId: employee.id, companyId: req.companyId },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy liên hệ khẩn cấp' });
        await item.destroy();
        return res.status(204).end();
    } catch (error) {
        console.error('Lỗi khi xóa liên hệ khẩn cấp:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
