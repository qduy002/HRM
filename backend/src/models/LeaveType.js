import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';

const LeaveType = sequelize.define('LeaveType', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Company, key: 'id' },
        onDelete: 'CASCADE',
    },
    code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: { notEmpty: true },
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { notEmpty: true },
    },
    daysPerYear: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: true,
    },
    isPaid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    requiresApproval: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    color: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'leave_types',
    timestamps: true,
    indexes: [
        { name: 'leave_types_company_code_unique', unique: true, fields: ['companyId', 'code'] },
    ],
});

LeaveType.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(LeaveType, { foreignKey: 'companyId' });

export default LeaveType;
