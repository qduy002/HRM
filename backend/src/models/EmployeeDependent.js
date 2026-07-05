import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Employee from './Employee.js';

const EmployeeDependent = sequelize.define('EmployeeDependent', {
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

    name: { type: DataTypes.STRING(200), allowNull: false, validate: { notEmpty: true } },
    relationship: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: { isIn: [['child', 'parent', 'spouse', 'other']] },
    },
    dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true },
    identityNumber: { type: DataTypes.STRING(20), allowNull: true },
    taxCode: { type: DataTypes.STRING(20), allowNull: true },
    deductionStartDate: { type: DataTypes.DATEONLY, allowNull: false },
    deductionEndDate: { type: DataTypes.DATEONLY, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'employee_dependents',
    timestamps: true,
    indexes: [
        { name: 'emp_deps_employee_idx', fields: ['employeeId'] },
    ],
});

EmployeeDependent.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(EmployeeDependent, { foreignKey: 'employeeId' });

export default EmployeeDependent;
