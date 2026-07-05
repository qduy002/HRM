import { DataTypes } from 'sequelize';
import sequelize from '../libs/db.js';
import Company from './Company.js';

const ROLES = ['super_admin', 'admin', 'hr', 'manager', 'employee'];

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    companyId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: Company, key: 'id' },
        onDelete: 'CASCADE',
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: { notEmpty: true },
    },
    hashedPassword: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
    },
    firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    displayName: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'employee',
        validate: {
            isIn: [ROLES],
        },
    },
    avatarUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'users',
    timestamps: true,
    defaultScope: {
        attributes: { exclude: ['hashedPassword'] },
    },
    scopes: {
        withPassword: {
            attributes: { include: ['hashedPassword'] },
        },
    },
    indexes: [
        { unique: true, fields: ['companyId', 'username'] },
    ],
    hooks: {
        beforeValidate: (user) => {
            if (user.role === 'super_admin' && user.companyId != null) {
                throw new Error('Super admin không được thuộc tenant nào (companyId phải NULL)');
            }
            if (user.role !== 'super_admin' && user.companyId == null) {
                throw new Error(`User role "${user.role}" phải thuộc 1 tenant (companyId NOT NULL)`);
            }
        },
    },
});

User.belongsTo(Company, { foreignKey: 'companyId' });
Company.hasMany(User, { foreignKey: 'companyId' });

export { ROLES };
export default User;
