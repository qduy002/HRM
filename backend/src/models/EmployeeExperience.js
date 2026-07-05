import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Employee from './Employee.js';

const EmployeeExperience = sequelize.define('EmployeeExperience', {
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

    companyName: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
    position: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
    fromDate: { type: DataTypes.DATEONLY, allowNull: true },
    toDate: { type: DataTypes.DATEONLY, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'employee_experiences',
    timestamps: true,
    indexes: [
        { name: 'emp_experiences_employee_idx', fields: ['employeeId'] },
    ],
});

EmployeeExperience.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(EmployeeExperience, { foreignKey: 'employeeId' });

export default EmployeeExperience;
