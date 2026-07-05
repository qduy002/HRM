import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';

const Level = sequelize.define('Level', {
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
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { notEmpty: true },
    },
    rank: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 },
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'levels',
    timestamps: true,
    indexes: [
        { name: 'levels_company_code_unique', unique: true, fields: ['companyId', 'code'] },
        { name: 'levels_company_rank_unique', unique: true, fields: ['companyId', 'rank'] },
    ],
});

Level.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(Level, { foreignKey: 'companyId' });

export default Level;
