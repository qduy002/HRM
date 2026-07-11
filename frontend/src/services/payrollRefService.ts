import api from "@/lib/axios";
import type { InsuranceRate, TaxBracket, PersonalDeductionRate } from "@/types/payroll";

export const payrollRefService = {
  getCurrentInsuranceRate: async (): Promise<InsuranceRate> => {
    const res = await api.get("/insurance-rates/current");
    return res.data.rate;
  },
  getCurrentTaxBrackets: async (): Promise<TaxBracket[]> => {
    const res = await api.get("/tax-brackets/current");
    return res.data.brackets;
  },
  getCurrentPersonalDeduction: async (): Promise<PersonalDeductionRate> => {
    const res = await api.get("/personal-deductions/current");
    return res.data.personalDeduction;
  },
};
