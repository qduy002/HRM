import { Op } from 'sequelize';
import {
    Allowance,
    Attendance,
    Company,
    Employee,
    EmployeeAllowance,
    EmployeeDependent,
    InsuranceRate,
    PersonalDeductionRate,
    SalaryStructure,
    TaxBracket,
} from '../models/index.js';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// ----- Helpers -----

// Đếm số ngày làm việc chuẩn (weight) trong tháng dựa `companies.workingDays`.
export const getStandardWorkingDays = (year, month, workingDays) => {
    let total = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const key = DAY_KEYS[date.getDay()];
        total += workingDays[key] ?? 0;
    }
    return total;
};

// Tính thuế TNCN progressive theo bậc thang VN.
// brackets: sorted ascending, mỗi bậc có fromAmount, toAmount (nullable = ∞), rate
export const calculatePIT = (taxableIncome, brackets) => {
    if (taxableIncome <= 0) return 0;
    let tax = 0;
    for (const b of brackets) {
        const from = Number(b.fromAmount);
        const to = b.toAmount != null ? Number(b.toAmount) : Infinity;
        if (taxableIncome <= from) break;
        const inBracket = Math.min(taxableIncome, to) - from;
        tax += inBracket * (Number(b.rate) / 100);
        if (taxableIncome <= to) break;
    }
    return Math.round(tax);
};

// Đếm người phụ thuộc active trong tháng (cho giảm trừ thuế TNCN)
export const countActiveDependents = async (employeeId, monthEnd, transaction) => {
    return await EmployeeDependent.count({
        where: {
            employeeId,
            deductionStartDate: { [Op.lte]: monthEnd },
            [Op.or]: [
                { deductionEndDate: null },
                { deductionEndDate: { [Op.gte]: monthEnd } },
            ],
        },
        transaction,
    });
};

// ----- Main engine -----

