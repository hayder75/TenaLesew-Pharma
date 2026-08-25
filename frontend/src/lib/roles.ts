import type { Role } from './types';

export const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  OWNER: 'Owner',
  ADMIN: 'Admin',
  BRANCH_MANAGER: 'Branch Manager',
  PHARMACIST: 'Pharmacist',
  CASHIER: 'Cashier',
  INVENTORY_MANAGER: 'Inventory Manager',
  WHOLESALE_MANAGER: 'Wholesale Manager',
  ACCOUNTANT: 'Accountant',
};

/** Menu keys each role can see (mirrors backend policy) */
export const roleMenus: Record<Role, string[]> = {
  SUPER_ADMIN: [],
  OWNER: ['dashboard', 'pos', 'my_sales', 'prescriptions', 'wholesale', 'inventory', 'suppliers', 'customers', 'finance', 'reports', 'branches', 'settings'],
  ADMIN: ['dashboard', 'pos', 'my_sales', 'prescriptions', 'wholesale', 'inventory', 'suppliers', 'customers', 'finance', 'reports', 'branches', 'settings'],
  BRANCH_MANAGER: ['dashboard', 'pos', 'my_sales', 'prescriptions', 'inventory', 'suppliers', 'customers', 'reports'],
  PHARMACIST: ['dashboard', 'pos', 'my_sales', 'prescriptions', 'inventory'],
  CASHIER: ['dashboard', 'pos', 'my_sales'],
  INVENTORY_MANAGER: ['dashboard', 'inventory', 'suppliers'],
  WHOLESALE_MANAGER: ['dashboard', 'wholesale', 'customers'],
  ACCOUNTANT: ['dashboard', 'finance', 'reports'],
};

export const canManageCatalog = (role: Role) =>
  ['OWNER', 'ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER'].includes(role);

export const canManageUsers = (role: Role) => ['OWNER', 'ADMIN'].includes(role);

export const canRefund = (role: Role) =>
  ['OWNER', 'ADMIN', 'BRANCH_MANAGER', 'PHARMACIST', 'ACCOUNTANT'].includes(role);

export const canAdjustStock = (role: Role) =>
  ['OWNER', 'ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER'].includes(role);

export const canVerifyRx = (role: Role) =>
  ['OWNER', 'ADMIN', 'BRANCH_MANAGER', 'PHARMACIST'].includes(role);
