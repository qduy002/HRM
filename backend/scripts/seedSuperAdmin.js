import 'dotenv/config';
import bcrypt from 'bcrypt';
import sequelize from '../src/libs/db.js';
import { User } from '../src/models/index.js';

const {
    SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_PASSWORD,
    SUPER_ADMIN_USERNAME,
    SUPER_ADMIN_FIRST_NAME,
    SUPER_ADMIN_LAST_NAME,
} = process.env;

const run = async () => {
    if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD || !SUPER_ADMIN_USERNAME) {
        console.error('❌ Cần env: SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_USERNAME');
        process.exit(1);
    }

    try {
        await sequelize.authenticate();
        console.log('✓ Đã kết nối database');

        const emailNorm = SUPER_ADMIN_EMAIL.toLowerCase().trim();
        const existing = await User.findOne({ where: { email: emailNorm } });
        if (existing) {
            if (existing.role !== 'super_admin') {
                console.error(`❌ Email ${emailNorm} đã tồn tại nhưng role là ${existing.role} — không thể seed`);
                process.exit(1);
            }
            console.log(`ℹ️  Super admin ${emailNorm} đã tồn tại — bỏ qua`);
            process.exit(0);
        }

        const firstName = SUPER_ADMIN_FIRST_NAME || 'Super';
        const lastName = SUPER_ADMIN_LAST_NAME || 'Admin';
        const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

        await User.create({
            companyId: null,
            username: SUPER_ADMIN_USERNAME,
            hashedPassword,
            email: emailNorm,
            firstName,
            lastName,
            displayName: `${lastName} ${firstName}`,
            role: 'super_admin',
        });

        console.log(`✓ Đã tạo super admin: ${emailNorm}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi khi seed super admin:', error.message);
        process.exit(1);
    }
};

run();
