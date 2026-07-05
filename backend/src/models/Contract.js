import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Employee from './Employee.js';

const Contract = sequelize.define('Contract', {
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

    code: { type: DataTypes.STRING(50), allowNull: false, validate: { notEmpty: true } },
    type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: { isIn: [['probation', 'fixed_term', 'indefinite', 'seasonal', 'collaboration']] },
    },
    signedDate: { type: DataTypes.DATEONLY, allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    basicSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: false, validate: { min: 0 } },
    allowanceAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    workingHoursPerWeek: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 40 },
    probationEndDate: { type: DataTypes.DATEONLY, allowNull: true },

    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active',
        validate: { isIn: [['draft', 'active', 'expired', 'terminated']] },
    },
    terminatedDate: { type: DataTypes.DATEONLY, allowNull: true },
    terminatedReason: { type: DataTypes.TEXT, allowNull: true },
    fileUrl: { type: DataTypes.STRING(500), allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'contracts',
    timestamps: true,
    indexes: [
        { name: 'contracts_company_code_unique', unique: true, fields: ['companyId', 'code'] },
        { name: 'contracts_employee_idx', fields: ['employeeId'] },
        { name: 'contracts_employee_status_idx', fields: ['employeeId', 'status'] },
    ],
});

Contract.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Contract, { foreignKey: 'companyId' });

Contract.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(Contract, { foreignKey: 'employeeId' });

export default Contract;
