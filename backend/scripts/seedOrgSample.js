import 'dotenv/config';
import sequelize from '../src/libs/db.js';
import { Company, Branch, Department, Position, Level } from '../src/models/index.js';

const TENANT_CODE = process.env.SEED_TENANT_CODE || 'fpt';

const branchesData = [
    { code: 'HN', name: 'FPT Hà Nội', address: 'Cầu Giấy, Hà Nội', phone: '02439999999', email: 'hn@fpt.com' },
    { code: 'HCM', name: 'FPT TP HCM', address: 'Q1, TP HCM', phone: '02839999999', email: 'hcm@fpt.com' },
    { code: 'DN', name: 'FPT Đà Nẵng', address: 'Hải Châu, Đà Nẵng' },
    { code: 'HP', name: 'FPT Hải Phòng', address: 'Ngô Quyền, Hải Phòng' },
    { code: 'CT', name: 'FPT Cần Thơ', address: 'Ninh Kiều, Cần Thơ' },
    { code: 'HUE', name: 'FPT Huế', address: 'TP Huế' },
    { code: 'NT', name: 'FPT Nha Trang', address: 'TP Nha Trang, Khánh Hòa' },
    { code: 'BD', name: 'FPT Bình Dương', address: 'Thủ Dầu Một, Bình Dương' },
    { code: 'DL', name: 'FPT Đà Lạt', address: 'TP Đà Lạt, Lâm Đồng' },
    { code: 'VT', name: 'FPT Vũng Tàu', address: 'TP Vũng Tàu' },
    { code: 'QN', name: 'FPT Quy Nhơn', address: 'TP Quy Nhơn, Bình Định' },
    { code: 'TN', name: 'FPT Thái Nguyên', address: 'TP Thái Nguyên' },
    { code: 'HL', name: 'FPT Hạ Long', address: 'TP Hạ Long, Quảng Ninh' },
    { code: 'BMT', name: 'FPT Buôn Ma Thuột', address: 'BMT, Đắk Lắk' },
    { code: 'VL', name: 'FPT Vĩnh Long', address: 'TP Vĩnh Long' },
    { code: 'TB', name: 'FPT Thái Bình', address: 'TP Thái Bình' },
];

const positionsData = [
    // Điều hành
    { code: 'CEO', name: 'Tổng giám đốc', description: 'Chief Executive Officer' },
    { code: 'COO', name: 'Giám đốc vận hành', description: 'Chief Operating Officer' },
    { code: 'CTO', name: 'Giám đốc công nghệ', description: 'Chief Technology Officer' },
    { code: 'CFO', name: 'Giám đốc tài chính', description: 'Chief Financial Officer' },
    // Kỹ thuật
    { code: 'INTERN', name: 'Thực tập sinh', description: 'Intern' },
    { code: 'SE', name: 'Software Engineer', description: 'Kỹ sư phần mềm' },
    { code: 'SSE', name: 'Senior Software Engineer', description: 'Kỹ sư phần mềm cao cấp' },
    { code: 'TL', name: 'Tech Lead' },
    { code: 'ARCH', name: 'Software Architect', description: 'Kiến trúc sư phần mềm' },
    { code: 'EM', name: 'Engineering Manager', description: 'Quản lý kỹ thuật' },
    { code: 'QA', name: 'QA Engineer', description: 'Kiểm thử tự động' },
    { code: 'QC', name: 'QC Engineer', description: 'Kiểm thử thủ công' },
    { code: 'DEVOPS', name: 'DevOps Engineer' },
    // Nhân sự
    { code: 'HRM', name: 'HR Manager', description: 'Trưởng phòng nhân sự' },
    { code: 'RECRUITER', name: 'Recruiter', description: 'Chuyên viên tuyển dụng' },
    { code: 'CB', name: 'C&B Specialist', description: 'Chuyên viên C&B' },
    // Tài chính - Kế toán
    { code: 'CACC', name: 'Kế toán trưởng' },
    { code: 'ACC', name: 'Kế toán viên' },
    { code: 'AUDIT', name: 'Kiểm toán viên' },
    // Kinh doanh - Marketing
    { code: 'SM', name: 'Sales Manager', description: 'Quản lý kinh doanh' },
    { code: 'SALES', name: 'Sales Executive', description: 'Nhân viên kinh doanh' },
    { code: 'MKTM', name: 'Marketing Manager' },
    { code: 'MKT', name: 'Marketing Executive' },
    { code: 'CONTENT', name: 'Content Creator', description: 'Sáng tạo nội dung' },
];

