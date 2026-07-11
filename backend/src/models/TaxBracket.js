import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';

// Global — 7 bậc thuế TNCN VN.
// Query bằng effectiveFrom/To. Bậc cao nhất có toAmount = NULL.
const TaxBracket = sequelize.define('TaxBracket', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bracketNumber: { type: DataTypes.INTEGER, allowNull: false }, // 1-7
    fromAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    toAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: true }, // NULL = infinity
    rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false }, // 5, 10, 15, 20, 25, 30, 35
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
}, {
    tableName: 'tax_brackets',
    timestamps: true,
    indexes: [
        { name: 'tax_brackets_bracket_effective_idx', fields: ['bracketNumber', 'effectiveFrom'] },
    ],
});

export default TaxBracket;
