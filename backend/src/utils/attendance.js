import { Op } from 'sequelize';
import { Employee, Shift, WorkSchedule } from '../models/index.js';

export const LATE_TOLERANCE_MINUTES = 5;
export const OT_TOLERANCE_MINUTES = 15;
export const DEFAULT_SHIFT = {
    startTime: '08:00:00',
    endTime: '17:30:00',
    breakMinutes: 60,
    name: 'Ca mặc định',
};

// Get client IP from proxy-aware headers
export const getClientIp = (req) => {
    const raw = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '';
    return raw.replace(/^::ffff:/, '');
};

// Get today's date in YYYY-MM-DD (local timezone).
export const getTodayString = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// Ghép date + time thành Date object (VD "2026-01-15" + "08:00:00" → Date)
const parseTimeOnDate = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}`);

// Get employee tied to req.user (throws nếu user chưa được gắn nhân viên).
export const getEmployeeFromUser = async (req) => {
    if (!req.user?.id) throw new Error('Chưa xác thực user');
    const employee = await Employee.findOne({
        where: { userId: req.user.id, companyId: req.companyId },
    });
    if (!employee) {
        const err = new Error('User này chưa được gắn với nhân viên nào — HR cần cấp hồ sơ');
        err.statusCode = 400;
        throw err;
    }
    return employee;
};

// Lấy shift active cho NV vào ngày date. Fallback DEFAULT_SHIFT nếu chưa có work_schedule.
export const getActiveShift = async (employeeId, date) => {
    const schedule = await WorkSchedule.findOne({
        where: {
            employeeId,
            effectiveFrom: { [Op.lte]: date },
            [Op.or]: [
                { effectiveTo: null },
                { effectiveTo: { [Op.gte]: date } },
            ],
        },
        include: [{ model: Shift }],
        order: [['effectiveFrom', 'DESC']],
    });
    if (schedule?.Shift) return schedule.Shift;
    return DEFAULT_SHIFT;
};

// Tính status + lateMinutes khi check-in
export const calculateCheckInStatus = (checkInAt, shift, dateStr) => {
    const scheduledStart = parseTimeOnDate(dateStr, shift.startTime);
    const diffMs = checkInAt.getTime() - scheduledStart.getTime();
    const lateMinutes = Math.max(0, Math.round(diffMs / 60000));
    return {
        lateMinutes,
        status: lateMinutes > LATE_TOLERANCE_MINUTES ? 'late' : 'on_time',
    };
};

// Tính hoursWorked + otHours + earlyMinutes khi check-out
export const calculateCheckOutMetrics = (checkInAt, checkOutAt, shift, dateStr, previousStatus) => {
    const diffMs = Math.max(0, checkOutAt.getTime() - checkInAt.getTime());
    const hoursRaw = diffMs / 3600000;
    const hoursWorked = Math.max(0, Math.round((hoursRaw - shift.breakMinutes / 60) * 100) / 100);

    const scheduledEnd = parseTimeOnDate(dateStr, shift.endTime);
    const graceEnd = new Date(scheduledEnd.getTime() + OT_TOLERANCE_MINUTES * 60000);
    let otHours = 0;
    if (checkOutAt > graceEnd) {
        otHours = Math.round(((checkOutAt.getTime() - scheduledEnd.getTime()) / 3600000) * 100) / 100;
    }

    let earlyMinutes = 0;
    let status = previousStatus;
    if (checkOutAt < scheduledEnd) {
        earlyMinutes = Math.round((scheduledEnd.getTime() - checkOutAt.getTime()) / 60000);
        // Nếu đã late thì giữ late, còn không thì early_leave
        if (previousStatus !== 'late') status = 'early_leave';
    }

    return { hoursWorked, otHours, earlyMinutes, status };
};

// Trả về first/last day of month cho query (YYYY-MM-DD)
export const getMonthRange = (monthStr) => {
    // monthStr: "2026-07"
    const [yyyy, mm] = monthStr.split('-').map(Number);
    const first = `${yyyy}-${String(mm).padStart(2, '0')}-01`;
    const lastDay = new Date(yyyy, mm, 0).getDate();
    const last = `${yyyy}-${String(mm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { first, last };
};