const levelsData = [
    { rank: 1, code: 'L1', name: 'Intern', description: 'Thực tập sinh' },
    { rank: 2, code: 'L2', name: 'Fresher', description: 'Mới ra trường' },
    { rank: 3, code: 'L3', name: 'Junior', description: '0-2 năm kinh nghiệm' },
    { rank: 4, code: 'L4', name: 'Middle', description: '2-4 năm kinh nghiệm' },
    { rank: 5, code: 'L5', name: 'Senior', description: '4-7 năm kinh nghiệm' },
    { rank: 6, code: 'L6', name: 'Lead', description: 'Trưởng nhóm' },
    { rank: 7, code: 'L7', name: 'Manager', description: 'Quản lý' },
    { rank: 8, code: 'L8', name: 'Senior Manager', description: 'Quản lý cao cấp' },
    { rank: 9, code: 'L9', name: 'Director', description: 'Giám đốc' },
    { rank: 10, code: 'L10', name: 'VP', description: 'Phó chủ tịch' },
];

// Phòng ban với hierarchy 3 cấp. `parentCode` dùng để link, resolve ở runtime.
const departmentsData = [
    // Root - Ban Giám đốc
    { code: 'BOD', name: 'Ban Giám đốc', parentCode: null, description: 'Ban điều hành công ty' },
    { code: 'BOD-SEC', name: 'Thư ký BGĐ', parentCode: 'BOD' },

    // Root - Khối Công nghệ
    { code: 'TECH', name: 'Khối Công nghệ', parentCode: null },
    { code: 'TECH-SD', name: 'Phòng Phát triển phần mềm', parentCode: 'TECH' },
    { code: 'TECH-BE', name: 'Backend Team', parentCode: 'TECH-SD' },
    { code: 'TECH-FE', name: 'Frontend Team', parentCode: 'TECH-SD' },
    { code: 'TECH-MOB', name: 'Mobile Team', parentCode: 'TECH-SD' },
    { code: 'TECH-QA', name: 'Phòng Đảm bảo chất lượng', parentCode: 'TECH' },
    { code: 'TECH-OPS', name: 'Phòng Vận hành', parentCode: 'TECH' },
    { code: 'TECH-DEVOPS', name: 'DevOps', parentCode: 'TECH-OPS' },
    { code: 'TECH-INFRA', name: 'Infrastructure', parentCode: 'TECH-OPS' },
    { code: 'TECH-RND', name: 'Phòng R&D', parentCode: 'TECH' },

    // Root - Khối Nhân sự
    { code: 'HR', name: 'Khối Nhân sự', parentCode: null },
    { code: 'HR-REC', name: 'Phòng Tuyển dụng', parentCode: 'HR' },
    { code: 'HR-TRA', name: 'Phòng Đào tạo', parentCode: 'HR' },
    { code: 'HR-CB', name: 'Phòng C&B', parentCode: 'HR' },

    // Root - Khối Tài chính
    { code: 'FIN', name: 'Khối Tài chính', parentCode: null },
    { code: 'FIN-ACC', name: 'Phòng Kế toán', parentCode: 'FIN' },
    { code: 'FIN-AUD', name: 'Phòng Kiểm toán nội bộ', parentCode: 'FIN' },

    // Root - Khối Kinh doanh
    { code: 'BIZ', name: 'Khối Kinh doanh', parentCode: null },
    { code: 'BIZ-SALES', name: 'Phòng Bán hàng', parentCode: 'BIZ' },
    { code: 'BIZ-CS', name: 'Phòng Chăm sóc khách hàng', parentCode: 'BIZ' },
    { code: 'BIZ-BD', name: 'Phòng Phát triển kinh doanh', parentCode: 'BIZ' },

    // Root - Khối Marketing
    { code: 'MKT', name: 'Khối Marketing', parentCode: null },
    { code: 'MKT-DIG', name: 'Phòng Digital Marketing', parentCode: 'MKT' },
    { code: 'MKT-EVT', name: 'Phòng Sự kiện', parentCode: 'MKT' },
    { code: 'MKT-CONTENT', name: 'Phòng Nội dung', parentCode: 'MKT' },
];

