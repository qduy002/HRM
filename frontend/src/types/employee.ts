export type EmployeeStatus = "probation" | "active" | "on_leave" | "terminated";
export type Gender = "male" | "female" | "other";
export type MaritalStatus = "single" | "married" | "divorced" | "widowed";
export type ContractType = "probation" | "fixed_term" | "indefinite" | "seasonal" | "collaboration";
export type ContractStatus = "draft" | "active" | "expired" | "terminated";
export type DependentRelationship = "child" | "parent" | "spouse" | "other";
export type EducationLevel =
  | "primary"
  | "secondary"
  | "high_school"
  | "vocational"
  | "associate"
  | "bachelor"
  | "master"
  | "doctorate";
export type DocumentType =
  | "cv"
  | "identity_front"
  | "identity_back"
  | "contract"
  | "diploma"
  | "certificate"
  | "other";

export interface EmployeePosition {
  id: number;
  companyId: number;
  employeeId: number;
  branchId: number;
  departmentId: number;
  positionId: number;
  levelId?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  Branch?: { id: number; code: string; name: string };
  Department?: { id: number; code: string; name: string };
  Position?: { id: number; code: string; name: string };
  Level?: { id: number; code: string; name: string; rank: number } | null;
}

export interface Employee {
  id: number;
  companyId: number;
  userId?: number | null;
  code: string;

  firstName: string;
  lastName: string;
  displayName: string;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  placeOfBirth?: string | null;
  nationality?: string | null;
  ethnicity?: string | null;
  religion?: string | null;
  maritalStatus?: MaritalStatus | null;

  identityNumber?: string | null;
  identityIssueDate?: string | null;
  identityIssuePlace?: string | null;
  taxCode?: string | null;
  socialInsuranceNumber?: string | null;

  phone?: string | null;
  personalEmail?: string | null;
  currentAddress?: string | null;
  permanentAddress?: string | null;

  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;

  joinedDate?: string | null;
  status: EmployeeStatus;
  terminatedDate?: string | null;
  terminatedReason?: string | null;
  avatarUrl?: string | null;

  createdAt: string;
  updatedAt: string;

  EmployeePositions?: EmployeePosition[];
  User?: {
    id: number;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
  } | null;
}

export interface EmployeeListResponse {
  employees: Employee[];
  pagination: { total: number; page: number; pageSize: number };
}

export interface EmployeeListFilter {
  search?: string;
  branchId?: number | null;
  departmentId?: number | null;
  status?: EmployeeStatus | null;
  page?: number;
  pageSize?: number;
}

export interface EmployeeCreatePayload {
  firstName: string;
  lastName: string;
  branchId: number;
  departmentId: number;
  positionId: number;
  levelId?: number | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  identityNumber?: string | null;
  phone?: string | null;
  personalEmail?: string | null;
  joinedDate?: string | null;
  status?: EmployeeStatus;
}

export type EmployeeUpdatePayload = Partial<Omit<Employee, "id" | "companyId" | "userId" | "code" | "createdAt" | "updatedAt" | "displayName" | "EmployeePositions" | "User">>;

export interface GrantAccountPayload {
  username: string;
  email: string;
  password: string;
  role?: "admin" | "hr" | "manager" | "employee";
}

export interface ChangePositionPayload {
  branchId: number;
  departmentId: number;
  positionId: number;
  levelId?: number | null;
  effectiveFrom: string;
  note?: string;
}

// Sub-resource types
export interface Contract {
  id: number;
  companyId: number;
  employeeId: number;
  code: string;
  type: ContractType;
  signedDate: string;
  startDate: string;
  endDate?: string | null;
  basicSalary: string;
  allowanceAmount: string;
  workingHoursPerWeek: number;
  probationEndDate?: string | null;
  status: ContractStatus;
  terminatedDate?: string | null;
  terminatedReason?: string | null;
  fileUrl?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ContractPayload = Omit<Contract, "id" | "companyId" | "employeeId" | "createdAt" | "updatedAt">;

export interface EmployeeDependent {
  id: number;
  companyId: number;
  employeeId: number;
  name: string;
  relationship: DependentRelationship;
  dateOfBirth?: string | null;
  identityNumber?: string | null;
  taxCode?: string | null;
  deductionStartDate: string;
  deductionEndDate?: string | null;
  note?: string | null;
}

export type DependentPayload = Omit<EmployeeDependent, "id" | "companyId" | "employeeId">;

export interface EmergencyContact {
  id: number;
  companyId: number;
  employeeId: number;
  name: string;
  relationship: string;
  phone: string;
  alternatePhone?: string | null;
  address?: string | null;
  priority: number;
  note?: string | null;
}

export type EmergencyContactPayload = Omit<EmergencyContact, "id" | "companyId" | "employeeId">;

export interface EmployeeEducation {
  id: number;
  companyId: number;
  employeeId: number;
  level: EducationLevel;
  school: string;
  major?: string | null;
  graduationYear?: number | null;
  gpa?: string | null;
  note?: string | null;
}

export type EducationPayload = Omit<EmployeeEducation, "id" | "companyId" | "employeeId">;

export interface EmployeeExperience {
  id: number;
  companyId: number;
  employeeId: number;
  companyName: string;
  position: string;
  fromDate?: string | null;
  toDate?: string | null;
  description?: string | null;
}

export type ExperiencePayload = Omit<EmployeeExperience, "id" | "companyId" | "employeeId">;

export interface EmployeeDocument {
  id: number;
  companyId: number;
  employeeId: number;
  uploadedBy?: number | null;
  type: DocumentType;
  name: string;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
}

export type DocumentPayload = Omit<EmployeeDocument, "id" | "companyId" | "employeeId" | "uploadedBy">;
