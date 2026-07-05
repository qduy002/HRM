import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';

const Position = sequelize.define('Position', {
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
        allowNull: true,
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true },
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'positions',
    timestamps: true,
    indexes: [
        { name: 'positions_company_code_unique', unique: true, fields: ['companyId', 'code'] },
    ],
});

Position.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Position, { foreignKey: 'companyId' });

export default Position;
