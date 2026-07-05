import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';

const Branch = sequelize.define('Branch', {
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
    address: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    // FK sẽ được thêm ở Batch B khi có Employee model
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
    tableName: 'branches',
    timestamps: true,
    indexes: [
        { name: 'branches_company_code_unique', unique: true, fields: ['companyId', 'code'] },
    ],
});

Branch.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Branch, { foreignKey: 'companyId' });

export default Branch;
