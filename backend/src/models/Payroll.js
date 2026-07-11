import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Employee from './Employee.js';
import User from './User.js';

// Bảng lương tháng của 1 NV. Sau khi finalized, không cho edit trực tiếp
// (muốn sửa phải unlock → về draft → sửa → finalize lại).
const Payroll = sequelize.define('Payroll', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Company, key: 'id' },
        onDelete: 'CASCADE',
    },
    employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Employee, key: 'id' },
        onDelete: 'CASCADE',
    },
    month: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 12 } },
    year: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 2000, max: 2100 } },
    fromDate: { type: DataTypes.DATEONLY, allowNull: false },
    toDate: { type: DataTypes.DATEONLY, allowNull: false },

    // Snapshot lương lúc tính
    basicSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    bhxhSalaryBase: { type: DataTypes.DECIMAL(15, 2), allowNull: false },

    // Metrics
    workingDaysStandard: { type: DataTypes.DECIMAL(5, 1), allowNull: false },
    actualPaidDays: { type: DataTypes.DECIMAL(5, 1), allowNull: false },
    otHours: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },

    // Gross breakdown
    grossSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    totalTaxableAllowance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    totalNonTaxableAllowance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },

    // Insurance (NV đóng)
    bhxhAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    bhytAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    bhtnAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    totalInsuranceEmployee: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },

    // Personal deduction snapshot
    selfDeduction: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    dependentCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    dependentDeduction: { type: DataTypes.DECIMAL(15, 2), allowNull: false },

    // Tax
    taxableIncome: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    personalIncomeTax: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },

    // Net
    netSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: false },

    // Workflow
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'draft',
        validate: { isIn: [['draft', 'finalized', 'paid']] },
    },
    finalizedBy: { type: DataTypes.INTEGER, allowNull: true, references: { model: User, key: 'id' } },
    finalizedAt: { type: DataTypes.DATE, allowNull: true },
    paidBy: { type: DataTypes.INTEGER, allowNull: true, references: { model: User, key: 'id' } },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    unlockCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    note: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'payrolls',
    timestamps: true,
    indexes: [
        {
            name: 'payrolls_employee_month_year_unique',
            unique: true,
            fields: ['companyId', 'employeeId', 'month', 'year'],
        },
        { name: 'payrolls_company_month_year_idx', fields: ['companyId', 'month', 'year'] },
        { name: 'payrolls_status_idx', fields: ['companyId', 'status'] },
    ],
});

Payroll.belongsTo(Company, { foreignKey: 'companyId' });
Payroll.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(Payroll, { foreignKey: 'employeeId' });
Payroll.belongsTo(User, { as: 'finalizer', foreignKey: 'finalizedBy' });
Payroll.belongsTo(User, { as: 'payer', foreignKey: 'paidBy' });

export default Payroll;
