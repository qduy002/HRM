import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';

// Global — tỷ lệ đóng BHXH/BHYT/BHTN + lương tối thiểu vùng.
// Cập nhật khi luật đổi. Query dùng bản active theo effectiveFrom/To.
const InsuranceRate = sequelize.define('InsuranceRate', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    year: { type: DataTypes.INTEGER, allowNull: false },

    // Tỷ lệ % NV đóng
    bhxhEmployee: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 8.0 },
    bhytEmployee: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 1.5 },
    bhtnEmployee: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 1.0 },

    // Tỷ lệ % công ty đóng
    bhxhCompany: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 17.5 },
    bhytCompany: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 3.0 },
    bhtnCompany: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 1.0 },

    // Lương tối thiểu vùng (VND/tháng) — dùng tính cap BHXH salary
    minRegion1Wage: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    minRegion2Wage: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    minRegion3Wage: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    minRegion4Wage: { type: DataTypes.DECIMAL(15, 2), allowNull: false },

    // Cap BHXH = X lần lương tối thiểu vùng. Luật hiện hành: 20 lần.
    salaryBaseCapMultiplier: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 20 },

    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'insurance_rates',
    timestamps: true,
    indexes: [
        { name: 'insurance_rates_effective_idx', fields: ['effectiveFrom', 'effectiveTo'] },
    ],
});

export default InsuranceRate;
