import { Op } from 'sequelize';
import sequelize from '../libs/db.js';
import {
    Employee,
    LeaveBalance,
    LeaveRequest,
    LeaveType,
    User,
} from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { getEmployeeFromUser } from '../utils/attendance.js';
import {
    applyLeaveToAttendances,
    calculateLeaveDays,
    getCompanyWorkingDays,
    getOrCreateBalance,
    getWorkingDatesInRange,
    isManagerOfEmployee,
} from '../utils/leave.js';

const includeRelations = [
    { model: Employee, attributes: ['id', 'code', 'displayName'] },
    { model: LeaveType, attributes: ['id', 'code', 'name', 'color', 'isPaid'] },
    { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
    { model: User, as: 'managerApprover', attributes: ['id', 'username', 'email'] },
    { model: User, as: 'hrApprover', attributes: ['id', 'username', 'email'] },
    { model: User, as: 'rejecter', attributes: ['id', 'username', 'email'] },
];

// GET /api/leave-requests/me?status=
export const listMyRequests = async (req, res) => {
    try {
        const employee = await getEmployeeFromUser(req);
        const where = { companyId: req.companyId, employeeId: employee.id };
        if (req.query.status) where.status = req.query.status;
        const items = await LeaveRequest.findAll({
            where,
            include: [
                { model: LeaveType, attributes: ['id', 'code', 'name', 'color', 'isPaid'] },
                { model: User, as: 'managerApprover', attributes: ['id', 'username', 'email'] },
                { model: User, as: 'hrApprover', attributes: ['id', 'username', 'email'] },
                { model: User, as: 'rejecter', attributes: ['id', 'username', 'email'] },
            ],
            order: [['createdAt', 'DESC']],
        });
        return res.status(200).json({ requests: items });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('Lỗi list my requests:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/leave-requests/pending-approval
// Manager: status=pending của NV thuộc phòng ban mình quản lý
// HR: status=manager_approved
export const listPendingApproval = async (req, res) => {
    try {
        const role = req.user.role;

        if (role === 'hr' || role === 'admin') {
            const items = await LeaveRequest.findAll({
                where: { companyId: req.companyId, status: 'manager_approved' },
                include: includeRelations,
                order: [['managerApprovedAt', 'ASC']],
            });
            return res.status(200).json({ requests: items, stage: 'hr' });
        }

        if (role === 'manager') {
            // Find all employees whose department is managed by this user
            const managerEmployee = await Employee.findOne({
                where: { userId: req.user.id, companyId: req.companyId },
                attributes: ['id'],
            });
            if (!managerEmployee) {
                return res.status(200).json({ requests: [], stage: 'manager' });
            }

            // Load all pending requests + filter theo isManagerOfEmployee
            const all = await LeaveRequest.findAll({
                where: { companyId: req.companyId, status: 'pending' },
                include: includeRelations,
                order: [['createdAt', 'ASC']],
            });

            const filtered = [];
            for (const r of all) {
                if (await isManagerOfEmployee(req.user.id, r.employeeId, req.companyId)) {
                    filtered.push(r);
                }
            }
            return res.status(200).json({ requests: filtered, stage: 'manager' });
        }

        return res.status(403).json({ message: 'Chỉ manager/hr/admin xem được' });
    } catch (error) {
        console.error('Lỗi list pending approval:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/leave-requests?employeeId=&status=&year=
// HR view all
export const listAllRequests = async (req, res) => {
    try {
        const where = { ...scopeToCompany(req) };
        if (req.query.employeeId) where.employeeId = Number(req.query.employeeId);
        if (req.query.status) where.status = req.query.status;
        if (req.query.year) {
            const year = Number(req.query.year);
            where.fromDate = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
        }

        const items = await LeaveRequest.findAll({
            where,
            include: includeRelations,
            order: [['createdAt', 'DESC']],
        });
        return res.status(200).json({ requests: items });
    } catch (error) {
        console.error('Lỗi list all requests:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/leave-requests
// NV submit đơn.
export const createRequest = async (req, res) => {
    try {
        const employee = await getEmployeeFromUser(req);
        const { leaveTypeId, fromDate, toDate, halfDay, reason } = req.body;

        if (!leaveTypeId || !fromDate || !toDate || !reason) {
            return res.status(400).json({ message: 'Thiếu leaveTypeId, fromDate, toDate hoặc reason' });
        }

        const leaveType = await LeaveType.findOne({
            where: { id: leaveTypeId, companyId: req.companyId, isActive: true },
        });
        if (!leaveType) return res.status(400).json({ message: 'Loại phép không tồn tại hoặc đã tắt' });

        const workingDays = await getCompanyWorkingDays(req.companyId);
        let days;
        try {
            days = calculateLeaveDays(fromDate, toDate, halfDay || null, workingDays);
        } catch (e) {
            return res.status(400).json({ message: e.message });
        }
        if (days <= 0) {
            return res.status(400).json({ message: 'Số ngày phép = 0. Chọn ngày làm việc hợp lệ.' });
        }

        // Check balance nếu leaveType có giới hạn
        if (leaveType.daysPerYear != null) {
            const year = new Date(fromDate).getFullYear();
            const balance = await getOrCreateBalance(req.companyId, employee.id, leaveType.id, year);
            const remaining =
                Number(balance.allocatedDays) + Number(balance.carriedOverDays) - Number(balance.usedDays);
            if (days > remaining) {
                return res.status(400).json({
                    message: `Số phép còn lại (${remaining} ngày) không đủ cho đơn ${days} ngày.`,
                });
            }
        }

        const request = await LeaveRequest.create({
            companyId: req.companyId,
            employeeId: employee.id,
            leaveTypeId,
            fromDate,
            toDate,
            halfDay: halfDay || null,
            days,
            reason,
            status: leaveType.requiresApproval ? 'pending' : 'approved',
            createdBy: req.user.id,
        });

        return res.status(201).json({ request });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('Lỗi tạo leave_request:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/leave-requests/:id/manager-approve
export const managerApprove = async (req, res) => {
    try {
        const request = await LeaveRequest.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!request) return res.status(404).json({ message: 'Không tìm thấy đơn' });
        if (request.status !== 'pending') {
            return res.status(400).json({ message: `Đơn đang ở trạng thái ${request.status}, không thể duyệt tầng manager` });
        }

        // Kiểm tra quyền: user phải là manager của department của NV, hoặc admin
        const isAdmin = req.user.role === 'admin';
        const isMgr = await isManagerOfEmployee(req.user.id, request.employeeId, req.companyId);
        if (!isAdmin && !isMgr) {
            return res.status(403).json({ message: 'Bạn không phải quản lý của nhân viên này' });
        }

        await request.update({
            status: 'manager_approved',
            managerApprovedBy: req.user.id,
            managerApprovedAt: new Date(),
            managerNote: req.body.note || null,
        });

        return res.status(200).json({ request, message: 'Duyệt tầng manager thành công. Chờ HR duyệt cuối.' });
    } catch (error) {
        console.error('Lỗi manager-approve:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/leave-requests/:id/hr-approve
export const hrApprove = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const request = await LeaveRequest.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
            transaction: t,
        });
        if (!request) {
            await t.rollback();
            return res.status(404).json({ message: 'Không tìm thấy đơn' });
        }
        if (request.status !== 'manager_approved') {
            await t.rollback();
            return res.status(400).json({
                message: `Đơn ở trạng thái ${request.status}, cần manager duyệt trước khi HR duyệt`,
            });
        }

        await request.update(
            {
                status: 'approved',
                hrApprovedBy: req.user.id,
                hrApprovedAt: new Date(),
                hrNote: req.body.note || null,
            },
            { transaction: t },
        );

        // Cập nhật leave_balance nếu leaveType có giới hạn
        const leaveType = await LeaveType.findByPk(request.leaveTypeId, { transaction: t });
        if (leaveType?.daysPerYear != null) {
            const year = new Date(request.fromDate).getFullYear();
            const balance = await getOrCreateBalance(
                req.companyId,
                request.employeeId,
                request.leaveTypeId,
                year,
                t,
            );
            await balance.increment({ usedDays: Number(request.days) }, { transaction: t });
        }

        // Cập nhật attendances thành 'on_leave' cho các ngày làm việc trong range
        const workingDays = await getCompanyWorkingDays(req.companyId);
        const dates = getWorkingDatesInRange(request.fromDate, request.toDate, workingDays);
        await applyLeaveToAttendances(req.companyId, request.employeeId, dates, t);

        await t.commit();
        return res.status(200).json({ request, message: 'HR duyệt thành công. Đơn phép có hiệu lực.' });
    } catch (error) {
        await t.rollback();
        console.error('Lỗi hr-approve:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/leave-requests/:id/reject
// Ai reject cũng được (manager hoặc HR).
export const reject = async (req, res) => {
    try {
        const request = await LeaveRequest.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!request) return res.status(404).json({ message: 'Không tìm thấy đơn' });
        if (!['pending', 'manager_approved'].includes(request.status)) {
            return res.status(400).json({ message: `Không thể reject đơn ở trạng thái ${request.status}` });
        }

        // Check quyền
        const role = req.user.role;
        const isAdmin = role === 'admin';
        const isHR = role === 'hr';
        const isMgr = role === 'manager' && (await isManagerOfEmployee(req.user.id, request.employeeId, req.companyId));
        if (!isAdmin && !isHR && !isMgr) {
            return res.status(403).json({ message: 'Bạn không có quyền từ chối đơn này' });
        }

        const { reason } = req.body;
        if (!reason) return res.status(400).json({ message: 'Thiếu lý do từ chối' });

        await request.update({
            status: 'rejected',
            rejectedBy: req.user.id,
            rejectedAt: new Date(),
            rejectedReason: reason,
        });

        return res.status(200).json({ request, message: 'Đã từ chối đơn.' });
    } catch (error) {
        console.error('Lỗi reject:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/leave-requests/:id/cancel
// NV tự hủy đơn (chỉ khi chưa được duyệt cuối).
export const cancel = async (req, res) => {
    try {
        const employee = await getEmployeeFromUser(req);
        const request = await LeaveRequest.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!request) return res.status(404).json({ message: 'Không tìm thấy đơn' });

        const isOwner = request.employeeId === employee.id;
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Bạn không có quyền hủy đơn này' });
        }
        if (!['pending', 'manager_approved'].includes(request.status)) {
            return res.status(400).json({ message: `Không thể hủy đơn ở trạng thái ${request.status}` });
        }

        await request.update({ status: 'cancelled' });
        return res.status(200).json({ request, message: 'Đã hủy đơn.' });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('Lỗi cancel:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
