import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Payroll from './Payroll.js';

// Chi tiết breakdown 1 dòng lương. FE dùng để hiển thị payslip.
// type: earning (thu nhập) | deduction (khấu trừ khác) | insurance | tax
const PayrollItem = sequelize.define('PayrollItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Company, key: 'id' },
        onDelete: 'CASCADE',
    },
    payrollId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Payroll, key: 'id' },
        onDelete: 'CASCADE',
    },
    type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: { isIn: [['earning', 'deduction', 'insurance', 'tax']] },
    },
    code: { type: DataTypes.STRING(30), allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
    tableName: 'payroll_items',
    timestamps: true,
    indexes: [
        { name: 'payroll_items_payroll_idx', fields: ['payrollId'] },
    ],
});

PayrollItem.belongsTo(Payroll, { foreignKey: 'payrollId' });
Payroll.hasMany(PayrollItem, { foreignKey: 'payrollId' });

export default PayrollItem;
