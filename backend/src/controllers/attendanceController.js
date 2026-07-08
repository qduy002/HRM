import { Op } from 'sequelize';
import { Attendance, Employee } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import {
    calculateCheckInStatus,
    calculateCheckOutMetrics,
    getActiveShift,
    getClientIp,
    getEmployeeFromUser,
    getMonthRange,
    getTodayString,
} from '../utils/attendance.js';

// POST /api/attendances/check-in
// Employee tự check-in. Lấy shift từ work_schedule active hôm nay (hoặc default).
export const checkIn = async (req, res) => {
    try {
        const employee = await getEmployeeFromUser(req);
        const today = getTodayString();
        const shift = await getActiveShift(employee.id, today);

        const existing = await Attendance.findOne({
            where: { companyId: req.companyId, employeeId: employee.id, date: today },
        });

        if (existing?.checkInAt) {
            return res.status(400).json({ message: 'Bạn đã check-in hôm nay lúc ' + existing.checkInAt.toLocaleString('vi-VN') });
        }

        const checkInAt = new Date();
        const { status, lateMinutes } = calculateCheckInStatus(checkInAt, shift, today);
        const ip = getClientIp(req);

        const attendance = existing
            ? await existing.update({ checkInAt, checkInIp: ip, status, lateMinutes })
            : await Attendance.create({
                companyId: req.companyId,
                employeeId: employee.id,
                date: today,
                checkInAt,
                checkInIp: ip,
                status,
                lateMinutes,
            });

        return res.status(200).json({
            attendance,
            message: status === 'late'
                ? `Check-in thành công. Đi trễ ${lateMinutes} phút.`
                : 'Check-in thành công đúng giờ.',
        });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('Lỗi check-in:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/attendances/check-out
export const checkOut = async (req, res) => {
    try {
        const employee = await getEmployeeFromUser(req);
        const today = getTodayString();
        const shift = await getActiveShift(employee.id, today);

        const attendance = await Attendance.findOne({
            where: { companyId: req.companyId, employeeId: employee.id, date: today },
        });

        if (!attendance || !attendance.checkInAt) {
            return res.status(400).json({ message: 'Bạn chưa check-in hôm nay' });
        }
        if (attendance.checkOutAt) {
            return res.status(400).json({ message: 'Bạn đã check-out lúc ' + attendance.checkOutAt.toLocaleString('vi-VN') });
        }

        const checkOutAt = new Date();
        const metrics = calculateCheckOutMetrics(
            attendance.checkInAt,
            checkOutAt,
            shift,
            today,
            attendance.status,
        );

        await attendance.update({
            checkOutAt,
            checkOutIp: getClientIp(req),
            hoursWorked: metrics.hoursWorked,
            otHours: metrics.otHours,
            earlyMinutes: metrics.earlyMinutes,
            status: metrics.status,
        });

        const messages = [];
        messages.push(`Đã làm ${metrics.hoursWorked} giờ.`);
        if (metrics.otHours > 0) messages.push(`OT: ${metrics.otHours} giờ.`);
        if (metrics.earlyMinutes > 0) messages.push(`Về sớm ${metrics.earlyMinutes} phút.`);

        return res.status(200).json({
            attendance,
            message: 'Check-out thành công. ' + messages.join(' '),
        });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('Lỗi check-out:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/attendances/me?month=YYYY-MM
// Employee xem chấm công tháng của mình.
export const listMyAttendances = async (req, res) => {
    try {
        const employee = await getEmployeeFromUser(req);
        const month = req.query.month || getTodayString().slice(0, 7);
        const { first, last } = getMonthRange(month);

        const items = await Attendance.findAll({
            where: {
                companyId: req.companyId,
                employeeId: employee.id,
                date: { [Op.between]: [first, last] },
            },
            order: [['date', 'DESC']],
        });

        return res.status(200).json({ attendances: items, month });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('Lỗi list my attendances:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/attendances/today
// Kiểm tra trạng thái check-in/out của user hiện tại hôm nay
export const getMyToday = async (req, res) => {
    try {
        const employee = await getEmployeeFromUser(req);
        const today = getTodayString();
        const shift = await getActiveShift(employee.id, today);
        const attendance = await Attendance.findOne({
            where: { companyId: req.companyId, employeeId: employee.id, date: today },
        });
        return res.status(200).json({
            date: today,
            employee: { id: employee.id, code: employee.code, displayName: employee.displayName },
            shift: { name: shift.name, startTime: shift.startTime, endTime: shift.endTime, breakMinutes: shift.breakMinutes },
            attendance,
        });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('Lỗi get today:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/attendances?month=YYYY-MM&employeeId=&status=
// HR view — list toàn tenant trong tháng.
export const listAttendances = async (req, res) => {
    try {
        const month = req.query.month || getTodayString().slice(0, 7);
        const { first, last } = getMonthRange(month);

        const where = {
            ...scopeToCompany(req),
            date: { [Op.between]: [first, last] },
        };
        if (req.query.employeeId) where.employeeId = Number(req.query.employeeId);
        if (req.query.status) where.status = req.query.status;

        const items = await Attendance.findAll({
            where,
            include: [{ model: Employee, attributes: ['id', 'code', 'displayName'] }],
            order: [['date', 'DESC'], ['employeeId', 'ASC']],
        });

        return res.status(200).json({ attendances: items, month });
    } catch (error) {
        console.error('Lỗi list attendances HR:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/attendances/mark-absent?date=YYYY-MM-DD
// HR trigger — mark absent cho ai không check-in ngày đó.
// (Sprint 2 chưa có leave_requests → chưa auto set 'on_leave'. Batch B sẽ update.)
export const markAbsent = async (req, res) => {
    try {
        const date = req.query.date || getTodayString();

        const activeEmployees = await Employee.findAll({
            where: { companyId: req.companyId, status: ['probation', 'active'] },
            attributes: ['id'],
        });
        const activeIds = activeEmployees.map((e) => e.id);

        const existingAttendances = await Attendance.findAll({
            where: {
                companyId: req.companyId,
                date,
                employeeId: { [Op.in]: activeIds },
            },
            attributes: ['employeeId'],
        });
        const attendedIds = new Set(existingAttendances.map((a) => a.employeeId));

        const missing = activeIds.filter((id) => !attendedIds.has(id));
        const rows = missing.map((id) => ({
            companyId: req.companyId,
            employeeId: id,
            date,
            status: 'absent',
            hoursWorked: 0,
            otHours: 0,
        }));

        if (rows.length > 0) {
            await Attendance.bulkCreate(rows);
        }

        return res.status(200).json({
            date,
            marked: rows.length,
            message: `Đã đánh dấu ${rows.length} NV vắng mặt trong ngày ${date}.`,
        });
    } catch (error) {
        console.error('Lỗi mark absent:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// PUT /api/attendances/:id
// HR chỉnh sửa 1 bản ghi (VD sửa note, chỉnh status manual).
export const updateAttendance = async (req, res) => {
    try {
        const item = await Attendance.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy bản ghi' });

        const allowed = ['status', 'note', 'hoursWorked', 'otHours', 'lateMinutes', 'earlyMinutes'];
        const data = {};
        for (const k of allowed) if (k in req.body) data[k] = req.body[k];

        await item.update(data);
        return res.status(200).json({ attendance: item });
    } catch (error) {
        console.error('Lỗi cập nhật attendance:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
