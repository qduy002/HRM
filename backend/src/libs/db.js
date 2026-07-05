import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    }
);

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL connected successfully');

        // Sync models — dùng { alter: true } trong dev để auto migration.
        // Production nên dùng migration script riêng, không sync tự động.
        await sequelize.sync({ alter: true });
        console.log('Models synced with database');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

export default sequelize;
