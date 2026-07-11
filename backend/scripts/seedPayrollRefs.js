import 'dotenv/config';
import sequelize from '../src/libs/db.js';
import { InsuranceRate, TaxBracket, PersonalDeductionRate } from '../src/models/index.js';

// Seed 3 global reference tables cho luật VN hiện hành (2024).
// Idempotent — bỏ qua nếu đã tồn tại.
const run = async () => {
    try {
        await sequelize.authenticate();
        console.log('✓ Đã kết nối database');

        // ============ Insurance rates 2024 ============
        // Lương tối thiểu vùng theo NĐ 74/2024/NĐ-CP (từ 01/07/2024):
        // - Vùng 1: 4,960,000
        // - Vùng 2: 4,410,000
        // - Vùng 3: 3,860,000
        // - Vùng 4: 3,450,000
        const insExists = await InsuranceRate.findOne({ where: { year: 2024 } });
        if (!insExists) {
            await InsuranceRate.create({
                year: 2024,
                bhxhEmployee: 8.0,
                bhytEmployee: 1.5,
                bhtnEmployee: 1.0,
                bhxhCompany: 17.5,
                bhytCompany: 3.0,
                bhtnCompany: 1.0,
                minRegion1Wage: 4960000,
                minRegion2Wage: 4410000,
                minRegion3Wage: 3860000,
                minRegion4Wage: 3450000,
                salaryBaseCapMultiplier: 20,
                effectiveFrom: '2024-07-01',
                note: 'NĐ 74/2024/NĐ-CP — hiệu lực từ 01/07/2024',
            });
            console.log('✓ Đã seed insurance_rates 2024');
        } else {
            console.log('· insurance_rates 2024 đã tồn tại');
        }

        // ============ Tax brackets — 7 bậc TNCN VN (Luật thuế TNCN 04/2007/QH12, sửa đổi 2012) ============
        const brackets = [
            { bracketNumber: 1, fromAmount: 0, toAmount: 5000000, rate: 5.0 },
            { bracketNumber: 2, fromAmount: 5000000, toAmount: 10000000, rate: 10.0 },
            { bracketNumber: 3, fromAmount: 10000000, toAmount: 18000000, rate: 15.0 },
            { bracketNumber: 4, fromAmount: 18000000, toAmount: 32000000, rate: 20.0 },
            { bracketNumber: 5, fromAmount: 32000000, toAmount: 52000000, rate: 25.0 },
            { bracketNumber: 6, fromAmount: 52000000, toAmount: 80000000, rate: 30.0 },
            { bracketNumber: 7, fromAmount: 80000000, toAmount: null, rate: 35.0 },
        ];
        const existingBrackets = await TaxBracket.count({ where: { effectiveFrom: '2020-07-01' } });
        if (existingBrackets === 0) {
            await TaxBracket.bulkCreate(brackets.map((b) => ({ ...b, effectiveFrom: '2020-07-01' })));
            console.log('✓ Đã seed 7 bậc thuế TNCN');
        } else {
            console.log('· 7 bậc thuế đã tồn tại');
        }

        // ============ Personal deduction — NQ 954/2020/UBTVQH14 ============
        const pdExists = await PersonalDeductionRate.findOne({ where: { effectiveFrom: '2020-07-01' } });
        if (!pdExists) {
            await PersonalDeductionRate.create({
                selfDeduction: 11000000,
                dependentDeduction: 4400000,
                effectiveFrom: '2020-07-01',
                note: 'NQ 954/2020/UBTVQH14 — hiệu lực từ 01/07/2020',
            });
            console.log('✓ Đã seed personal_deduction_rates');
        } else {
            console.log('· personal_deduction_rates đã tồn tại');
        }

        console.log('\n✓ Seed payroll refs xong.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi seed:', error.message);
        process.exit(1);
    }
};

run();
