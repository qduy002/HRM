import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Employee from './Employee.js';
import Allowance from './Allowance.js';

// Phụ cấp gán cho NV. amount override defaultAmount của Allowance nếu cần.
const EmployeeAllowance = sequelize.define('EmployeeAllowance', {
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
    allowanceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Allowance, key: 'id' },
        onDelete: 'RESTRICT',
    },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, validate: { min: 0 } },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'employee_allowances',
    timestamps: true,
    indexes: [
        { name: 'employee_allowances_employee_idx', fields: ['employeeId'] },
        { name: 'employee_allowances_current_idx', fields: ['employeeId', 'effectiveTo'] },
    ],
});

EmployeeAllowance.belongsTo(Employee, { foreignKey: 'employeeId' });
EmployeeAllowance.belongsTo(Allowance, { foreignKey: 'allowanceId' });
Employee.hasMany(EmployeeAllowance, { foreignKey: 'employeeId' });
Allowance.hasMany(EmployeeAllowance, { foreignKey: 'allowanceId' });

export default EmployeeAllowance;
