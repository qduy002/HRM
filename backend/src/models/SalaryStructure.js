import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';
import Employee from './Employee.js';

// Versioned salary — không UPDATE, tăng lương = tạo record mới với effectiveFrom mới.
// Record cũ được set effectiveTo. Query lương tháng X = lấy record có effectiveFrom <= X và (effectiveTo IS NULL OR effectiveTo >= X).
const SalaryStructure = sequelize.define('SalaryStructure', {
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
    basicSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: false, validate: { min: 0 } },
    // Lương đóng BHXH có thể khác lương cơ bản (VD lương thực nhận cao hơn lương đóng BH).
    // Sẽ bị cap 20x lương tối thiểu vùng khi tính insurance.
    bhxhSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: false, validate: { min: 0 } },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'salary_structures',
    timestamps: true,
    indexes: [
        { name: 'salary_structures_employee_idx', fields: ['employeeId'] },
        { name: 'salary_structures_current_idx', fields: ['employeeId', 'effectiveTo'] },
    ],
});

SalaryStructure.belongsTo(Company, { foreignKey: 'companyId' });
SalaryStructure.belongsTo(Employee, { foreignKey: 'employeeId' });
Employee.hasMany(SalaryStructure, { foreignKey: 'employeeId' });

export default SalaryStructure;
