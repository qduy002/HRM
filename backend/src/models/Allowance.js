import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';

// Danh mục phụ cấp per tenant. VD: Ăn trưa, Xăng xe, Điện thoại, Trách nhiệm...
// isTaxable: có tính vào thu nhập chịu thuế TNCN không.
const Allowance = sequelize.define('Allowance', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Company, key: 'id' },
        onDelete: 'CASCADE',
    },
    code: { type: DataTypes.STRING(20), allowNull: false, validate: { notEmpty: true } },
    name: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true } },
    defaultAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    isTaxable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
    tableName: 'allowances',
    timestamps: true,
    indexes: [
        { name: 'allowances_company_code_unique', unique: true, fields: ['companyId', 'code'] },
    ],
});

Allowance.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Allowance, { foreignKey: 'companyId' });

export default Allowance;
