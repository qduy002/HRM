export interface Branch {
  id: number;
  companyId: number;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  managerId?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: number;
  companyId: number;
  branchId: number;
  parentDepartmentId?: number | null;
  code: string;
  name: string;
  description?: string | null;
  managerId?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  Branch?: { id: number; code: string; name: string };
  parent?: { id: number; code: string; name: string } | null;
  children?: { id: number; code: string; name: string }[];
}

export interface Position {
  id: number;
  companyId: number;
  code?: string | null;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Level {
  id: number;
  companyId: number;
  code?: string | null;
  name: string;
  rank: number;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BranchPayload = Partial<Pick<Branch, 'code' | 'name' | 'address' | 'phone' | 'email' | 'isActive'>>;

export type DepartmentPayload = Partial<
  Pick<Department, 'branchId' | 'parentDepartmentId' | 'code' | 'name' | 'description' | 'managerId' | 'isActive'>
>;

export type PositionPayload = Partial<Pick<Position, 'code' | 'name' | 'description' | 'isActive'>>;

export type LevelPayload = Partial<Pick<Level, 'code' | 'name' | 'rank' | 'description'>>;
