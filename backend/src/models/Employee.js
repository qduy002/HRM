import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import User from './User.js';
import Branch from './Branch.js';
import Department from './Department.js';

const Employee = sequelize.define('Employee', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Company, key: 'id' },
        onDelete: 'CASCADE',
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: User, key: 'id' },
        onDelete: 'SET NULL',
    },
    code: {
        type: DataTypes.STRING(20),
        allowNull: false,
    },

    // Cá nhân
    firstName: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true } },
    lastName: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true } },
    displayName: { type: DataTypes.STRING(200), allowNull: false },
    gender: {
        type: DataTypes.STRING(10),
        allowNull: true,
        validate: { isIn: [['male', 'female', 'other']] },
    },
    dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true },
    placeOfBirth: { type: DataTypes.STRING(255), allowNull: true },
    nationality: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'Việt Nam' },
    ethnicity: { type: DataTypes.STRING(50), allowNull: true },
    religion: { type: DataTypes.STRING(50), allowNull: true },
    maritalStatus: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: { isIn: [['single', 'married', 'divorced', 'widowed']] },
    },

    // Giấy tờ
    identityNumber: { type: DataTypes.STRING(20), allowNull: true },
    identityIssueDate: { type: DataTypes.DATEONLY, allowNull: true },
    identityIssuePlace: { type: DataTypes.STRING(255), allowNull: true },
    taxCode: { type: DataTypes.STRING(20), allowNull: true },
    socialInsuranceNumber: { type: DataTypes.STRING(20), allowNull: true },

    // Liên hệ
    phone: { type: DataTypes.STRING(20), allowNull: true },
    personalEmail: { type: DataTypes.STRING(255), allowNull: true },
    currentAddress: { type: DataTypes.TEXT, allowNull: true },
    permanentAddress: { type: DataTypes.TEXT, allowNull: true },

    // Ngân hàng
    bankAccountNumber: { type: DataTypes.STRING(30), allowNull: true },
    bankAccountName: { type: DataTypes.STRING(200), allowNull: true },
    bankName: { type: DataTypes.STRING(100), allowNull: true },
    bankBranch: { type: DataTypes.STRING(200), allowNull: true },

    // Công việc
    joinedDate: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'probation',
        validate: { isIn: [['probation', 'active', 'on_leave', 'terminated']] },
    },
    terminatedDate: { type: DataTypes.DATEONLY, allowNull: true },
    terminatedReason: { type: DataTypes.TEXT, allowNull: true },
    avatarUrl: { type: DataTypes.STRING, allowNull: true },
}, {
    tableName: 'employees',
    timestamps: true,
    indexes: [
        { name: 'employees_company_code_unique', unique: true, fields: ['companyId', 'code'] },
        { name: 'employees_company_identity_unique', unique: true, fields: ['companyId', 'identityNumber'] },
        { name: 'employees_company_userid_unique', unique: true, fields: ['companyId', 'userId'] },
        { name: 'employees_company_status_idx', fields: ['companyId', 'status'] },
    ],
});

Employee.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Employee, { foreignKey: 'companyId' });

Employee.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(Employee, { foreignKey: 'userId' });

// Association manager: được đăng ký ở đây (sau khi cả Branch/Department và Employee đều tồn tại) để tránh circular import.
Branch.belongsTo(Employee, { as: 'manager', foreignKey: 'managerId', constraints: false });
Department.belongsTo(Employee, { as: 'manager', foreignKey: 'managerId', constraints: false });

export default Employee;
