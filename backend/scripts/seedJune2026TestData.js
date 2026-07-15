// Seed test data cho tháng 6/2026 để test flow chấm công + lương.
// Idempotent — bỏ qua nếu đã tồn tại.
import 'dotenv/config';
import { Op } from 'sequelize';
import sequelize from '../src/libs/db.js';
import {
    Attendance,
    Employee,
    LeaveBalance,
    LeaveRequest,
    LeaveType,
    SalaryStructure,
    User,
} from '../src/models/index.js';

const COMPANY_ID = 1;
const YEAR = 2026;
const MONTH = 6;

// June 2026: 1 Mon → 30 Tue. Mon-Fri workdays (22 ngày).
const workdays2026Jun = [];
for (let d = 1; d <= 30; d++) {
    const dt = new Date(YEAR, MONTH - 1, d);
    const dow = dt.getDay(); // 0=Sun 6=Sat
    if (dow >= 1 && dow <= 5) {
        workdays2026Jun.push(d);
    }
}
// 22 workdays: [1,2,3,4,5, 8,9,10,11,12, 15,16,17,18,19, 22,23,24,25,26, 29,30]

const dateStr = (day) => `2026-06-${String(day).padStart(2, '0')}`;
const atTime = (day, hh, mm = 0) => new Date(YEAR, MONTH - 1, day, hh, mm, 0);

