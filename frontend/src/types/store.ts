export type Role = "super_admin" | "admin" | "hr" | "manager" | "employee";

export interface User {
  id: number;
  companyId: number | null;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: Role;
  avatarUrl?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: number;
  code: string;
  name: string;
  taxCode?: string | null;
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status: "trial" | "active" | "suspended";
  trialEndsAt?: string | null;
  employeeCodePrefix?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignupTenantPayload {
  companyName: string;
  companyCode: string;
  taxCode?: string;
  employeeCodePrefix?: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export interface AuthState {
  accessToken: string | null;
  user: User | null;
  company: Company | null;
  hasEmployee: boolean;
  loading: boolean;

  setAccessToken: (accessToken: string | null) => void;
  setUser: (user: User | null) => void;
  setCompany: (company: Company | null) => void;
  clearState: () => void;

  signupTenant: (data: SignupTenantPayload) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchMe: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface ThemeState {
  isDark: boolean;
  setTheme: (isDark: boolean) => void;
  toggleTheme: () => void;
}
