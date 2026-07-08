import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Employee from './Employee.js';
import LeaveType from './LeaveType.js';

const LeaveBalance = sequelize.define('LeaveBalance', {
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
    leaveTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: LeaveType, key: 'id' },
        onDelete: 'CASCADE',
    },
    year: { type: DataTypes.INTEGER, allowNull: false },
    allocatedDays: { type: DataTypes.DECIMAL(5, 1), allowNull: false, defaultValue: 0 },
    usedDays: { type: DataTypes.DECIMAL(5, 1), allowNull: false, defaultValue: 0 },
    carriedOverDays: { type: DataTypes.DECIMAL(5, 1), allowNull: false, defaultValue: 0 },
}, {
    tableName: 'leave_balances',
    timestamps: true,
    indexes: [
        {
            name: 'leave_balances_employee_type_year_unique',
            unique: true,
            fields: ['employeeId', 'leaveTypeId', 'year'],
        },
    ],
});

LeaveBalance.belongsTo(Employee, { foreignKey: 'employeeId' });
LeaveBalance.belongsTo(LeaveType, { foreignKey: 'leaveTypeId' });
Employee.hasMany(LeaveBalance, { foreignKey: 'employeeId' });
LeaveType.hasMany(LeaveBalance, { foreignKey: 'leaveTypeId' });

export default LeaveBalance;
