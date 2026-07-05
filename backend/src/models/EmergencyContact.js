import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Employee from './Employee.js';

const EmergencyContact = sequelize.define('EmergencyContact', {
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
    relationship: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true } },
    phone: { type: DataTypes.STRING(20), allowNull: false, validate: { notEmpty: true } },
    alternatePhone: { type: DataTypes.STRING(20), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1 } },
    note: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'emergency_contacts',
    timestamps: true,
    indexes: [
        { name: 'emergency_contacts_employee_idx', fields: ['employeeId'] },
    ],
});

EmergencyContact.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(EmergencyContact, { foreignKey: 'employeeId' });

export default EmergencyContact;
