import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import User from './User.js';

const Session = sequelize.define('Session', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: User, key: 'id' },
        onDelete: 'CASCADE',
    },
    refreshToken: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    tableName: 'sessions',
    timestamps: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['refreshToken'] },
        { fields: ['expiresAt'] },
    ],
});

Session.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Session, { foreignKey: 'userId' });

export default Session;