const run = async () => {
    try {
        await sequelize.authenticate();
        console.log('✓ Đã kết nối database');

        const company = await Company.findOne({ where: { code: TENANT_CODE } });
        if (!company) {
            console.error(`❌ Tenant "${TENANT_CODE}" không tồn tại. Signup tenant trước.`);
            process.exit(1);
        }
        console.log(`✓ Tenant: ${company.name} (id=${company.id})`);
        const companyId = company.id;

        // 1. Branches
        console.log('\n=== Branches ===');
        let brChanged = 0;
        for (const b of branchesData) {
            const [, created] = await Branch.findOrCreate({
                where: { companyId, code: b.code },
                defaults: { companyId, isActive: true, ...b },
            });
            if (created) brChanged++;
            process.stdout.write(created ? '+' : '.');
        }
        console.log(`\n  ${brChanged} chi nhánh mới / ${branchesData.length} tổng`);

        // 2. Positions
        console.log('\n=== Positions ===');
        let posChanged = 0;
        for (const p of positionsData) {
            const [, created] = await Position.findOrCreate({
                where: { companyId, code: p.code },
                defaults: { companyId, isActive: true, ...p },
            });
            if (created) posChanged++;
            process.stdout.write(created ? '+' : '.');
        }
        console.log(`\n  ${posChanged} chức danh mới / ${positionsData.length} tổng`);

        // 3. Levels
        console.log('\n=== Levels ===');
        let lvlChanged = 0;
        for (const l of levelsData) {
            const [, created] = await Level.findOrCreate({
                where: { companyId, rank: l.rank },
                defaults: { companyId, ...l },
            });
            if (created) lvlChanged++;
            process.stdout.write(created ? '+' : '.');
        }
        console.log(`\n  ${lvlChanged} cấp bậc mới / ${levelsData.length} tổng`);

        // 4. Departments — cần có branch làm mặc định
        const defaultBranch = await Branch.findOne({
            where: { companyId, code: 'HN' },
        });
        if (!defaultBranch) {
            console.error('❌ Không tìm thấy chi nhánh HN để gắn phòng ban.');
            process.exit(1);
        }

        console.log('\n=== Departments (hierarchy) ===');
        const codeToId = new Map();
        let deptChanged = 0;
        for (const d of departmentsData) {
            const parentId = d.parentCode ? codeToId.get(d.parentCode) : null;
            if (d.parentCode && !parentId) {
                console.warn(`  ⚠ Phòng cha ${d.parentCode} chưa được tạo cho ${d.code} — bỏ qua`);
                continue;
            }
            const [dept, created] = await Department.findOrCreate({
                where: { companyId, code: d.code },
                defaults: {
                    companyId,
                    branchId: defaultBranch.id,
                    parentDepartmentId: parentId,
                    code: d.code,
                    name: d.name,
                    description: d.description || null,
                    isActive: true,
                },
            });
            codeToId.set(d.code, dept.id);
            if (created) deptChanged++;
            process.stdout.write(created ? '+' : '.');
        }
        console.log(`\n  ${deptChanged} phòng ban mới / ${departmentsData.length} tổng`);

        console.log('\n✓ Seed org sample xong.');
        console.log('  (+ = tạo mới, . = đã tồn tại, bỏ qua)');
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi khi seed:', error.message);
        process.exit(1);
    }
};

run();
