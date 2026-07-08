import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';

const Shift = sequelize.define('Shift', {
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
    startTime: { type: DataTypes.TIME, allowNull: false },
    endTime: { type: DataTypes.TIME, allowNull: false },
    breakMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
    tableName: 'shifts',
    timestamps: true,
    indexes: [
        { name: 'shifts_company_code_unique', unique: true, fields: ['companyId', 'code'] },
    ],
});

Shift.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Shift, { foreignKey: 'companyId' });

export default Shift;
