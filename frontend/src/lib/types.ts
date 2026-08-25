export type Role =
  | 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'BRANCH_MANAGER' | 'PHARMACIST'
  | 'CASHIER' | 'INVENTORY_MANAGER' | 'WHOLESALE_MANAGER' | 'ACCOUNTANT';

export interface LicenseInfo {
  status: 'TRIAL' | 'ACTIVE' | 'GRACE' | 'EXPIRED';
  paidUntil: string | null;
  trialEndsAt: string | null;
}

export interface BranchInfo {
  id: string;
  name: string;
  location?: string | null;
  license: LicenseInfo;
  todaySales?: { total: number; count: number };
}

export interface UserInfo {
  id: string;
  username: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
}

export interface TenantInfo {
  id: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
  settings: Record<string, unknown>;
}

export interface Session {
  user: UserInfo;
  tenant: TenantInfo | null;
  branches: BranchInfo[];
  impersonated: boolean;
}

export interface Product {
  id: string;
  name: string;
  genericName?: string | null;
  strength?: string | null;
  manufacturer?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  packSize?: number | null;
  barcode?: string | null;
  unitPrice: number;
  costPrice: number;
  wholesalePrice?: number | null;
  reorderLevel: number;
  isActive: boolean;
  stockByBranch?: { branchId: string; qty: number }[];
}

export interface Batch {
  id: string;
  branchId: string;
  productId: string;
  batchNo: string;
  expiryDate: string;
  qtyOnHand: number;
  costPrice: number;
  branch?: { id: string; name: string };
}

export interface StockRow {
  productId: string;
  name: string;
  genericName?: string | null;
  barcode?: string | null;
  category?: string | null;
  unitPrice: number;
  reorderLevel: number;
  totalQty: number;
  stockState: 'OUT' | 'LOW' | 'OK';
  batches: { id: string; batchNo: string; expiryDate: string; qtyOnHand: number; costPrice: number }[];
}

export interface Category { id: string; name: string; productCount: number }
export interface Supplier { id: string; name: string; phone?: string | null; email?: string | null; address?: string | null; tin?: string | null; poCount?: number; totalPurchased?: number; isActive: boolean }

export interface POItem { id: string; productId: string; qtyExpected: number; qtyReceived: number; unitCost: number; product?: { id: string; name: string } }
export interface PurchaseOrder {
  id: string; branchId: string; status: string; total: number; expectedDate?: string | null; notes?: string | null;
  supplier: { id: string; name: string }; branch: { id: string; name: string };
  items: POItem[]; createdAt: string; createdByName?: string | null;
  itemCount?: number; totalQty?: number; receivedQty?: number;
}

export interface SaleItem { id: string; productId: string; productName: string; qty: number; unitPrice: number; discount: number; lineTotal: number; refundedQty: number; batchId: string }
export interface Sale {
  id: string; receiptNo: string; branchId: string; shiftId?: string | null;
  cashierId: string; cashierName?: string | null; customerId?: string | null; customerName?: string | null;
  subtotal: number; discountTotal: number; total: number;
  paymentMethod: string; paymentDetail?: string | null; amountPaid: number; changeDue: number;
  status: 'COMPLETED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
  isWholesale: boolean; deliveryNoteNo?: string | null; createdAt: string;
  items?: SaleItem[]; cashier?: { username: string }; customer?: { name: string } | null;
}

export interface Shift {
  id: string; branchId: string; cashierId: string; openedAt: string; closedAt?: string | null;
  openingFloat: number; countedCash?: number | null; expectedCash?: number | null; variance?: number | null;
  status: 'OPEN' | 'CLOSED'; cashier?: { id: string; username: string; fullName: string | null };
  cashSoFar?: number; saleCount?: number; branch?: { name: string }; _count?: { sales: number };
}

export interface Customer {
  id: string; name: string; phone?: string | null; email?: string | null;
  isWholesale: boolean; loyaltyPoints: number; creditLimit: number; creditBalance: number;
  isActive: boolean; createdAt: string;
  allergies?: string | null; conditions?: string | null; notes?: string | null;
  _count?: { sales: number }; totalPurchases?: number;
  sales?: { id: string; receiptNo: string; total: number; createdAt: string; status: string; paymentMethod: string }[];
  payments?: { id: string; amount: number; method: string; createdAt: string; note?: string | null }[];
}

export interface Prescription {
  id: string; branchId: string; customerName?: string | null; phone?: string | null;
  photoPath?: string | null; doctorName?: string | null; notes?: string | null;
  status: 'RECEIVED' | 'VERIFIED' | 'DISPENSED'; createdAt: string; createdByName?: string | null;
}

export interface StockMovement {
  id: string; type: string; qtyDelta: number; qtyAfter: number; reason?: string | null;
  userName?: string | null; createdAt: string; productId: string;
  batch?: { batchNo: string } | null;
}

export interface StockTransfer {
  id: string; status: string; note?: string | null; createdAt: string;
  requestedByName?: string | null;
  fromBranch: { id: string; name: string }; toBranch: { id: string; name: string };
  items: { id: string; qty: number; product: { id: string; name: string } }[];
}

export interface StockCount {
  id: string; status: string; note?: string | null; createdAt: string; startedByName?: string | null;
  branch?: { id: string; name: string }; itemCount?: number; varianceCount?: number;
  items?: { id: string; productId: string; systemQty: number; countedQty: number | null; product: { id: string; name: string }; batch: { batchNo: string; expiryDate: string } }[];
}

export interface Expense { id: string; category: string; amount: number; description?: string | null; spentAt: string; branchId?: string | null; recordedByName?: string | null }

export interface FinanceSummary {
  revenue: number; discounts: number; refunds: number; expenses: number; net: number;
  saleCount: number; creditOutstanding: number;
  byMethod: { method: string; total: number; count: number }[];
}

export interface SalesReport {
  total: number; discounts: number; count: number; average: number;
  byDay: { day: string; total: number; count: number }[];
  topProducts: { name: string; qty: number; total: number }[];
  byCategory: { category: string; total: number }[];
}

export interface TenantUser {
  id: string; username: string; fullName: string | null; email: string | null; phone: string | null;
  role: Role; isActive: boolean; createdAt: string;
  branches: { id: string; name: string }[];
}

export interface Invite { id: string; code: string; username: string; fullName?: string | null; role: Role; branchIds: string[]; expiresAt: string }

export interface PlatformTenant {
  id: string; name: string; phone?: string | null; address?: string | null; status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string; owner: { username: string; fullName: string | null; phone: string | null } | null;
  userCount: number;
  branches: { id: string; name: string; license: LicenseInfo }[];
  monthSales: { total: number; count: number };
  lastActivity: string | null;
}

export interface PlatformPayment {
  id: string; amountEtb: number; method: string; referenceNo?: string | null; monthsPaid: number;
  periodStart: string; periodEnd: string; note?: string | null; recordedByName?: string | null; createdAt: string;
  tenant: { name: string }; branch?: { name: string } | null;
}

export interface PlatformOverview {
  tenants: { total: number; active: number; suspended: number };
  branches: { total: number; active: number; trial: number; grace: number; expired: number };
  sales: { todayTotal: number; todayCount: number; monthTotal: number; monthCount: number };
  expiringLicenses: { branchId: string; branchName: string; tenantName: string; license: LicenseInfo }[];
  recentTenants: { id: string; name: string; createdAt: string; status: string }[];
}
