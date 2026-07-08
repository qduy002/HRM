import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Employee from './Employee.js';

const Attendance = sequelize.define('Attendance', {
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
    date: { type: DataTypes.DATEONLY, allowNull: false },
    checkInAt: { type: DataTypes.DATE, allowNull: true },
    checkOutAt: { type: DataTypes.DATE, allowNull: true },
    hoursWorked: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    otHours: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'on_time',
        validate: {
            isIn: [['on_time', 'late', 'early_leave', 'absent', 'on_leave', 'holiday']],
        },
    },
    lateMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    earlyMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    checkInIp: { type: DataTypes.STRING(45), allowNull: true },
    checkOutIp: { type: DataTypes.STRING(45), allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'attendances',
    timestamps: true,
    indexes: [
        {
            name: 'attendances_company_employee_date_unique',
            unique: true,
            fields: ['companyId', 'employeeId', 'date'],
        },
        { name: 'attendances_company_date_idx', fields: ['companyId', 'date'] },
        { name: 'attendances_employee_month_idx', fields: ['employeeId', 'date'] },
    ],
});

Attendance.belongsTo(Company, { foreignKey: 'companyId' });
Attendance.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(Attendance, { foreignKey: 'employeeId' });

export default Attendance;
