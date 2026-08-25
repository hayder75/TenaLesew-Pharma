// Mock data for the pharmacy system

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  expiryDate?: string;
  barcode?: string;
  supplier?: string;
  minStock?: number;
}

export interface Sale {
  id: number;
  date: string;
  total: number;
  items: SaleItem[];
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  status: 'completed' | 'pending' | 'refunded';
}

export interface SaleItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

export interface User {
  id: number;
  username: string;
  password: string;
  role: UserRole;
  branch?: string;
  email?: string;
  status: 'active' | 'inactive';
}

export type UserRole = 'admin' | 'pharmacist' | 'cashier' | 'inventory' | 'wholesale';

export interface RolePermissions {
  role: UserRole;
  label: string;
  description: string;
  permissions: string[];
  menuItems: string[];
}

export const rolePermissions: RolePermissions[] = [
  {
    role: 'admin',
    label: 'Admin',
    description: 'Full access to everything - Finance, Reports, Branches, Users',
    permissions: ['*'],
    menuItems: ['dashboard', 'pos', 'prescriptions', 'wholesale', 'inventory', 'suppliers', 'customers', 'finance', 'reports', 'branches', 'settings']
  },
  {
    role: 'pharmacist',
    label: 'Pharmacist',
    description: 'POS, Prescriptions, View Products',
    permissions: ['pos', 'prescriptions', 'view_products'],
    menuItems: ['dashboard', 'pos', 'prescriptions', 'inventory']
  },
  {
    role: 'cashier',
    label: 'Cashier',
    description: 'POS, My Sales Dashboard - View daily/weekly/monthly sales',
    permissions: ['pos', 'my_sales'],
    menuItems: ['dashboard', 'pos', 'my_sales']
  },
  {
    role: 'inventory',
    label: 'Inventory Manager',
    description: 'Stock, Purchases, Suppliers',
    permissions: ['inventory', 'suppliers', 'purchases'],
    menuItems: ['dashboard', 'inventory', 'suppliers']
  },
  {
    role: 'wholesale',
    label: 'Wholesale Manager',
    description: 'Bulk orders, Pharmacy clients',
    permissions: ['wholesale', 'customers'],
    menuItems: ['dashboard', 'wholesale', 'customers']
  }
];

export const mockUsers: User[] = [
  { id: 1, username: 'admin', password: 'admin', role: 'admin', email: 'admin@pharmacy.com', branch: 'All', status: 'active' },
  { id: 2, username: 'pharmacist', password: 'pass', role: 'pharmacist', email: 'pharmacist@pharmacy.com', branch: 'Main Branch', status: 'active' },
  { id: 3, username: 'cashier', password: 'pass', role: 'cashier', email: 'cashier@pharmacy.com', branch: 'Main Branch', status: 'active' },
  { id: 4, username: 'inventory', password: 'pass', role: 'inventory', email: 'inventory@pharmacy.com', branch: 'Main Branch', status: 'active' },
  { id: 5, username: 'wholesale', password: 'pass', role: 'wholesale', email: 'wholesale@pharmacy.com', branch: 'Main Branch', status: 'active' },
];

export const mockProducts: Product[] = [
  { id: 1, name: "Paracetamol 500mg", price: 5.00, stock: 100, category: "Pain Relief", expiryDate: "2027-05-30", barcode: "123456789", supplier: "PharmaCo", minStock: 20 },
  { id: 2, name: "Ibuprofen 200mg", price: 3.50, stock: 12, category: "Pain Relief", expiryDate: "2026-09-20", barcode: "123456790", supplier: "PharmaCo", minStock: 30 },
  { id: 3, name: "Amoxicillin 500mg", price: 12.00, stock: 8, category: "Antibiotics", expiryDate: "2026-10-15", barcode: "123456791", supplier: "MedSupply", minStock: 15 },
  { id: 4, name: "Vitamin C 1000mg", price: 8.00, stock: 200, category: "Vitamins", expiryDate: "2027-08-01", barcode: "123456792", supplier: "Health Dist", minStock: 40 },
  { id: 5, name: "Cough Syrup", price: 7.50, stock: 16, category: "Cough & Cold", expiryDate: "2026-10-05", barcode: "123456793", supplier: "PharmaCo", minStock: 20 },
  { id: 6, name: "Panadol Extra", price: 6.00, stock: 25, category: "Pain Relief", expiryDate: "2027-01-15", barcode: "123456794", supplier: "PharmaCo", minStock: 25 },
  { id: 7, name: "Augmentin 625mg", price: 18.00, stock: 30, category: "Antibiotics", expiryDate: "2026-08-30", barcode: "123456795", supplier: "MedSupply", minStock: 10 },
  { id: 8, name: "Neurobion", price: 15.00, stock: 45, category: "Vitamins", expiryDate: "2027-03-20", barcode: "123456796", supplier: "Health Dist", minStock: 15 },
  { id: 9, name: "Cetirizine 10mg", price: 4.00, stock: 55, category: "Allergy", expiryDate: "2026-11-05", barcode: "123456797", supplier: "PharmaCo", minStock: 50 },
  { id: 10, name: "ORS Packet", price: 2.00, stock: 500, category: "Digestive", expiryDate: "2027-06-15", barcode: "123456798", supplier: "Health Dist", minStock: 100 },
];

