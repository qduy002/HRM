import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';

const Company = sequelize.define('Company', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            is: {
                args: /^[a-z0-9-]{2,50}$/,
                msg: 'Mã công ty chỉ chứa chữ thường, số và dấu gạch ngang, độ dài 2-50',
            },
        },
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true },
    },
    taxCode: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    contactEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: { isEmail: true },
    },
    contactPhone: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'trial',
        validate: {
            isIn: [['trial', 'active', 'suspended']],
        },
    },
    trialEndsAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    employeeCodePrefix: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
}, {
    tableName: 'companies',
    timestamps: true,
});

export default Company;
