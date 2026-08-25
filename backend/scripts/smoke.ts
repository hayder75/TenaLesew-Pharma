/**
 * End-to-end smoke test — exercises the whole API flow against a running server.
 * Usage: npm run smoke  (expects API on :4100 with seeded data)
 */
const BASE = process.env.SMOKE_URL || 'http://localhost:4100/api/v1';

let passed = 0;
let failed = 0;
const failures: string[] = [];

const ok = (name: string, cond: boolean, extra?: unknown) => {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ✗ ${name}`, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : '');
  }
};

interface Session {
  accessToken: string;
  refreshToken: string;
  user: { id: string; username: string; role: string };
  tenant: { id: string; name: string } | null;
  branches: { id: string; name: string; license: { status: string } }[];
}

const call = async (
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<{ status: number; body: any }> => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
};

const login = async (username: string, password: string): Promise<Session> => {
  const { status, body } = await call('POST', '/auth/login', { username, password });
  if (status !== 200) throw new Error(`login failed for ${username}: ${JSON.stringify(body)}`);
  return body;
};

const rand = Math.random().toString(36).slice(2, 8);

const main = async () => {
  console.log(`\nSmoke testing ${BASE}\n`);

  // ── 1. health ──
  console.log('1. Health');
  const health = await call('GET', '/../health'.replace('/../', '/../') === '/health' ? '/health' : '/../health'.replace('/api/v1/..', ''));
  // simpler:
  const h = await fetch(BASE.replace('/api/v1', '/health'));
  ok('health endpoint responds', h.status === 200);
  void health;

  // ── 2. Super admin ──
  console.log('2. Super admin');
  const su = await login('superadmin', process.env.SEED_SUPER_PASSWORD || 'ChangeMe2026!');
  ok('super admin logs in', su.user.role === 'SUPER_ADMIN');
  const overview = await call('GET', '/platform/overview', undefined, su.accessToken);
  ok('platform overview', overview.status === 200 && typeof overview.body.sales === 'object');

  // ── 3. Create tenant + branch + license ──
  console.log('3. Tenant lifecycle');
  const tenantName = `Smoke Pharma ${rand}`;
  const created = await call(
    'POST',
    '/platform/tenants',
    { name: tenantName, phone: '0900000000', owner: { username: `smoke_owner_${rand}`, password: 'OwnerPass1!', fullName: 'Smoke Owner' } },
    su.accessToken
  );
  ok('tenant created with owner', created.status === 201 && created.body.id, created.body);
  const tenantId = created.body.id as string;

  const branchRes = await call('POST', `/platform/tenants/${tenantId}/branches`, { name: 'Smoke Branch' }, su.accessToken);
  ok('branch created with trial license', branchRes.status === 201 && branchRes.body.license?.status === 'TRIAL', branchRes.body);
  const branchId = branchRes.body.id as string;

  const pay = await call(
    'POST',
    `/platform/branches/${branchId}/license`,
    { months: 1, method: 'telebirr', referenceNo: `TB-${rand}` },
    su.accessToken
  );
  ok('license issued via payment', pay.status === 201 && pay.body.license.status === 'ACTIVE', pay.body);
  ok('payment recorded', pay.body.payment.amountEtb === 1500);

  const ownerLogin = await login(`smoke_owner_${rand}`, 'OwnerPass1!');
  ok('owner can login', ownerLogin.user.role === 'OWNER' && ownerLogin.branches.some((b) => b.id === branchId));

  // ── 4. Catalog setup ──
  console.log('4. Catalog & purchasing');
  const cat = await call('POST', '/products/categories', { name: `SmokeCat ${rand}` }, ownerLogin.accessToken);
  ok('category created', cat.status === 201, cat.body);

  const prod = await call(
    'POST',
    '/products',
    { name: 'Smoke Aspirin 100mg', genericName: 'Acetylsalicylic acid', categoryId: cat.body.id, unitPrice: 10, costPrice: 6, wholesalePrice: 8, reorderLevel: 5, barcode: `99${rand}` },
    ownerLogin.accessToken
  );
  ok('product created', prod.status === 201, prod.body);
  const productId = prod.body.id as string;

  const prod2 = await call(
    'POST',
    '/products',
    { name: 'Smoke Vitamin D', unitPrice: 20, costPrice: 12, reorderLevel: 5 },
    ownerLogin.accessToken
  );
  ok('second product created', prod2.status === 201);
  const productId2 = prod2.body.id as string;

  const supplier = await call('POST', '/suppliers', { name: 'Smoke Supplier', phone: '011' }, ownerLogin.accessToken);
  ok('supplier created', supplier.status === 201);

  const po = await call(
    'POST',
    '/purchases/pos',
    {
      branchId,
      supplierId: supplier.body.id,
      items: [
        { productId, qtyExpected: 100, unitCost: 6 },
        { productId: productId2, qtyExpected: 50, unitCost: 12 },
      ],
    },
    ownerLogin.accessToken
  );
  ok('purchase order created', po.status === 201 && po.body.status === 'SUBMITTED', po.body);

  const grn = await call(
    'POST',
    '/purchases/grns',
    {
      branchId,
      poId: po.body.id,
      supplierId: supplier.body.id,
      invoiceNo: 'INV-001',
      items: [
        { productId, qtyReceived: 100, unitCost: 6, batchNo: 'SMOKE-B1', expiryDate: new Date(Date.now() + 300 * 24 * 3600 * 1000).toISOString() },
        { productId: productId2, qtyReceived: 50, unitCost: 12, batchNo: 'SMOKE-B2', expiryDate: new Date(Date.now() + 400 * 24 * 3600 * 1000).toISOString() },
      ],
    },
    ownerLogin.accessToken
  );
  ok('GRN received — batches created', grn.status === 201, grn.body);

  const poCheck = await call('GET', `/purchases/pos/${po.body.id}`, undefined, ownerLogin.accessToken);
  ok('PO fully received', poCheck.body.status === 'RECEIVED', poCheck.body.status);

  const stock = await call('GET', `/inventory/stock?branchId=${branchId}`, undefined, ownerLogin.accessToken);
  const aspirin = stock.body.items.find((i: { productId: string }) => i.productId === productId);
  ok('stock shows 100 units FEFO batch', aspirin?.totalQty === 100, aspirin);

  // ── 5. Staff & shift & sale ──
  console.log('5. POS flow');
  const cashier = await call(
    'POST',
    '/users',
    { username: `smoke_cashier_${rand}`, password: 'CashierPass1!', role: 'CASHIER', branchIds: [branchId], fullName: 'Smoke Cashier' },
    ownerLogin.accessToken
  );
  ok('cashier user created by owner', cashier.status === 201, cashier.body);

  const cashierLogin = await login(`smoke_cashier_${rand}`, 'CashierPass1!');
  ok('cashier logs in', cashierLogin.user.role === 'CASHIER');

  const shift = await call('POST', '/pos/shifts/open', { branchId, openingFloat: 100 }, cashierLogin.accessToken);
  ok('shift opened', shift.status === 201, shift.body);
  const shiftId = shift.body.id as string;

  // cashier tries to create a product (should fail)
  const forbidden = await call('POST', '/products', { name: 'Nope', unitPrice: 1 }, cashierLogin.accessToken);
  ok('cashier cannot create products (403)', forbidden.status === 403, forbidden.body);

  const sale = await call(
    'POST',
    '/pos/sales',
    {
      branchId,
      shiftId,
      items: [{ productId, qty: 3 }],
      paymentMethod: 'cash',
      amountPaid: 50,
      customerName: 'Walk-in',
    },
    cashierLogin.accessToken
  );
  ok('cash sale created', sale.status === 201 && sale.body.total === 30 && sale.body.changeDue === 20, sale.body);
  ok('receipt number generated', typeof sale.body.receiptNo === 'string' && sale.body.receiptNo.startsWith('R-'), sale.body.receiptNo);

  const stockAfter = await call('GET', `/inventory/stock?branchId=${branchId}`, undefined, ownerLogin.accessToken);
  const aspirinAfter = stockAfter.body.items.find((i: { productId: string }) => i.productId === productId);
  ok('stock decreased to 97 (FEFO)', aspirinAfter?.totalQty === 97, aspirinAfter?.totalQty);

  // oversell attempt
  const oversell = await call(
    'POST',
    '/pos/sales',
    { branchId, shiftId, items: [{ productId, qty: 99999 }], paymentMethod: 'cash' },
    cashierLogin.accessToken
  );
  ok('oversell rejected', oversell.status === 400, oversell.body);

  // ── 6. Credit sale + customer ──
  console.log('6. Customers & credit');
  const customer = await call(
    'POST',
    '/customers',
    { name: 'Smoke Clinic', phone: '0917777777', isWholesale: true, creditLimit: 500 },
    ownerLogin.accessToken
  );
  ok('wholesale customer created', customer.status === 201);

  const creditSale = await call(
    'POST',
    '/pos/sales',
    {
      branchId,
      customerId: customer.body.id,
      items: [{ productId, qty: 10 }],
      paymentMethod: 'credit',
      isWholesale: true,
    },
    ownerLogin.accessToken
  );
  ok('wholesale credit sale (price 8/unit = 80)', creditSale.status === 201 && creditSale.body.total === 80, creditSale.body);

  const custCheck = await call('GET', `/customers/${customer.body.id}`, undefined, ownerLogin.accessToken);
  ok('customer credit balance = 80', custCheck.body.creditBalance === 80, custCheck.body.creditBalance);

  // credit over limit
  const overCredit = await call(
    'POST',
    '/pos/sales',
    { branchId, customerId: customer.body.id, items: [{ productId, qty: 100 }], paymentMethod: 'credit', isWholesale: true },
    ownerLogin.accessToken
  );
  ok('credit over limit rejected', overCredit.status === 400, overCredit.body);

  // collect payment
  const collect = await call(
    'POST',
    `/customers/${customer.body.id}/payments`,
    { amount: 30, method: 'telebirr' },
    ownerLogin.accessToken
  );
  ok('credit payment collected (30)', collect.status === 201);
  const custCheck2 = await call('GET', `/customers/${customer.body.id}`, undefined, ownerLogin.accessToken);
  ok('credit balance now 50', custCheck2.body.creditBalance === 50, custCheck2.body.creditBalance);

  // ── 7. Refund ──
  console.log('7. Refunds');
  const saleDetail = await call('GET', `/pos/sales/${sale.body.id}`, undefined, ownerLogin.accessToken);
  const saleItemId = saleDetail.body.items[0].id as string;
  const refund = await call(
    'POST',
    `/pos/sales/${sale.body.id}/refund`,
    { reason: 'Customer returned item', items: [{ saleItemId, qty: 2, restock: true }] },
    ownerLogin.accessToken
  );
  ok('partial refund processed (2 units)', refund.status === 201 && refund.body.total === 20, refund.body);

  const stockAfterRefund = await call('GET', `/inventory/stock?branchId=${branchId}`, undefined, ownerLogin.accessToken);
  const aspirinRefunded = stockAfterRefund.body.items.find((i: { productId: string }) => i.productId === productId);
  ok('stock restored after refund (97-10+2=89)', aspirinRefunded?.totalQty === 89, aspirinRefunded?.totalQty);

  const saleAfterRefund = await call('GET', `/pos/sales/${sale.body.id}`, undefined, ownerLogin.accessToken);
  ok('sale marked PARTIALLY_REFUNDED', saleAfterRefund.body.status === 'PARTIALLY_REFUNDED');

  // ── 8. Close shift (Z-report) ──
  console.log('8. Shift close');
  const close = await call('POST', `/pos/shifts/${shiftId}/close`, { countedCash: 200 }, cashierLogin.accessToken);
  ok('shift closed with Z-report', close.status === 200 && typeof close.body.zReport.expectedCash === 'number', close.body);
  ok('expected cash = 100 float + 30 cash sale = 130', close.body.zReport.expectedCash === 130, close.body.zReport.expectedCash);
  ok('variance = +70', close.body.zReport.variance === 70);

  // ── 9. Transfers ──
  console.log('9. Stock transfers');
  const branch2Res = await call('POST', `/platform/tenants/${tenantId}/branches`, { name: 'Smoke Branch 2' }, su.accessToken);
  const branch2Id = branch2Res.body.id as string;
  // activate branch2 license
  await call('POST', `/platform/branches/${branch2Id}/license`, { months: 1 }, su.accessToken);

  const transfer = await call(
    'POST',
    '/inventory/transfers',
    { fromBranchId: branchId, toBranchId: branch2Id, items: [{ productId, qty: 20 }] },
    ownerLogin.accessToken
  );
  ok('transfer requested', transfer.status === 201, transfer.body);
  const transferId = transfer.body.id as string;

  const approve = await call('POST', `/inventory/transfers/${transferId}/approve`, {}, ownerLogin.accessToken);
  ok('transfer approved (in transit)', approve.status === 200, approve.body);

  const stockAfterOut = await call('GET', `/inventory/stock?branchId=${branchId}`, undefined, ownerLogin.accessToken);
  ok('source stock down to 69', stockAfterOut.body.items.find((i: { productId: string }) => i.productId === productId)?.totalQty === 69);

  const receive = await call('POST', `/inventory/transfers/${transferId}/receive`, {}, ownerLogin.accessToken);
  ok('transfer received', receive.status === 200, receive.body);

  const stockBranch2 = await call('GET', `/inventory/stock?branchId=${branch2Id}`, undefined, ownerLogin.accessToken);
  ok('destination has 20 units', stockBranch2.body.items.find((i: { productId: string }) => i.productId === productId)?.totalQty === 20);

  // ── 10. Stock count ──
  console.log('10. Stock count');
  const count = await call('POST', '/inventory/counts', { branchId }, ownerLogin.accessToken);
  ok('count started with snapshot', count.status === 201 && count.body.items.length > 0, count.body.items?.length);
  const countId = count.body.id as string;
  const countDetail = await call('GET', `/inventory/counts/${countId}`, undefined, ownerLogin.accessToken);
  const aspirinCountItem = countDetail.body.items.find((i: { productId: string }) => i.productId === productId);
  const allItems = countDetail.body.items.map((i: { id: string; productId: string; systemQty: number }) => ({
    itemId: i.id,
    countedQty: i.productId === productId ? 65 : i.systemQty,
  }));
  const submit = await call(
    'PATCH',
    `/inventory/counts/${countId}/items`,
    { items: allItems },
    ownerLogin.accessToken
  );
  ok('counted quantities submitted', submit.status === 200);
  const approveCount = await call('POST', `/inventory/counts/${countId}/approve`, {}, ownerLogin.accessToken);
  ok('count approved — variance applied', approveCount.status === 200);
  const stockAfterCount = await call('GET', `/inventory/stock?branchId=${branchId}`, undefined, ownerLogin.accessToken);
  ok('stock now 65 after count', stockAfterCount.body.items.find((i: { productId: string }) => i.productId === productId)?.totalQty === 65);

  // ── 11. Prescriptions ──
  console.log('11. Prescriptions');
  const rx = await call(
    'POST',
    '/prescriptions',
    { branchId, customerName: 'Smoke Patient', phone: '0910001111', doctorName: 'Dr. Smoke', notes: 'Test rx' },
    ownerLogin.accessToken
  );
  ok('prescription created', rx.status === 201, rx.body);
  const rxVerify = await call('POST', `/prescriptions/${rx.body.id}/verify`, {}, ownerLogin.accessToken);
  ok('prescription verified', rxVerify.status === 200 && rxVerify.body.status === 'VERIFIED');

  const saleWithRx = await call(
    'POST',
    '/pos/sales',
    { branchId, items: [{ productId, qty: 1 }], paymentMethod: 'cash', prescriptionId: rx.body.id },
    ownerLogin.accessToken
  );
  ok('sale linked to prescription dispenses it', saleWithRx.status === 201);

  // ── 12. Finance & reports ──
  console.log('12. Finance & reports');
  const expense = await call(
    'POST',
    '/finance/expenses',
    { branchId, category: 'Utilities', amount: 250, description: 'Electricity' },
    ownerLogin.accessToken
  );
  ok('expense recorded', expense.status === 201);

  const summary = await call('GET', `/finance/summary?range=month`, undefined, ownerLogin.accessToken);
  ok('finance summary computes', summary.status === 200 && typeof summary.body.revenue === 'number', summary.body);
  ok('expenses included (250)', summary.body.expenses === 250);

  const salesReport = await call('GET', '/reports/sales?range=month', undefined, ownerLogin.accessToken);
  ok('sales report with byDay series', salesReport.status === 200 && Array.isArray(salesReport.body.byDay), salesReport.body.byDay);
  ok('top products tracked', salesReport.body.topProducts.length > 0);

  const invReport = await call('GET', `/reports/inventory?branchId=${branchId}`, undefined, ownerLogin.accessToken);
  ok('inventory valuation', invReport.status === 200 && invReport.body.totalCost > 0);

  const expiryReport = await call('GET', '/reports/expiry?days=90', undefined, ownerLogin.accessToken);
  ok('expiry report works', expiryReport.status === 200 && Array.isArray(expiryReport.body.soon));

  const cashierReport = await call('GET', '/finance/cashiers?range=month', undefined, ownerLogin.accessToken);
  ok('cashier report aggregates', cashierReport.status === 200 && cashierReport.body.length > 0);

  // ── 13. License gate ──
  console.log('13. License enforcement');
  const revoke = await call('DELETE', `/platform/branches/${branchId}/license`, undefined, su.accessToken);
  ok('license revoked', revoke.status === 200);

  const blockedSale = await call(
    'POST',
    '/pos/sales',
    { branchId, items: [{ productId, qty: 1 }], paymentMethod: 'cash' },
    ownerLogin.accessToken
  );
  ok('sale blocked when license expired (402)', blockedSale.status === 402 && blockedSale.body.error.code === 'LICENSE_EXPIRED', blockedSale.body);

  const stillReads = await call('GET', `/inventory/stock?branchId=${branchId}`, undefined, ownerLogin.accessToken);
  ok('reads still allowed when expired', stillReads.status === 200);

  const reIssue = await call('POST', `/platform/branches/${branchId}/license`, { months: 2 }, su.accessToken);
  ok('license re-issued', reIssue.status === 201);
  const unblockedSale = await call(
    'POST',
    '/pos/sales',
    { branchId, items: [{ productId, qty: 1 }], paymentMethod: 'cash' },
    ownerLogin.accessToken
  );
  ok('sales work again after renewal', unblockedSale.status === 201, unblockedSale.body);

  // ── 14. Tenant isolation ──
  console.log('14. Tenant isolation');
  const tenant2 = await call(
    'POST',
    '/platform/tenants',
    { name: `Isolation Pharma ${rand}`, owner: { username: `iso_owner_${rand}`, password: 'OwnerPass1!' } },
    su.accessToken
  );
  const isoLogin = await login(`iso_owner_${rand}`, 'OwnerPass1!');
  const crossRead = await call('GET', `/products/${productId}`, undefined, isoLogin.accessToken);
  ok('tenant B cannot read tenant A product', crossRead.status === 404, crossRead.body);
  const crossList = await call('GET', '/products?search=Smoke', undefined, isoLogin.accessToken);
  ok('tenant B list has no tenant A products', crossList.body.items.length === 0);
  const crossBranch = await call('GET', `/inventory/stock?branchId=${branchId}`, undefined, isoLogin.accessToken);
  ok('tenant B cannot access tenant A branch stock', crossBranch.status === 403 || crossBranch.status === 404, crossBranch.status);

  // cashier of tenant A trying platform endpoints
  const cashierPlatform = await call('GET', '/platform/overview', undefined, cashierLogin.accessToken);
  ok('cashier blocked from platform API', cashierPlatform.status === 403, cashierPlatform.status);

  // ── 15. Auth extras ──
  console.log('15. Auth extras');
  const refreshed = await call('POST', '/auth/refresh', { refreshToken: ownerLogin.refreshToken });
  ok('refresh token rotation works', refreshed.status === 200 && refreshed.body.accessToken, refreshed.body);

  const reuseOld = await call('POST', '/auth/refresh', { refreshToken: ownerLogin.refreshToken });
  ok('old refresh token revoked after rotation', reuseOld.status === 401);

  const me = await call('GET', '/auth/me', undefined, refreshed.body.accessToken);
  ok('me endpoint returns session', me.status === 200 && me.body.user.username === `smoke_owner_${rand}`);

  const badLogin = await call('POST', '/auth/login', { username: `smoke_owner_${rand}`, password: 'wrong' });
  ok('wrong password rejected', badLogin.status === 401);

  // impersonation
  const imp = await call('POST', `/platform/tenants/${tenantId}/impersonate`, {}, su.accessToken);
  ok('super admin impersonates tenant', imp.status === 200 && imp.body.impersonated === true, imp.body);
  const impSale = await call('GET', '/pos/sales', undefined, imp.body.accessToken);
  ok('impersonated token works on tenant data', impSale.status === 200);

  // audit trail
  const platformAudit = await call('GET', '/platform/audit', undefined, su.accessToken);
  ok('platform audit trail recorded', platformAudit.status === 200 && platformAudit.body.length > 0);

  // ── Summary ──
  console.log(`\n══════════════════════════════`);
  console.log(`PASSED: ${passed}   FAILED: ${failed}`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  ✗ ${f}`));
    process.exit(1);
  } else {
    console.log('ALL SMOKE TESTS PASSED ✅');
  }
};

main().catch((e) => {
  console.error('SMOKE TEST CRASHED:', e.message);
  console.error(`PASSED: ${passed}   FAILED: ${failed}`);
  process.exit(1);
});
