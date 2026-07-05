import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Employee from './Employee.js';

const EmployeeEducation = sequelize.define('EmployeeEducation', {
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

    level: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
            isIn: [
                [
                    'primary',
                    'secondary',
                    'high_school',
                    'vocational',
                    'associate',
                    'bachelor',
                    'master',
                    'doctorate',
                ],
            ],
        },
    },
    school: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
    major: { type: DataTypes.STRING(255), allowNull: true },
    graduationYear: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1900, max: 2100 } },
    gpa: { type: DataTypes.DECIMAL(3, 2), allowNull: true, validate: { min: 0, max: 10 } },
    note: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'employee_educations',
    timestamps: true,
    indexes: [
        { name: 'emp_educations_employee_idx', fields: ['employeeId'] },
    ],
});

EmployeeEducation.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(EmployeeEducation, { foreignKey: 'employeeId' });

export default EmployeeEducation;
