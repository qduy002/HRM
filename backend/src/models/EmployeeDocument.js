import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Employee from './Employee.js';
import User from './User.js';

const EmployeeDocument = sequelize.define('EmployeeDocument', {
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
    uploadedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: User, key: 'id' },
        onDelete: 'SET NULL',
    },

    type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: {
            isIn: [
                [
                    'cv',
                    'identity_front',
                    'identity_back',
                    'contract',
                    'diploma',
                    'certificate',
                    'other',
                ],
            ],
        },
    },
    name: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
    fileUrl: { type: DataTypes.STRING(500), allowNull: false, validate: { notEmpty: true } },
    fileSize: { type: DataTypes.INTEGER, allowNull: true },
    mimeType: { type: DataTypes.STRING(100), allowNull: true },
}, {
    tableName: 'employee_documents',
    timestamps: true,
    indexes: [
        { name: 'emp_documents_employee_idx', fields: ['employeeId'] },
    ],
});

EmployeeDocument.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(EmployeeDocument, { foreignKey: 'employeeId' });

EmployeeDocument.belongsTo(User, { as: 'uploader', foreignKey: 'uploadedBy' });

export default EmployeeDocument;
