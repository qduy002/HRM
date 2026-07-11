import express from 'express';
import {
    getCurrentInsuranceRate,
    getCurrentTaxBrackets,
    getCurrentPersonalDeduction,
} from '../controllers/payrollRefController.js';

const router = express.Router();

router.get('/insurance-rates/current', getCurrentInsuranceRate);
router.get('/tax-brackets/current', getCurrentTaxBrackets);
router.get('/personal-deductions/current', getCurrentPersonalDeduction);

export default router;
