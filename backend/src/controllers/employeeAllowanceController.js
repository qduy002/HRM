import { Op } from 'sequelize';
import { Allowance, Employee, EmployeeAllowance } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isValidationError, getValidationMessage } from '../utils/dbError.js';

const EDITABLE_FIELDS = ['amount', 'effectiveFrom', 'effectiveTo', 'note'];

// GET /api/employee-allowances?employeeId=
export const listEmployeeAllowances = async (req, res) => {
    try {
        const where = { ...scopeToCompany(req) };
        if (req.query.employeeId) where.employeeId = Number(req.query.employeeId);

        const items = await EmployeeAllowance.findAll({
            where,
            include: [
                { model: Employee, attributes: ['id', 'code', 'displayName'] },
                { model: Allowance, attributes: ['id', 'code', 'name', 'defaultAmount', 'isTaxable'] },
            ],
            order: [['effectiveFrom', 'DESC']],
        });
        return res.status(200).json({ employeeAllowances: items });
    } catch (error) {
        console.error('Lỗi list employee allowances:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/employee-allowances/current?employeeId=X
// Trả tất cả allowances active hiện tại của NV.
export const getCurrentEmployeeAllowances = async (req, res) => {
    try {
        const employeeId = Number(req.query.employeeId);
        if (!employeeId) return res.status(400).json({ message: 'Thiếu employeeId' });
        const today = new Date().toISOString().split('T')[0];

        const items = await EmployeeAllowance.findAll({
            where: {
                companyId: req.companyId,
                employeeId,
                effectiveFrom: { [Op.lte]: today },
                [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: today } }],
            },
            include: [{ model: Allowance, attributes: ['id', 'code', 'name', 'isTaxable'] }],
        });
        return res.status(200).json({ employeeAllowances: items });
    } catch (error) {
        console.error('Lỗi get current employee allowances:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/employee-allowances
export const createEmployeeAllowance = async (req, res) => {
    try {
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        const employeeId = Number(req.body.employeeId);
        const allowanceId = Number(req.body.allowanceId);
        if (!employeeId || !allowanceId || !data.amount || !data.effectiveFrom) {
            return res.status(400).json({ message: 'Thiếu employeeId, allowanceId, amount hoặc effectiveFrom' });
        }

        const [emp, allowance] = await Promise.all([
            Employee.findOne({ where: { id: employeeId, companyId: req.companyId } }),
            Allowance.findOne({ where: { id: allowanceId, companyId: req.companyId } }),
        ]);
        if (!emp) return res.status(400).json({ message: 'Nhân viên không tồn tại' });
        if (!allowance) return res.status(400).json({ message: 'Phụ cấp không tồn tại' });

        const item = await EmployeeAllowance.create({
            ...data,
            companyId: req.companyId,
            employeeId,
            allowanceId,
        });
        return res.status(201).json({ employeeAllowance: item });
    } catch (error) {
        if (isValidationError(error)) {
            return res.status(400).json({ message: getValidationMessage(error) });
        }
        console.error('Lỗi tạo employee allowance:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// PUT /api/employee-allowances/:id
export const updateEmployeeAllowance = async (req, res) => {
    try {
        const item = await EmployeeAllowance.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy record' });

        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        await item.update(data);
        return res.status(200).json({ employeeAllowance: item });
    } catch (error) {
        if (isValidationError(error)) {
            return res.status(400).json({ message: getValidationMessage(error) });
        }
        console.error('Lỗi cập nhật employee allowance:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// DELETE /api/employee-allowances/:id
export const deleteEmployeeAllowance = async (req, res) => {
    try {
        const item = await EmployeeAllowance.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy record' });
        await item.destroy();
        return res.status(204).end();
    } catch (error) {
        console.error('Lỗi xóa employee allowance:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