// Tính payroll cho 1 NV trong tháng. Trả về payload + items (chưa lưu DB).
// Throw error nếu thiếu config bắt buộc (salary structure, insurance rates, ...).
export const computePayroll = async (companyId, employeeId, month, year, transaction) => {
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // Load parallel
    const [company, employee, salaryStruct, insRate, brackets, pdRate] = await Promise.all([
        Company.findByPk(companyId, { transaction }),
        Employee.findOne({ where: { id: employeeId, companyId }, transaction }),
        SalaryStructure.findOne({
            where: {
                companyId,
                employeeId,
                effectiveFrom: { [Op.lte]: monthEnd },
                [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: monthStart } }],
            },
            order: [['effectiveFrom', 'DESC']],
            transaction,
        }),
        InsuranceRate.findOne({
            where: {
                effectiveFrom: { [Op.lte]: monthEnd },
                [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: monthStart } }],
            },
            order: [['effectiveFrom', 'DESC']],
            transaction,
        }),
        TaxBracket.findAll({
            where: {
                effectiveFrom: { [Op.lte]: monthEnd },
                [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: monthStart } }],
            },
            order: [['bracketNumber', 'ASC']],
            transaction,
        }),
        PersonalDeductionRate.findOne({
            where: {
                effectiveFrom: { [Op.lte]: monthEnd },
                [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: monthStart } }],
            },
            order: [['effectiveFrom', 'DESC']],
            transaction,
        }),
    ]);

    if (!employee) throw Object.assign(new Error('Không tìm thấy nhân viên'), { statusCode: 404 });
    if (!salaryStruct) {
        throw Object.assign(
            new Error(`NV ${employee.code} chưa có cấu trúc lương cho tháng ${month}/${year}`),
            { statusCode: 400 },
        );
    }
    if (!insRate) throw Object.assign(new Error('Chưa seed insurance_rates. Chạy: npm run seed:payroll-refs'), { statusCode: 500 });
    if (brackets.length === 0) throw Object.assign(new Error('Chưa seed tax_brackets'), { statusCode: 500 });
    if (!pdRate) throw Object.assign(new Error('Chưa seed personal_deduction_rates'), { statusCode: 500 });

    // Load active allowances
    const empAllowances = await EmployeeAllowance.findAll({
        where: {
            companyId,
            employeeId,
            effectiveFrom: { [Op.lte]: monthEnd },
            [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: monthStart } }],
        },
        include: [{ model: Allowance, attributes: ['id', 'code', 'name', 'isTaxable'] }],
        transaction,
    });

    // Load attendance metrics
    const attendances = await Attendance.findAll({
        where: {
            companyId,
            employeeId,
            date: { [Op.between]: [monthStart, monthEnd] },
        },
        attributes: ['status', 'otHours'],
        transaction,
    });

    const paidStatuses = new Set(['on_time', 'late', 'early_leave', 'on_leave', 'holiday']);
    const actualPaidDays = attendances.filter((a) => paidStatuses.has(a.status)).length;
    const otHours = attendances.reduce((sum, a) => sum + Number(a.otHours || 0), 0);

    // Standard working days theo companies.workingDays
    const workingDays = company.workingDays || { mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 0, sun: 0 };
    const standardWorkingDays = getStandardWorkingDays(year, month, workingDays);

    // ----- Calculation -----
    const basicSalary = Number(salaryStruct.basicSalary);
    const proratedBasic =
        standardWorkingDays > 0
            ? Math.round((basicSalary * actualPaidDays) / standardWorkingDays)
            : 0;

    // OT pay = otHours × (basicSalary / (standardDays × 8)) × 1.5
    const hourlyRate = standardWorkingDays > 0 ? basicSalary / (standardWorkingDays * 8) : 0;
    const otPay = Math.round(otHours * hourlyRate * 1.5);

    // Allowances
    let totalTaxableAllowance = 0;
    let totalNonTaxableAllowance = 0;
    for (const ea of empAllowances) {
        const amount = Number(ea.amount);
        if (ea.Allowance?.isTaxable) totalTaxableAllowance += amount;
        else totalNonTaxableAllowance += amount;
    }

    // Gross salary
    const grossSalary = proratedBasic + otPay + totalTaxableAllowance + totalNonTaxableAllowance;

    // BHXH salary base (cap 20× minWage vùng 1 mặc định)
    const bhxhSalaryRaw = Number(salaryStruct.bhxhSalary);
    const minWage = Number(insRate.minRegion1Wage);
    const cap = minWage * insRate.salaryBaseCapMultiplier;
    const bhxhSalaryBase = Math.min(bhxhSalaryRaw, cap);

    // Employee insurance
    const bhxhAmount = Math.round((bhxhSalaryBase * Number(insRate.bhxhEmployee)) / 100);
    const bhytAmount = Math.round((bhxhSalaryBase * Number(insRate.bhytEmployee)) / 100);
    const bhtnAmount = Math.round((bhxhSalaryBase * Number(insRate.bhtnEmployee)) / 100);
    const totalInsuranceEmployee = bhxhAmount + bhytAmount + bhtnAmount;

    // Personal deduction
    const dependentCount = await countActiveDependents(employeeId, monthEnd, transaction);
    const selfDeduction = Number(pdRate.selfDeduction);
    const dependentDeduction = Number(pdRate.dependentDeduction);

    // Taxable income (không tính allowance non-taxable)
    const taxableIncome = Math.max(
        0,
        proratedBasic + otPay + totalTaxableAllowance
            - totalInsuranceEmployee
            - selfDeduction
            - dependentCount * dependentDeduction,
    );

    const personalIncomeTax = calculatePIT(taxableIncome, brackets);

    const netSalary = grossSalary - totalInsuranceEmployee - personalIncomeTax;

    // ----- Build items array -----
    const items = [];
    let sortOrder = 0;

    items.push({
        type: 'earning',
        code: 'BASIC',
        name: `Lương cơ bản (${actualPaidDays.toFixed(1)}/${standardWorkingDays.toFixed(1)} ngày)`,
        amount: proratedBasic,
        sortOrder: sortOrder++,
    });
    if (otPay > 0) {
        items.push({
            type: 'earning',
            code: 'OT',
            name: `Lương OT (${otHours.toFixed(2)}h × 150%)`,
            amount: otPay,
            sortOrder: sortOrder++,
        });
    }
    for (const ea of empAllowances) {
        items.push({
            type: 'earning',
            code: ea.Allowance.code,
            name: `${ea.Allowance.name}${ea.Allowance.isTaxable ? '' : ' (miễn thuế)'}`,
            amount: Number(ea.amount),
            sortOrder: sortOrder++,
        });
    }
    items.push({
        type: 'insurance',
        code: 'BHXH',
        name: `BHXH ${Number(insRate.bhxhEmployee).toFixed(1)}%`,
        amount: bhxhAmount,
        sortOrder: sortOrder++,
    });
    items.push({
        type: 'insurance',
        code: 'BHYT',
        name: `BHYT ${Number(insRate.bhytEmployee).toFixed(1)}%`,
        amount: bhytAmount,
        sortOrder: sortOrder++,
    });
    items.push({
        type: 'insurance',
        code: 'BHTN',
        name: `BHTN ${Number(insRate.bhtnEmployee).toFixed(1)}%`,
        amount: bhtnAmount,
        sortOrder: sortOrder++,
    });
    if (personalIncomeTax > 0) {
        items.push({
            type: 'tax',
            code: 'PIT',
            name: `Thuế TNCN (TN chịu thuế ${taxableIncome.toLocaleString('vi-VN')} ₫)`,
            amount: personalIncomeTax,
            sortOrder: sortOrder++,
        });
    }

    return {
        payroll: {
            month,
            year,
            fromDate: monthStart,
            toDate: monthEnd,
            basicSalary,
            bhxhSalaryBase,
            workingDaysStandard: standardWorkingDays,
            actualPaidDays,
            otHours,
            grossSalary,
            totalTaxableAllowance,
            totalNonTaxableAllowance,
            bhxhAmount,
            bhytAmount,
            bhtnAmount,
            totalInsuranceEmployee,
            selfDeduction,
            dependentCount,
            dependentDeduction,
            taxableIncome,
            personalIncomeTax,
            netSalary,
        },
        items,
    };
};
