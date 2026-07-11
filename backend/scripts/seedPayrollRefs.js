import 'dotenv/config';
import { Op } from 'sequelize';
import sequelize from '../src/libs/db.js';
import { InsuranceRate, TaxBracket, PersonalDeductionRate } from '../src/models/index.js';

// Seed 3 global reference tables cho luật VN.
// Idempotent — bỏ qua nếu đã tồn tại; auto đóng bản ghi cũ khi có luật mới.
const run = async () => {
    try {
        await sequelize.authenticate();
        console.log('✓ Đã kết nối database');

        // ============ Insurance rates ============
        // Lịch sử:
        //  - NĐ 74/2024/NĐ-CP (từ 01/07/2024): Vùng 1 = 4.960.000
        //  - NĐ 293/2025/NĐ-CP (từ 01/01/2026): Vùng 1 = 5.310.000 (+7.2%)
        const ins2024 = await InsuranceRate.findOne({ where: { year: 2024 } });
        if (!ins2024) {
            await InsuranceRate.create({
                year: 2024,
                bhxhEmployee: 8.0, bhytEmployee: 1.5, bhtnEmployee: 1.0,
                bhxhCompany: 17.5, bhytCompany: 3.0, bhtnCompany: 1.0,
                minRegion1Wage: 4960000, minRegion2Wage: 4410000,
                minRegion3Wage: 3860000, minRegion4Wage: 3450000,
                salaryBaseCapMultiplier: 20,
                effectiveFrom: '2024-07-01',
                effectiveTo: '2025-12-31',
                note: 'NĐ 74/2024/NĐ-CP — đã hết hiệu lực từ 01/01/2026',
            });
            console.log('✓ Đã seed insurance_rates 2024 (đã đóng)');
        } else if (ins2024.effectiveTo == null) {
            await ins2024.update({
                effectiveTo: '2025-12-31',
                note: 'NĐ 74/2024/NĐ-CP — đã hết hiệu lực từ 01/01/2026',
            });
            console.log('✓ Đã đóng insurance_rates 2024 (effectiveTo = 2025-12-31)');
        }

        const ins2026 = await InsuranceRate.findOne({ where: { year: 2026 } });
        if (!ins2026) {
            await InsuranceRate.create({
                year: 2026,
                bhxhEmployee: 8.0, bhytEmployee: 1.5, bhtnEmployee: 1.0,
                bhxhCompany: 17.5, bhytCompany: 3.0, bhtnCompany: 1.0,
                minRegion1Wage: 5310000, minRegion2Wage: 4730000,
                minRegion3Wage: 4140000, minRegion4Wage: 3700000,
                salaryBaseCapMultiplier: 20,
                effectiveFrom: '2026-01-01',
                effectiveTo: null,
                note: 'NĐ 293/2025/NĐ-CP — hiệu lực từ 01/01/2026 (tăng ~7.2%)',
            });
            console.log('✓ Đã seed insurance_rates 2026 (NĐ 293/2025/NĐ-CP)');
        } else {
            console.log('· insurance_rates 2026 đã tồn tại');
        }

        // ============ Tax brackets — 7 bậc TNCN VN ============
        // Luật thuế TNCN 04/2007/QH12, sửa đổi 2012. Không đổi qua 2026.
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

        // ============ Personal deduction ============
        // Lịch sử:
        //  - NQ 954/2020/UBTVQH14 (từ 01/07/2020): bản thân 11tr, NPT 4.4tr
        //  - NQ 110/2025/UBTVQH15 (từ 01/07/2026): bản thân 15.5tr, NPT 6.2tr
        const pd2020 = await PersonalDeductionRate.findOne({ where: { effectiveFrom: '2020-07-01' } });
        if (!pd2020) {
            await PersonalDeductionRate.create({
                selfDeduction: 11000000, dependentDeduction: 4400000,
                effectiveFrom: '2020-07-01',
                effectiveTo: '2026-06-30',
                note: 'NQ 954/2020/UBTVQH14 — đã hết hiệu lực từ 01/07/2026',
            });
            console.log('✓ Đã seed personal_deduction_rates 2020 (đã đóng)');
        } else if (pd2020.effectiveTo == null) {
            await pd2020.update({
                effectiveTo: '2026-06-30',
                note: 'NQ 954/2020/UBTVQH14 — đã hết hiệu lực từ 01/07/2026',
            });
            console.log('✓ Đã đóng personal_deduction_rates 2020 (effectiveTo = 2026-06-30)');
        }

        const pd2026 = await PersonalDeductionRate.findOne({ where: { effectiveFrom: '2026-07-01' } });
        if (!pd2026) {
            await PersonalDeductionRate.create({
                selfDeduction: 15500000, dependentDeduction: 6200000,
                effectiveFrom: '2026-07-01',
                effectiveTo: null,
                note: 'NQ 110/2025/UBTVQH15 — hiệu lực từ 01/07/2026',
            });
            console.log('✓ Đã seed personal_deduction_rates 2026 (NQ 110/2025/UBTVQH15)');
        } else {
            console.log('· personal_deduction_rates 2026 đã tồn tại');
        }

        console.log('\n✓ Seed payroll refs xong.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi seed:', error.message);
        process.exit(1);
    }
};

run();
