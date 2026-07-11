import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';

// Global — giảm trừ bản thân + người phụ thuộc theo luật TNCN.
// Hiện hành: 11tr bản thân + 4.4tr/người phụ thuộc/tháng.
const PersonalDeductionRate = sequelize.define('PersonalDeductionRate', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    selfDeduction: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    dependentDeduction: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'personal_deduction_rates',
    timestamps: true,
    indexes: [
        { name: 'pd_rates_effective_idx', fields: ['effectiveFrom', 'effectiveTo'] },
    ],
});

export default PersonalDeductionRate;
