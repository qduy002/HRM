import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Employee from './Employee.js';
import LeaveType from './LeaveType.js';
import User from './User.js';

const LeaveRequest = sequelize.define('LeaveRequest', {
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
        onDelete: 'RESTRICT',
    },
    fromDate: { type: DataTypes.DATEONLY, allowNull: false },
    toDate: { type: DataTypes.DATEONLY, allowNull: false },
    halfDay: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: { isIn: [['morning', 'afternoon']] },
    },
    days: { type: DataTypes.DECIMAL(4, 1), allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },

    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'manager_approved', 'approved', 'rejected', 'cancelled']],
        },
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: User, key: 'id' },
        onDelete: 'RESTRICT',
    },

    managerApprovedBy: { type: DataTypes.INTEGER, allowNull: true, references: { model: User, key: 'id' } },
    managerApprovedAt: { type: DataTypes.DATE, allowNull: true },
    managerNote: { type: DataTypes.TEXT, allowNull: true },

    hrApprovedBy: { type: DataTypes.INTEGER, allowNull: true, references: { model: User, key: 'id' } },
    hrApprovedAt: { type: DataTypes.DATE, allowNull: true },
    hrNote: { type: DataTypes.TEXT, allowNull: true },

    rejectedBy: { type: DataTypes.INTEGER, allowNull: true, references: { model: User, key: 'id' } },
    rejectedAt: { type: DataTypes.DATE, allowNull: true },
    rejectedReason: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'leave_requests',
    timestamps: true,
    indexes: [
        { name: 'leave_requests_employee_idx', fields: ['employeeId'] },
        { name: 'leave_requests_company_status_idx', fields: ['companyId', 'status'] },
        { name: 'leave_requests_date_range_idx', fields: ['fromDate', 'toDate'] },
    ],
});

LeaveRequest.belongsTo(Employee, { foreignKey: 'employeeId' });
LeaveRequest.belongsTo(LeaveType, { foreignKey: 'leaveTypeId' });
LeaveRequest.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
LeaveRequest.belongsTo(User, { as: 'managerApprover', foreignKey: 'managerApprovedBy' });
LeaveRequest.belongsTo(User, { as: 'hrApprover', foreignKey: 'hrApprovedBy' });
LeaveRequest.belongsTo(User, { as: 'rejecter', foreignKey: 'rejectedBy' });
Employee.hasMany(LeaveRequest, { foreignKey: 'employeeId' });

export default LeaveRequest;
