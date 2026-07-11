import { Op } from 'sequelize';
import sequelize from '../libs/db.js';
import { Employee, SalaryStructure } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isValidationError, getValidationMessage } from '../utils/dbError.js';

const EDITABLE_FIELDS = ['basicSalary', 'bhxhSalary', 'effectiveFrom', 'effectiveTo', 'note'];

// GET /api/salary-structures?employeeId=
// Trả lịch sử lương của NV (nếu có employeeId) hoặc tất cả (HR view).
export const listSalaryStructures = async (req, res) => {
    try {
        const where = { ...scopeToCompany(req) };
        if (req.query.employeeId) where.employeeId = Number(req.query.employeeId);
        const items = await SalaryStructure.findAll({
            where,
            include: [{ model: Employee, attributes: ['id', 'code', 'displayName'] }],
            order: [['effectiveFrom', 'DESC']],
        });
        return res.status(200).json({ salaryStructures: items });
    } catch (error) {
        console.error('Lỗi list salary structures:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/salary-structures/current?employeeId=X
// Lấy salary hiện hành của NV.
export const getCurrentSalary = async (req, res) => {
    try {
        const employeeId = Number(req.query.employeeId);
        if (!employeeId) return res.status(400).json({ message: 'Thiếu employeeId' });
        const today = new Date().toISOString().split('T')[0];
        const salary = await SalaryStructure.findOne({
            where: {
                companyId: req.companyId,
                employeeId,
                effectiveFrom: { [Op.lte]: today },
                [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: today } }],
            },
            order: [['effectiveFrom', 'DESC']],
        });
        return res.status(200).json({ salary });
    } catch (error) {
        console.error('Lỗi get current salary:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/salary-structures
// Tạo salary mới. Nếu có salary active → auto set effectiveTo = day before new effectiveFrom.
export const createSalaryStructure = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        const employeeId = Number(req.body.employeeId);
        if (!employeeId || !data.basicSalary || !data.effectiveFrom) {
            await t.rollback();
            return res.status(400).json({ message: 'Thiếu employeeId, basicSalary hoặc effectiveFrom' });
        }

        // Verify employee thuộc tenant
        const emp = await Employee.findOne({
            where: { id: employeeId, companyId: req.companyId },
            transaction: t,
        });
        if (!emp) {
            await t.rollback();
            return res.status(400).json({ message: 'Nhân viên không tồn tại trong công ty' });
        }

        // Auto close active salary structures (set effectiveTo)
        const prevDay = new Date(data.effectiveFrom);
        prevDay.setDate(prevDay.getDate() - 1);
        const prevDayStr = prevDay.toISOString().split('T')[0];

        await SalaryStructure.update(
            { effectiveTo: prevDayStr },
            {
                where: {
                    companyId: req.companyId,
                    employeeId,
                    effectiveTo: null,
                },
                transaction: t,
            },
        );

        const salary = await SalaryStructure.create(
            {
                ...data,
                companyId: req.companyId,
                employeeId,
                bhxhSalary: data.bhxhSalary || data.basicSalary,
            },
            { transaction: t },
        );

        await t.commit();
        return res.status(201).json({ salary });
    } catch (error) {
        await t.rollback();
        if (isValidationError(error)) {
            return res.status(400).json({ message: getValidationMessage(error) });
        }
        console.error('Lỗi tạo salary structure:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// PUT /api/salary-structures/:id
// Chỉnh sửa (VD sửa lỗi typo). Không cho đổi employeeId.
export const updateSalaryStructure = async (req, res) => {
    try {
        const item = await SalaryStructure.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy salary structure' });

        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        await item.update(data);
        return res.status(200).json({ salary: item });
    } catch (error) {
        if (isValidationError(error)) {
            return res.status(400).json({ message: getValidationMessage(error) });
        }
        console.error('Lỗi cập nhật salary structure:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// DELETE /api/salary-structures/:id
export const deleteSalaryStructure = async (req, res) => {
    try {
        const item = await SalaryStructure.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy salary structure' });
        await item.destroy();
        return res.status(204).end();
    } catch (error) {
        console.error('Lỗi xóa salary structure:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
