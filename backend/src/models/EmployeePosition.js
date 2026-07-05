import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Employee from './Employee.js';
import Branch from './Branch.js';
import Department from './Department.js';
import Position from './Position.js';
import Level from './Level.js';

const EmployeePosition = sequelize.define('EmployeePosition', {
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
    branchId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Branch, key: 'id' },
        onDelete: 'RESTRICT',
    },
    departmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Department, key: 'id' },
        onDelete: 'RESTRICT',
    },
    positionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Position, key: 'id' },
        onDelete: 'RESTRICT',
    },
    levelId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: Level, key: 'id' },
        onDelete: 'SET NULL',
    },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'employee_positions',
    timestamps: true,
    indexes: [
        { name: 'emp_positions_employee_idx', fields: ['employeeId'] },
        { name: 'emp_positions_current_idx', fields: ['employeeId', 'effectiveTo'] },
    ],
});

EmployeePosition.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(EmployeePosition, { foreignKey: 'employeeId' });

EmployeePosition.belongsTo(Branch, { foreignKey: 'branchId' });
EmployeePosition.belongsTo(Department, { foreignKey: 'departmentId' });
EmployeePosition.belongsTo(Position, { foreignKey: 'positionId' });
EmployeePosition.belongsTo(Level, { foreignKey: 'levelId' });

export default EmployeePosition;
