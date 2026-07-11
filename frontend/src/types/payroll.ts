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
