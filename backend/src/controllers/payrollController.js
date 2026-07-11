import { Op } from 'sequelize';
import sequelize from '../libs/db.js';
import { Employee, Payroll, PayrollItem, User } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { getEmployeeFromUser } from '../utils/attendance.js';
import { computePayroll } from '../utils/payroll.js';

// POST /api/payrolls/generate
// Body: { month, year, employeeIds?: number[] }
// Nếu không truyền employeeIds → tính cho tất cả NV active có salary structure.
// Skip nếu payroll đã tồn tại (không đè).
export const generatePayrolls = async (req, res) => {
    try {
        const { month, year, employeeIds } = req.body;
        if (!month || !year) return res.status(400).json({ message: 'Thiếu month hoặc year' });

        let targetIds = employeeIds;
        if (!targetIds || targetIds.length === 0) {
            const active = await Employee.findAll({
                where: {
                    companyId: req.companyId,
                    status: { [Op.in]: ['probation', 'active', 'on_leave'] },
                },
                attributes: ['id'],
            });
            targetIds = active.map((e) => e.id);
        }

        const result = { generated: [], skipped: [], errors: [] };

        for (const empId of targetIds) {
            const t = await sequelize.transaction();
            try {
                const existing = await Payroll.findOne({
                    where: { companyId: req.companyId, employeeId: empId, month, year },
                    transaction: t,
                });
                if (existing) {
                    result.skipped.push({ employeeId: empId, reason: 'Đã có bảng lương' });
                    await t.rollback();
                    continue;
                }

                const { payroll: data, items } = await computePayroll(req.companyId, empId, month, year, t);

                const payroll = await Payroll.create(
                    { ...data, companyId: req.companyId, employeeId: empId },
                    { transaction: t },
                );

                await PayrollItem.bulkCreate(
                    items.map((it) => ({ ...it, companyId: req.companyId, payrollId: payroll.id })),
                    { transaction: t },
                );

                await t.commit();
                result.generated.push({ employeeId: empId, payrollId: payroll.id, net: data.netSalary });
            } catch (error) {
                await t.rollback();
                result.errors.push({ employeeId: empId, message: error.message });
            }
        }

        return res.status(200).json({
            month,
            year,
            summary: {
                generated: result.generated.length,
                skipped: result.skipped.length,
                errors: result.errors.length,
            },
            ...result,
        });
    } catch (error) {
        console.error('Lỗi generate payrolls:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/payrolls/preview
// Body: { employeeId, month, year } — tính thử không lưu, cho HR xem trước
export const previewPayroll = async (req, res) => {
    try {
        const { employeeId, month, year } = req.body;
        if (!employeeId || !month || !year) {
            return res.status(400).json({ message: 'Thiếu employeeId, month hoặc year' });
        }

        const emp = await Employee.findOne({
            where: { id: employeeId, companyId: req.companyId },
        });
        if (!emp) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });

        const { payroll, items } = await computePayroll(req.companyId, employeeId, month, year, null);
        return res.status(200).json({
            employee: { id: emp.id, code: emp.code, displayName: emp.displayName },
            payroll,
            items,
        });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('Lỗi preview payroll:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/payrolls?month=&year=&employeeId=&status=
// HR view all payrolls
export const listPayrolls = async (req, res) => {
    try {
        const where = { ...scopeToCompany(req) };
        if (req.query.month) where.month = Number(req.query.month);
        if (req.query.year) where.year = Number(req.query.year);
        if (req.query.employeeId) where.employeeId = Number(req.query.employeeId);
        if (req.query.status) where.status = req.query.status;

        const items = await Payroll.findAll({
            where,
            include: [
                { model: Employee, attributes: ['id', 'code', 'displayName'] },
                { model: User, as: 'finalizer', attributes: ['id', 'email'] },
                { model: User, as: 'payer', attributes: ['id', 'email'] },
            ],
            order: [['year', 'DESC'], ['month', 'DESC'], ['employeeId', 'ASC']],
        });
        return res.status(200).json({ payrolls: items });
    } catch (error) {
        console.error('Lỗi list payrolls:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/payrolls/:id — detail với items
export const getPayroll = async (req, res) => {
    try {
        const payroll = await Payroll.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
            include: [
                { model: Employee, attributes: ['id', 'code', 'displayName', 'bankAccountNumber', 'bankName', 'bankBranch'] },
                { model: User, as: 'finalizer', attributes: ['id', 'email'] },
                { model: User, as: 'payer', attributes: ['id', 'email'] },
                { model: PayrollItem, separate: true, order: [['sortOrder', 'ASC']] },
            ],
        });
        if (!payroll) return res.status(404).json({ message: 'Không tìm thấy bảng lương' });
        return res.status(200).json({ payroll });
    } catch (error) {
        console.error('Lỗi get payroll:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/payrolls/my?month=&year=
// NV xem payslip của mình. Chỉ trả nếu status = finalized/paid (draft chưa cho NV thấy)
export const getMyPayslip = async (req, res) => {
    try {
        const employee = await getEmployeeFromUser(req);
        const now = new Date();
        const month = Number(req.query.month) || now.getMonth() + 1;
        const year = Number(req.query.year) || now.getFullYear();

        const payroll = await Payroll.findOne({
            where: {
                companyId: req.companyId,
                employeeId: employee.id,
                month,
                year,
                status: { [Op.in]: ['finalized', 'paid'] },
            },
            include: [
                { model: Employee, attributes: ['id', 'code', 'displayName', 'bankAccountNumber', 'bankName', 'bankBranch'] },
                { model: PayrollItem, separate: true, order: [['sortOrder', 'ASC']] },
            ],
        });
        if (!payroll) {
            return res.status(404).json({
                message: `Chưa có payslip cho tháng ${month}/${year}. HR có thể chưa finalize.`,
            });
        }
        return res.status(200).json({ payroll });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('Lỗi get my payslip:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/payrolls/:id/finalize
export const finalizePayroll = async (req, res) => {
    try {
        const payroll = await Payroll.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!payroll) return res.status(404).json({ message: 'Không tìm thấy bảng lương' });
        if (payroll.status !== 'draft') {
            return res.status(400).json({ message: `Chỉ finalize được từ draft, hiện tại: ${payroll.status}` });
        }
        await payroll.update({
            status: 'finalized',
            finalizedBy: req.user.id,
            finalizedAt: new Date(),
        });
        return res.status(200).json({ payroll, message: 'Đã finalize bảng lương' });
    } catch (error) {
        console.error('Lỗi finalize payroll:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/payrolls/:id/unlock
// finalized → draft, increment unlockCount cho audit
export const unlockPayroll = async (req, res) => {
    try {
        const payroll = await Payroll.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!payroll) return res.status(404).json({ message: 'Không tìm thấy bảng lương' });
        if (payroll.status !== 'finalized') {
            return res.status(400).json({ message: `Chỉ unlock được từ finalized, hiện tại: ${payroll.status}` });
        }
        await payroll.update({
            status: 'draft',
            finalizedBy: null,
            finalizedAt: null,
            unlockCount: payroll.unlockCount + 1,
        });
        return res.status(200).json({ payroll, message: 'Đã unlock. Bạn có thể chỉnh sửa và finalize lại.' });
    } catch (error) {
        console.error('Lỗi unlock payroll:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/payrolls/:id/mark-paid
export const markPaid = async (req, res) => {
    try {
        const payroll = await Payroll.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!payroll) return res.status(404).json({ message: 'Không tìm thấy bảng lương' });
        if (payroll.status !== 'finalized') {
            return res.status(400).json({ message: `Chỉ mark-paid được từ finalized, hiện tại: ${payroll.status}` });
        }
        await payroll.update({
            status: 'paid',
            paidBy: req.user.id,
            paidAt: new Date(),
        });
        return res.status(200).json({ payroll, message: 'Đã đánh dấu thanh toán' });
    } catch (error) {
        console.error('Lỗi mark paid:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/payrolls/export?month=&year=
// Export CSV bảng lương tháng
export const exportPayrollCSV = async (req, res) => {
    try {
        const month = Number(req.query.month);
        const year = Number(req.query.year);
        if (!month || !year) return res.status(400).json({ message: 'Thiếu month/year' });

        const items = await Payroll.findAll({
            where: { companyId: req.companyId, month, year },
            include: [{ model: Employee, attributes: ['code', 'displayName', 'bankAccountNumber', 'bankName'] }],
            order: [['employeeId', 'ASC']],
        });

        const headers = [
            'Mã NV', 'Họ tên', 'Số TK', 'Ngân hàng',
            'Ngày công thực', 'Ngày công chuẩn',
            'Lương cơ bản (prorated)', 'OT', 'Phụ cấp chịu thuế', 'Phụ cấp miễn thuế',
            'Gross', 'BHXH', 'BHYT', 'BHTN', 'Tổng BH',
            'Số NPT', 'TN chịu thuế', 'Thuế TNCN',
            'Net (VND)', 'Trạng thái',
        ];
        const rows = items.map((p) => [
            p.Employee?.code || '',
            p.Employee?.displayName || '',
            p.Employee?.bankAccountNumber || '',
            p.Employee?.bankName || '',
            p.actualPaidDays,
            p.workingDaysStandard,
            p.basicSalary,
            (Number(p.grossSalary) - Number(p.totalTaxableAllowance) - Number(p.totalNonTaxableAllowance) - Number(p.basicSalary)) > 0
                ? (Number(p.grossSalary) - Number(p.totalTaxableAllowance) - Number(p.totalNonTaxableAllowance) - Number(p.basicSalary))
                : 0,
            p.totalTaxableAllowance,
            p.totalNonTaxableAllowance,
            p.grossSalary,
            p.bhxhAmount,
            p.bhytAmount,
            p.bhtnAmount,
            p.totalInsuranceEmployee,
            p.dependentCount,
            p.taxableIncome,
            p.personalIncomeTax,
            p.netSalary,
            p.status,
        ]);

        const csv = [headers, ...rows]
            .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="payroll_${year}_${String(month).padStart(2, '0')}.csv"`);
        // BOM để Excel mở tiếng Việt đúng
        return res.send('﻿' + csv);
    } catch (error) {
        console.error('Lỗi export payroll CSV:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
