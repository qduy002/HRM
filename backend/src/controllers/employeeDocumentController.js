import { EmployeeDocument, Employee } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isValidationError, getValidationMessage } from '../utils/dbError.js';

const EDITABLE_FIELDS = ['type', 'name', 'fileUrl', 'fileSize', 'mimeType'];

const findEmployeeInScope = (req) =>
    Employee.findOne({ where: { id: req.params.employeeId, ...scopeToCompany(req) } });

const handleValidation = (error, res) => {
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

export const listDocuments = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const items = await EmployeeDocument.findAll({
            where: { employeeId: employee.id, companyId: req.companyId },
            order: [['createdAt', 'DESC']],
        });
        return res.status(200).json({ documents: items });
    } catch (error) {
        console.error('Lỗi khi lấy tài liệu:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const createDocument = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        if (!data.type || !data.name || !data.fileUrl) {
            return res.status(400).json({ message: 'Thiếu type, name hoặc fileUrl' });
        }
        const item = await EmployeeDocument.create({
            ...data,
            companyId: req.companyId,
            employeeId: employee.id,
            uploadedBy: req.user?.id ?? null,
        });
        return res.status(201).json({ document: item });
    } catch (error) {
        const mapped = handleValidation(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi tạo tài liệu:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const updateDocument = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const item = await EmployeeDocument.findOne({
            where: { id: req.params.id, employeeId: employee.id, companyId: req.companyId },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        await item.update(data);
        return res.status(200).json({ document: item });
    } catch (error) {
        const mapped = handleValidation(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi cập nhật tài liệu:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const deleteDocument = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const item = await EmployeeDocument.findOne({
            where: { id: req.params.id, employeeId: employee.id, companyId: req.companyId },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });
        await item.destroy();
        return res.status(204).end();
    } catch (error) {
        console.error('Lỗi khi xóa tài liệu:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