export const mockSales: Sale[] = [
  { id: 1, date: "2026-04-22 10:30", total: 15.00, items: [{ productId: 1, productName: "Paracetamol 500mg", quantity: 2, price: 5.00 }, { productId: 2, productName: "Ibuprofen 200mg", quantity: 1, price: 3.50 }], paymentMethod: 'cash', customerName: 'John Doe', status: 'completed' },
  { id: 2, date: "2026-04-22 11:15", total: 20.00, items: [{ productId: 3, productName: "Amoxicillin 500mg", quantity: 1, price: 12.00 }, { productId: 4, productName: "Vitamin C 1000mg", quantity: 1, price: 8.00 }], paymentMethod: 'bank', status: 'completed' },
  { id: 3, date: "2026-04-22 12:00", total: 8.00, items: [{ productId: 5, productName: "Cough Syrup", quantity: 1, price: 7.50 }, { productId: 9, productName: "Cetirizine 10mg", quantity: 1, price: 4.00 }], paymentMethod: 'cash', status: 'completed' },
];

export interface Bank {
  id: number;
  name: string;
  accountNumber: string;
  type: 'bank' | 'wallet';
  balance: number;
}

export const mockBanks: Bank[] = [
  { id: 1, name: 'Cash (Drawer)', accountNumber: 'CASH', type: 'bank', balance: 5000 },
  { id: 2, name: 'Commercial Bank of Ethiopia', accountNumber: 'CBE-0012345678', type: 'bank', balance: 150000 },
  { id: 3, name: 'Dashen Bank', accountNumber: 'DASH-9876543', type: 'bank', balance: 80000 },
  { id: 4, name: 'Awash Bank', accountNumber: 'AWASH-456789', type: 'bank', balance: 45000 },
  { id: 5, name: 'Telebirr', accountNumber: 'TELE-0912345678', type: 'wallet', balance: 25000 },
  { id: 6, name: 'CBE Birr', accountNumber: 'CBEB-0999999999', type: 'wallet', balance: 12000 },
];

export interface Category {
  id: number;
  name: string;
  productCount: number;
}

export const mockCategories: Category[] = [
  { id: 1, name: 'Pain Relief', productCount: 2 },
  { id: 2, name: 'Antibiotics', productCount: 2 },
  { id: 3, name: 'Vitamins', productCount: 2 },
  { id: 4, name: 'Cough & Cold', productCount: 1 },
  { id: 5, name: 'Allergy', productCount: 1 },
  { id: 6, name: 'Digestive', productCount: 1 },
];

export const menuItemsConfig = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', key: 'dashboard' },
  { path: '/pos', label: 'Point of Sale', icon: 'ShoppingCart', key: 'pos' },
  { path: '/prescriptions', label: 'Prescriptions', icon: 'FileText', key: 'prescriptions' },
  { path: '/wholesale', label: 'Wholesale', icon: 'Truck', key: 'wholesale' },
  { path: '/inventory', label: 'Inventory', icon: 'Package', key: 'inventory' },
  { path: '/suppliers', label: 'Suppliers', icon: 'Truck', key: 'suppliers' },
  { path: '/customers', label: 'Customers', icon: 'Users', key: 'customers' },
  { path: '/finance', label: 'Finance', icon: 'DollarSign', key: 'finance' },
  { path: '/reports', label: 'Reports', icon: 'BarChart3', key: 'reports' },
  { path: '/branches', label: 'Branches', icon: 'Building2', key: 'branches' },
  { path: '/settings', label: 'Settings', icon: 'Settings', key: 'settings' },
];

export const getMenuItemsForRole = (role: UserRole): string[] => {
  const roleConfig = rolePermissions.find(r => r.role === role);
  return roleConfig?.menuItems || [];
};

export const hasPermission = (userRole: UserRole, permission: string): boolean => {
  const roleConfig = rolePermissions.find(r => r.role === userRole);
  if (!roleConfig) return false;
  if (roleConfig.permissions.includes('*')) return true;
  return roleConfig.permissions.includes(permission);
};

export const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    'Pain Relief': '💊',
    'Antibiotics': '💉',
    'Vitamins': '💊',
    'Cough & Cold': '🤧',
    'Allergy': '🤧',
    'Digestive': '🫃',
  };
  return icons[category] || '💊';
};