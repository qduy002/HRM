import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Branch from './Branch.js';

const Department = sequelize.define('Department', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Company, key: 'id' },
        onDelete: 'CASCADE',
    },
    branchId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Branch, key: 'id' },
        onDelete: 'RESTRICT',
    },
    parentDepartmentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'departments', key: 'id' },
        onDelete: 'SET NULL',
    },
    code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: { notEmpty: true },
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true },
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    managerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'departments',
    timestamps: true,
    indexes: [
        { name: 'departments_company_code_unique', unique: true, fields: ['companyId', 'code'] },
        { name: 'departments_branch_idx', fields: ['branchId'] },
        { name: 'departments_parent_idx', fields: ['parentDepartmentId'] },
    ],
});

Department.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Department, { foreignKey: 'companyId' });

Department.belongsTo(Branch, { foreignKey: 'branchId' });
Branch.hasMany(Department, { foreignKey: 'branchId' });

Department.belongsTo(Department, { as: 'parent', foreignKey: 'parentDepartmentId' });
Department.hasMany(Department, { as: 'children', foreignKey: 'parentDepartmentId' });

export default Department;
