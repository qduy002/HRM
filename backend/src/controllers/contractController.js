import { Op } from 'sequelize';
import { Contract, Employee } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isUniqueViolation, isValidationError, getValidationMessage } from '../utils/dbError.js';

const EDITABLE_FIELDS = [
    'code', 'type', 'signedDate', 'startDate', 'endDate',
    'basicSalary', 'allowanceAmount', 'workingHoursPerWeek', 'probationEndDate',
    'status', 'terminatedDate', 'terminatedReason', 'fileUrl', 'note',
];

const findEmployeeInScope = (req) =>
    Employee.findOne({
        where: { id: req.params.employeeId, ...scopeToCompany(req) },
    });

const mapError = (error, res) => {
    if (isUniqueViolation(error)) {
        return res.status(409).json({ message: 'Mã hợp đồng đã tồn tại' });
    }
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

export const listContracts = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        const contracts = await Contract.findAll({
            where: { employeeId: employee.id, companyId: req.companyId },
            order: [['signedDate', 'DESC']],
        });
        return res.status(200).json({ contracts });
    } catch (error) {
        console.error('Lỗi khi lấy hợp đồng:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const createContract = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });

        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        const required = ['code', 'type', 'signedDate', 'startDate', 'basicSalary'];
        for (const f of required) {
            if (data[f] == null || data[f] === '') {
                return res.status(400).json({ message: `Thiếu ${f}` });
            }
        }

        // Business rule: chỉ 1 contract 'active' tại 1 thời điểm
        if ((data.status || 'active') === 'active') {
            const existing = await Contract.findOne({
                where: { employeeId: employee.id, companyId: req.companyId, status: 'active' },
            });
            if (existing) {
                return res.status(400).json({
                    message: 'Nhân viên đã có hợp đồng đang hiệu lực. Kết thúc hợp đồng cũ trước khi tạo mới.',
                });
            }
        }

        const contract = await Contract.create({
            ...data,
            companyId: req.companyId,
            employeeId: employee.id,
        });
        return res.status(201).json({ contract });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi tạo hợp đồng:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const updateContract = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });

        const contract = await Contract.findOne({
            where: {
                id: req.params.contractId,
                employeeId: employee.id,
                companyId: req.companyId,
            },
        });
        if (!contract) return res.status(404).json({ message: 'Không tìm thấy hợp đồng' });

        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));

        // Nếu đổi sang 'active' → check không có contract active khác
        if (data.status === 'active' && contract.status !== 'active') {
            const existing = await Contract.findOne({
                where: {
                    employeeId: employee.id,
                    companyId: req.companyId,
                    status: 'active',
                    id: { [Op.ne]: contract.id },
                },
            });
            if (existing) {
                return res.status(400).json({
                    message: 'Đã có hợp đồng khác đang hiệu lực',
                });
            }
        }

        await contract.update(data);
        return res.status(200).json({ contract });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi cập nhật hợp đồng:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const deleteContract = async (req, res) => {
    try {
        const employee = await findEmployeeInScope(req);
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });

        const contract = await Contract.findOne({
            where: {
                id: req.params.contractId,
                employeeId: employee.id,
                companyId: req.companyId,
            },
        });
        if (!contract) return res.status(404).json({ message: 'Không tìm thấy hợp đồng' });
        await contract.destroy();
        return res.status(204).end();
    } catch (error) {
        console.error('Lỗi khi xóa hợp đồng:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
