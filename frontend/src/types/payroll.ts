export interface Allowance {
  id: number;
  companyId: number;
  code: string;
  name: string;
  defaultAmount: string | null;
  isTaxable: boolean;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AllowancePayload = Partial<
  Pick<Allowance, "code" | "name" | "defaultAmount" | "isTaxable" | "description" | "isActive">
>;

export interface SalaryStructure {
  id: number;
  companyId: number;
  employeeId: number;
  basicSalary: string;
  bhxhSalary: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  Employee?: { id: number; code: string; displayName: string };
}

export interface SalaryStructurePayload {
  employeeId?: number;
  basicSalary: string;
  bhxhSalary?: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  note?: string | null;
}

export interface EmployeeAllowance {
  id: number;
  companyId: number;
  employeeId: number;
  allowanceId: number;
  amount: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  Employee?: { id: number; code: string; displayName: string };
  Allowance?: { id: number; code: string; name: string; defaultAmount?: string | null; isTaxable: boolean };
}

export interface EmployeeAllowancePayload {
  employeeId?: number;
  allowanceId?: number;
  amount: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  note?: string | null;
}

export interface InsuranceRate {
  id: number;
  bhxhEmployee: string;
  bhytEmployee: string;
  bhtnEmployee: string;
  bhxhCompany: string;
  bhytCompany: string;
  bhtnCompany: string;
  minRegion1Wage: string;
  minRegion2Wage: string;
  minRegion3Wage: string;
  minRegion4Wage: string;
  salaryBaseCapMultiplier: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  note?: string | null;
}

export interface TaxBracket {
  id: number;
  bracketNumber: number;
  fromAmount: string;
  toAmount: string | null;
  rate: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface PersonalDeductionRate {
  id: number;
  selfDeduction: string;
  dependentDeduction: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  note?: string | null;
}

// ─── Payroll runtime ───

export type PayrollStatus = "draft" | "finalized" | "paid";
export type PayrollItemType = "earning" | "deduction" | "insurance" | "tax";

export interface PayrollItem {
  id: number;
  companyId: number;
  payrollId: number;
  type: PayrollItemType;
  code: string;
  name: string;
  amount: string;
  note?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payroll {
  id: number;
  companyId: number;
  employeeId: number;
  month: number;
  year: number;
  fromDate: string;
  toDate: string;
  basicSalary: string;
  bhxhSalaryBase: string;
  workingDaysStandard: number;
  actualPaidDays: number;
  otHours: string;
  grossSalary: string;
  totalTaxableAllowance: string;
  totalNonTaxableAllowance: string;
  bhxhAmount: string;
  bhytAmount: string;
  bhtnAmount: string;
  totalInsuranceEmployee: string;
  selfDeduction: string;
  dependentCount: number;
  dependentDeduction: string;
  taxableIncome: string;
  personalIncomeTax: string;
  netSalary: string;
  status: PayrollStatus;
  finalizedBy?: number | null;
  finalizedAt?: string | null;
  paidBy?: number | null;
  paidAt?: string | null;
  unlockCount: number;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  Employee?: {
    id: number;
    code: string;
    displayName: string;
    bankAccountNumber?: string | null;
    bankName?: string | null;
    bankBranch?: string | null;
  };
  finalizer?: { id: number; email: string } | null;
  payer?: { id: number; email: string } | null;
  PayrollItems?: PayrollItem[];
}

export interface PayrollListFilter {
  month?: number;
  year?: number;
  employeeId?: number;
  status?: PayrollStatus;
}

export interface PayrollPreviewPayload {
  employeeId: number;
  month: number;
  year: number;
}

export interface PayrollPreviewResult {
  employee: { id: number; code: string; displayName: string };
  payroll: Omit<Payroll, "id" | "companyId" | "employeeId" | "status" | "unlockCount" | "createdAt" | "updatedAt">;
  items: Omit<PayrollItem, "id" | "companyId" | "payrollId" | "createdAt" | "updatedAt">[];
}

export interface PayrollGenerateResult {
  month: number;
  year: number;
  summary: { generated: number; skipped: number; errors: number };
  generated: { employeeId: number; payrollId: number; net: string }[];
  skipped: { employeeId: number; reason: string }[];
  errors: { employeeId: number; message: string }[];
}
