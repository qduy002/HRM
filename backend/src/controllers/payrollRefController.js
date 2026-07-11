import { Op } from 'sequelize';
import { InsuranceRate, TaxBracket, PersonalDeductionRate } from '../models/index.js';

// Global reference — mọi tenant user đều đọc được. Không cho create/update qua API (chỉ seed script).

// GET /api/insurance-rates/current
export const getCurrentInsuranceRate = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const rate = await InsuranceRate.findOne({
            where: {
                effectiveFrom: { [Op.lte]: today },
                [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: today } }],
            },
            order: [['effectiveFrom', 'DESC']],
        });
        if (!rate) return res.status(404).json({ message: 'Chưa seed insurance_rates. Chạy: npm run seed:payroll-refs' });
        return res.status(200).json({ rate });
    } catch (error) {
        console.error('Lỗi get insurance rate:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/tax-brackets/current
export const getCurrentTaxBrackets = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const brackets = await TaxBracket.findAll({
            where: {
                effectiveFrom: { [Op.lte]: today },
                [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: today } }],
            },
            order: [['bracketNumber', 'ASC']],
        });
        if (brackets.length === 0) return res.status(404).json({ message: 'Chưa seed tax_brackets. Chạy: npm run seed:payroll-refs' });
        return res.status(200).json({ brackets });
    } catch (error) {
        console.error('Lỗi get tax brackets:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/personal-deductions/current
export const getCurrentPersonalDeduction = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const pd = await PersonalDeductionRate.findOne({
            where: {
                effectiveFrom: { [Op.lte]: today },
                [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: today } }],
            },
            order: [['effectiveFrom', 'DESC']],
        });
        if (!pd) return res.status(404).json({ message: 'Chưa seed personal_deduction_rates. Chạy: npm run seed:payroll-refs' });
        return res.status(200).json({ personalDeduction: pd });
    } catch (error) {
        console.error('Lỗi get personal deduction:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
