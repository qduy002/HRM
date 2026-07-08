import { LeaveBalance, LeaveType, Employee } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { isValidationError, getValidationMessage } from '../utils/dbError.js';
import { getEmployeeFromUser } from '../utils/attendance.js';

const EDITABLE_FIELDS = ['allocatedDays', 'usedDays', 'carriedOverDays'];

// GET /api/leave-balances/me?year=YYYY
export const listMyBalances = async (req, res) => {
    try {
        const employee = await getEmployeeFromUser(req);
        const year = Number(req.query.year) || new Date().getFullYear();

        // Lấy tất cả leave types active + join với balance nếu có
        const [leaveTypes, balances] = await Promise.all([
            LeaveType.findAll({ where: { companyId: req.companyId, isActive: true } }),
            LeaveBalance.findAll({
                where: { companyId: req.companyId, employeeId: employee.id, year },
            }),
        ]);

        const byTypeId = new Map(balances.map((b) => [b.leaveTypeId, b]));
        const rows = leaveTypes.map((lt) => {
            const b = byTypeId.get(lt.id);
            return {
                leaveTypeId: lt.id,
                code: lt.code,
                name: lt.name,
                color: lt.color,
                isPaid: lt.isPaid,
                daysPerYear: lt.daysPerYear,
                year,
                allocatedDays: b ? Number(b.allocatedDays) : (lt.daysPerYear ?? 0),
                usedDays: b ? Number(b.usedDays) : 0,
                carriedOverDays: b ? Number(b.carriedOverDays) : 0,
                remainingDays: b
                    ? Number(b.allocatedDays) + Number(b.carriedOverDays) - Number(b.usedDays)
                    : (lt.daysPerYear ?? 0),
            };
        });

        return res.status(200).json({ year, balances: rows });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('Lỗi list my balances:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/leave-balances?employeeId=&year=
// HR view
export const listBalances = async (req, res) => {
    try {
        const year = Number(req.query.year) || new Date().getFullYear();
        const where = { ...scopeToCompany(req), year };
        if (req.query.employeeId) where.employeeId = Number(req.query.employeeId);

        const items = await LeaveBalance.findAll({
            where,
            include: [
                { model: Employee, attributes: ['id', 'code', 'displayName'] },
                { model: LeaveType, attributes: ['id', 'code', 'name', 'color'] },
            ],
            order: [['employeeId', 'ASC']],
        });
        return res.status(200).json({ year, balances: items });
    } catch (error) {
        console.error('Lỗi list balances:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/leave-balances
// HR init balance cho NV
export const createBalance = async (req, res) => {
    try {
        const { employeeId, leaveTypeId, year, allocatedDays, carriedOverDays = 0 } = req.body;
        if (!employeeId || !leaveTypeId || !year) {
            return res.status(400).json({ message: 'Thiếu employeeId, leaveTypeId hoặc year' });
        }

        const [emp, lt] = await Promise.all([
            Employee.findOne({ where: { id: employeeId, companyId: req.companyId } }),
            LeaveType.findOne({ where: { id: leaveTypeId, companyId: req.companyId } }),
        ]);
        if (!emp) return res.status(400).json({ message: 'Nhân viên không tồn tại' });
        if (!lt) return res.status(400).json({ message: 'Loại phép không tồn tại' });

        const balance = await LeaveBalance.create({
            companyId: req.companyId,
            employeeId,
            leaveTypeId,
            year,
            allocatedDays: allocatedDays ?? lt.daysPerYear ?? 0,
            carriedOverDays,
        });
        return res.status(201).json({ balance });
    } catch (error) {
        if (isValidationError(error)) {
            return res.status(400).json({ message: getValidationMessage(error) });
        }
        console.error('Lỗi tạo balance:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// PUT /api/leave-balances/:id
export const updateBalance = async (req, res) => {
    try {
        const item = await LeaveBalance.findOne({ where: { id: req.params.id, ...scopeToCompany(req) } });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy balance' });

        const data = {};
        for (const k of EDITABLE_FIELDS) if (k in req.body) data[k] = req.body[k];
        await item.update(data);
        return res.status(200).json({ balance: item });
    } catch (error) {
        console.error('Lỗi cập nhật balance:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
