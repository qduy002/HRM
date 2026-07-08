import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Employee from './Employee.js';
import Shift from './Shift.js';

const WorkSchedule = sequelize.define('WorkSchedule', {
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
    shiftId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Shift, key: 'id' },
        onDelete: 'RESTRICT',
    },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'work_schedules',
    timestamps: true,
    indexes: [
        { name: 'work_schedules_employee_idx', fields: ['employeeId'] },
        { name: 'work_schedules_current_idx', fields: ['employeeId', 'effectiveTo'] },
    ],
});

WorkSchedule.belongsTo(Company, { foreignKey: 'companyId' });
WorkSchedule.belongsTo(Employee, { foreignKey: 'employeeId' });
WorkSchedule.belongsTo(Shift, { foreignKey: 'shiftId' });
Employee.hasMany(WorkSchedule, { foreignKey: 'employeeId' });
Shift.hasMany(WorkSchedule, { foreignKey: 'shiftId' });

export default WorkSchedule;
