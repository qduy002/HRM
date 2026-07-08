import { Op } from 'sequelize';
import {
    Attendance,
    Company,
    Department,
    Employee,
    EmployeePosition,
    LeaveBalance,
    LeaveType,
} from '../models/index.js';

// 6 loại phép chuẩn VN. Auto seed khi tạo tenant mới.
export const DEFAULT_LEAVE_TYPES = [
    { code: 'ANNUAL', name: 'Nghỉ phép năm', daysPerYear: 12, isPaid: true, requiresApproval: true, color: '#3b82f6' },
    { code: 'SICK', name: 'Nghỉ ốm', daysPerYear: null, isPaid: true, requiresApproval: true, color: '#f59e0b' },
    { code: 'MATERNITY', name: 'Nghỉ thai sản', daysPerYear: 180, isPaid: true, requiresApproval: true, color: '#ec4899' },
    { code: 'MARRIAGE', name: 'Nghỉ cưới', daysPerYear: 3, isPaid: true, requiresApproval: true, color: '#a855f7' },
    { code: 'BEREAVEMENT', name: 'Nghỉ tang', daysPerYear: 3, isPaid: true, requiresApproval: true, color: '#64748b' },
    { code: 'UNPAID', name: 'Nghỉ không lương', daysPerYear: null, isPaid: false, requiresApproval: true, color: '#94a3b8' },
];

// Seed 6 loại phép cho 1 tenant. Idempotent — bỏ qua nếu code đã tồn tại.
export const seedDefaultLeaveTypes = async (companyId, transaction) => {
    const existing = await LeaveType.findAll({
        where: { companyId },
        attributes: ['code'],
        transaction,
    });
    const existingCodes = new Set(existing.map((e) => e.code));

    const toCreate = DEFAULT_LEAVE_TYPES.filter((t) => !existingCodes.has(t.code)).map((t) => ({
        ...t,
        companyId,
    }));

    if (toCreate.length > 0) {
        await LeaveType.bulkCreate(toCreate, { transaction });
    }
    return toCreate.length;
};

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Tính số ngày phép dựa trên workingDays của công ty.
// - fromDate/toDate: 'YYYY-MM-DD'
// - halfDay: null | 'morning' | 'afternoon' (chỉ hợp lệ khi fromDate = toDate)
// - workingDays: { mon:1, tue:1, ..., sat:0.5, sun:0 }
export const calculateLeaveDays = (fromDate, toDate, halfDay, workingDays) => {
    if (halfDay) {
        if (fromDate !== toDate) {
            throw new Error('Nửa ngày chỉ áp dụng khi fromDate = toDate');
        }
        const dayKey = DAY_KEYS[new Date(fromDate + 'T00:00:00').getDay()];
        const weight = workingDays[dayKey] ?? 0;
        return Math.round(weight * 0.5 * 10) / 10;
    }

    let total = 0;
    const start = new Date(fromDate + 'T00:00:00');
    const end = new Date(toDate + 'T00:00:00');
    if (end < start) throw new Error('toDate phải >= fromDate');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayKey = DAY_KEYS[d.getDay()];
        total += workingDays[dayKey] ?? 0;
    }
    return Math.round(total * 10) / 10;
};

// Trả về tất cả các ngày trong khoảng from-to là ngày làm việc (weight > 0).
export const getWorkingDatesInRange = (fromDate, toDate, workingDays) => {
    const dates = [];
    const start = new Date(fromDate + 'T00:00:00');
    const end = new Date(toDate + 'T00:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayKey = DAY_KEYS[d.getDay()];
        if ((workingDays[dayKey] ?? 0) > 0) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            dates.push(`${yyyy}-${mm}-${dd}`);
        }
    }
    return dates;
};

// Check xem `userId` có phải là manager của employeeId không.
// Logic: employee → current position → department.managerId → employee đó có userId khớp không.
// Fallback: nếu department chưa set manager → chỉ admin duyệt được.
export const isManagerOfEmployee = async (userId, employeeId, companyId) => {
    const currentPos = await EmployeePosition.findOne({
        where: { employeeId, companyId, effectiveTo: null },
        include: [{ model: Department, attributes: ['id', 'managerId'] }],
    });
    if (!currentPos?.Department?.managerId) return false;

    const managerEmployee = await Employee.findOne({
        where: { id: currentPos.Department.managerId, companyId },
        attributes: ['userId'],
    });
    return managerEmployee?.userId === userId;
};

// Lấy workingDays của tenant.
export const getCompanyWorkingDays = async (companyId) => {
    const company = await Company.findByPk(companyId, { attributes: ['workingDays'] });
    return company?.workingDays ?? { mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0 };
};

// Tạo/lấy leave_balance cho NV + loại phép + năm. Auto init nếu chưa có.
export const getOrCreateBalance = async (companyId, employeeId, leaveTypeId, year, transaction) => {
    const leaveType = await LeaveType.findOne({
        where: { id: leaveTypeId, companyId },
        transaction,
    });
    if (!leaveType) throw new Error('Loại phép không tồn tại');

    let balance = await LeaveBalance.findOne({
        where: { companyId, employeeId, leaveTypeId, year },
        transaction,
    });
    if (!balance) {
        balance = await LeaveBalance.create(
            {
                companyId,
                employeeId,
                leaveTypeId,
                year,
                allocatedDays: leaveType.daysPerYear ?? 0,
                usedDays: 0,
                carriedOverDays: 0,
            },
            { transaction },
        );
    }
    return balance;
};

// Cập nhật attendances khi leave được duyệt cuối cùng.
// Với mỗi ngày trong range → set/create attendance với status='on_leave'.
export const applyLeaveToAttendances = async (companyId, employeeId, dates, transaction) => {
    for (const date of dates) {
        const existing = await Attendance.findOne({
            where: { companyId, employeeId, date },
            transaction,
        });
        if (existing) {
            await existing.update({ status: 'on_leave', note: 'Nghỉ phép có duyệt' }, { transaction });
        } else {
            await Attendance.create(
                {
                    companyId,
                    employeeId,
                    date,
                    status: 'on_leave',
                    hoursWorked: 0,
                    otHours: 0,
                    note: 'Nghỉ phép có duyệt',
                },
                { transaction },
            );
        }
    }
};