async function run() {
    try {
        await sequelize.authenticate();
        console.log('✓ Đã kết nối database');

        // ─── Load employees + creator user ───
        const [emp1, emp2, creator] = await Promise.all([
            Employee.findOne({ where: { companyId: COMPANY_ID, code: 'FPT001' } }),
            Employee.findOne({ where: { companyId: COMPANY_ID, code: 'FPT002' } }),
            User.findOne({ where: { companyId: COMPANY_ID, role: 'admin' } }),
        ]);
        if (!emp1 || !emp2) throw new Error('Không tìm thấy FPT001 hoặc FPT002');
        if (!creator) throw new Error('Không tìm thấy admin user');
        console.log(`✓ FPT001 id=${emp1.id}, FPT002 id=${emp2.id}, creator user id=${creator.id}`);

        // ─── STEP 1: Salary structure FPT002 tháng 6 (basic 12M) ───
        const existSalary = await SalaryStructure.findOne({
            where: {
                companyId: COMPANY_ID,
                employeeId: emp2.id,
                effectiveFrom: '2026-01-01',
            },
        });
        if (!existSalary) {
            await SalaryStructure.create({
                companyId: COMPANY_ID,
                employeeId: emp2.id,
                basicSalary: 12000000,
                bhxhSalary: 12000000,
                effectiveFrom: '2026-01-01',
                effectiveTo: '2026-06-30',
                note: 'Lương thử việc/junior tháng 6/2026 (seed test)',
            });
            console.log('✓ Đã tạo SalaryStructure FPT002 tháng 6 (basic 12M)');
        } else {
            console.log('· SalaryStructure FPT002 tháng 6 đã tồn tại');
        }

        // ─── STEP 2: Leave types lookup ───
        const [ltAnnual, ltSick] = await Promise.all([
            LeaveType.findOne({ where: { companyId: COMPANY_ID, code: 'ANNUAL' } }),
            LeaveType.findOne({ where: { companyId: COMPANY_ID, code: 'SICK' } }),
        ]);
        if (!ltAnnual || !ltSick) throw new Error('Thiếu LeaveType ANNUAL hoặc SICK — chạy seed leave types trước');
        console.log(`✓ LeaveType ANNUAL id=${ltAnnual.id}, SICK id=${ltSick.id}`);

        // ─── STEP 3: Leave requests approved ───
        // FPT001: nghỉ phép năm 15-16/6/2026 (Mon-Tue)
        let lr1 = await LeaveRequest.findOne({
            where: {
                companyId: COMPANY_ID, employeeId: emp1.id, leaveTypeId: ltAnnual.id,
                fromDate: dateStr(15), toDate: dateStr(16),
            },
        });
        if (!lr1) {
            lr1 = await LeaveRequest.create({
                companyId: COMPANY_ID, employeeId: emp1.id, leaveTypeId: ltAnnual.id,
                fromDate: dateStr(15), toDate: dateStr(16),
                days: 2, reason: 'Nghỉ phép năm — về quê (seed test)',
                status: 'approved',
                createdBy: emp1.userId || creator.id,
                managerApprovedBy: creator.id, managerApprovedAt: new Date('2026-06-10T09:00:00'),
                managerNote: 'Approved by admin bypass (seed)',
                hrApprovedBy: creator.id, hrApprovedAt: new Date('2026-06-10T09:00:00'),
                hrNote: 'Approved by admin bypass (seed)',
            });
            console.log('✓ Đã tạo LeaveRequest FPT001 (ANNUAL 15-16/6, approved)');
        } else {
            console.log('· LeaveRequest FPT001 ANNUAL 15-16/6 đã tồn tại');
        }

        // FPT002: nghỉ ốm 22-23/6/2026 (Mon-Tue)
        let lr2 = await LeaveRequest.findOne({
            where: {
                companyId: COMPANY_ID, employeeId: emp2.id, leaveTypeId: ltSick.id,
                fromDate: dateStr(22), toDate: dateStr(23),
            },
        });
        if (!lr2) {
            lr2 = await LeaveRequest.create({
                companyId: COMPANY_ID, employeeId: emp2.id, leaveTypeId: ltSick.id,
                fromDate: dateStr(22), toDate: dateStr(23),
                days: 2, reason: 'Nghỉ ốm — cảm cúm (seed test)',
                status: 'approved',
                createdBy: emp2.userId || creator.id,
                managerApprovedBy: creator.id, managerApprovedAt: new Date('2026-06-21T10:00:00'),
                managerNote: 'Approved by admin bypass (seed)',
                hrApprovedBy: creator.id, hrApprovedAt: new Date('2026-06-21T10:00:00'),
                hrNote: 'Approved by admin bypass (seed)',
            });
            console.log('✓ Đã tạo LeaveRequest FPT002 (SICK 22-23/6, approved)');
        } else {
            console.log('· LeaveRequest FPT002 SICK 22-23/6 đã tồn tại');
        }

        // ─── STEP 4: Update LeaveBalance (usedDays) ───
        const upsertBalance = async (employeeId, leaveTypeId, allocatedDays, usedDays) => {
            const [row, created] = await LeaveBalance.findOrCreate({
                where: { companyId: COMPANY_ID, employeeId, leaveTypeId, year: YEAR },
                defaults: {
                    companyId: COMPANY_ID, employeeId, leaveTypeId, year: YEAR,
                    allocatedDays, usedDays, carriedOverDays: 0,
                },
            });
            if (!created && Number(row.usedDays) < usedDays) {
                await row.update({ usedDays, allocatedDays: Math.max(Number(row.allocatedDays), allocatedDays) });
            }
        };
        await upsertBalance(emp1.id, ltAnnual.id, 12, 2); // FPT001 dùng 2/12 ngày phép năm
        await upsertBalance(emp2.id, ltSick.id, 30, 2);   // FPT002 dùng 2 ngày ốm
        console.log('✓ Đã upsert LeaveBalance');

        // ─── STEP 5: Attendance FPT001 ───
        // 22 workdays: 18 on_time + 2 late + 2 on_leave (15,16) + 1 OT day (8)
        // Late days: 3/6 (Wed), 24/6 (Wed)
        const lateDays1 = new Set([3, 24]);
        const otDay1 = 8; // OT 2h
        const onLeaveDays1 = new Set([15, 16]);

        for (const day of workdays2026Jun) {
            const exists = await Attendance.findOne({
                where: { companyId: COMPANY_ID, employeeId: emp1.id, date: dateStr(day) },
            });
            if (exists) continue;

            let record;
            if (onLeaveDays1.has(day)) {
                record = {
                    status: 'on_leave', checkInAt: null, checkOutAt: null,
                    hoursWorked: 0, otHours: 0, lateMinutes: 0, earlyMinutes: 0,
                    note: 'Nghỉ phép năm (seed)',
                };
            } else if (lateDays1.has(day)) {
                record = {
                    status: 'late',
                    checkInAt: atTime(day, 8, 30), checkOutAt: atTime(day, 17, 30),
                    hoursWorked: 8, otHours: 0,
                    lateMinutes: 30, earlyMinutes: 0,
                    checkInIp: '192.168.1.10', checkOutIp: '192.168.1.10',
                    note: 'Đi muộn 30 phút (seed)',
                };
            } else if (day === otDay1) {
                record = {
                    status: 'on_time',
                    checkInAt: atTime(day, 8, 0), checkOutAt: atTime(day, 19, 30),
                    hoursWorked: 8, otHours: 2,
                    lateMinutes: 0, earlyMinutes: 0,
                    checkInIp: '192.168.1.10', checkOutIp: '192.168.1.10',
                    note: 'OT 2h (seed)',
                };
            } else {
                record = {
                    status: 'on_time',
                    checkInAt: atTime(day, 8, 0), checkOutAt: atTime(day, 17, 30),
                    hoursWorked: 8, otHours: 0,
                    lateMinutes: 0, earlyMinutes: 0,
                    checkInIp: '192.168.1.10', checkOutIp: '192.168.1.10',
                };
            }
            await Attendance.create({
                companyId: COMPANY_ID, employeeId: emp1.id, date: dateStr(day),
                ...record,
            });
        }
        console.log('✓ Đã seed Attendance FPT001 tháng 6/2026 (22 records)');

        // ─── STEP 6: Attendance FPT002 ───
        // 22 workdays: 19 on_time + 1 late + 2 on_leave (22,23)
        const lateDays2 = new Set([10]); // late 20 phút
        const onLeaveDays2 = new Set([22, 23]);

        for (const day of workdays2026Jun) {
            const exists = await Attendance.findOne({
                where: { companyId: COMPANY_ID, employeeId: emp2.id, date: dateStr(day) },
            });
            if (exists) continue;

            let record;
            if (onLeaveDays2.has(day)) {
                record = {
                    status: 'on_leave', checkInAt: null, checkOutAt: null,
                    hoursWorked: 0, otHours: 0, lateMinutes: 0, earlyMinutes: 0,
                    note: 'Nghỉ ốm — cảm cúm (seed)',
                };
            } else if (lateDays2.has(day)) {
                record = {
                    status: 'late',
                    checkInAt: atTime(day, 8, 20), checkOutAt: atTime(day, 17, 30),
                    hoursWorked: 8, otHours: 0,
                    lateMinutes: 20, earlyMinutes: 0,
                    checkInIp: '192.168.1.11', checkOutIp: '192.168.1.11',
                    note: 'Đi muộn 20 phút (seed)',
                };
            } else {
                record = {
                    status: 'on_time',
                    checkInAt: atTime(day, 8, 0), checkOutAt: atTime(day, 17, 30),
                    hoursWorked: 8, otHours: 0,
                    lateMinutes: 0, earlyMinutes: 0,
                    checkInIp: '192.168.1.11', checkOutIp: '192.168.1.11',
                };
            }
            await Attendance.create({
                companyId: COMPANY_ID, employeeId: emp2.id, date: dateStr(day),
                ...record,
            });
        }
        console.log('✓ Đã seed Attendance FPT002 tháng 6/2026 (22 records)');

        // ─── Summary ───
        const countA1 = await Attendance.count({
            where: {
                companyId: COMPANY_ID, employeeId: emp1.id,
                date: { [Op.between]: ['2026-06-01', '2026-06-30'] },
            },
        });
        const countA2 = await Attendance.count({
            where: {
                companyId: COMPANY_ID, employeeId: emp2.id,
                date: { [Op.between]: ['2026-06-01', '2026-06-30'] },
            },
        });

        console.log('\n═══════════════════════════════════════');
        console.log('SEED HOÀN TẤT — tháng 6/2026');
        console.log('═══════════════════════════════════════');
        console.log(`FPT001 Nguyen An:`);
        console.log(`  - SalaryStructure 15M (đã có sẵn)`);
        console.log(`  - Attendance: ${countA1}/22 ngày (18 on_time + 2 late + 2 on_leave, 1 ngày OT 2h ngày 8/6)`);
        console.log(`  - Leave: ANNUAL 15-16/6, approved`);
        console.log(`\nFPT002 Tran Binh:`);
        console.log(`  - SalaryStructure 12M (mới tạo, đến 30/6)`);
        console.log(`  - Attendance: ${countA2}/22 ngày (19 on_time + 1 late + 2 on_leave)`);
        console.log(`  - Leave: SICK 22-23/6, approved`);
        console.log(`\n→ Bạn vào UI Lương > Bảng lương → filter tháng 6/2026 → bấm "Tính lương tháng 06/2026"`);
        console.log(`→ Verify các số + workflow chốt → mark-paid`);
        console.log('═══════════════════════════════════════');
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi seed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

run();
