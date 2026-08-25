import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const main = async () => {
  console.log('Seeding…');

  // ── Super admin ──
  const superAdmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      passwordHash: await bcrypt.hash(process.env.SEED_SUPER_PASSWORD || 'ChangeMe2026!', 10),
      fullName: 'Platform Owner',
      role: 'SUPER_ADMIN',
      tenantId: null,
    },
  });
  console.log('✓ super admin: superadmin');

  // ── Demo tenant ──
  const existingTenant = await prisma.tenant.findFirst({ where: { name: 'TenaLesew Pharma (Demo)' } });
  if (existingTenant) {
    console.log('✓ demo tenant already exists — skipping');
    return;
  }

  const tenant = await prisma.tenant.create({
    data: { name: 'TenaLesew Pharma (Demo)', phone: '0911000000', address: 'Bole Road, Addis Ababa' },
  });

  // Owner + staff
  const ownerHash = await bcrypt.hash('Owner2026!', 10);
  const staffHash = await bcrypt.hash('Staff2026!', 10);
  const owner = await prisma.user.create({
    data: { username: 'owner', passwordHash: ownerHash, fullName: 'Pharmacy Owner', role: 'OWNER', tenantId: tenant.id, email: 'owner@demo.tl' },
  });
  await prisma.user.createMany({
    data: [
      { username: 'manager', passwordHash: staffHash, fullName: 'Branch Manager', role: 'BRANCH_MANAGER', tenantId: tenant.id },
      { username: 'pharmacist', passwordHash: staffHash, fullName: 'Desta Pharmacist', role: 'PHARMACIST', tenantId: tenant.id },
      { username: 'cashier', passwordHash: staffHash, fullName: 'Hanna Cashier', role: 'CASHIER', tenantId: tenant.id },
      { username: 'inventory', passwordHash: staffHash, fullName: 'Sol Inventory', role: 'INVENTORY_MANAGER', tenantId: tenant.id },
      { username: 'wholesale', passwordHash: staffHash, fullName: 'Abebe Wholesale', role: 'WHOLESALE_MANAGER', tenantId: tenant.id },
    ],
  });

  // Branches with trial + active licenses
  const main = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      name: 'Main Branch',
      location: 'Bole, Addis Ababa',
      phone: '0111111111',
      license: { create: { status: 'ACTIVE', paidUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000) } },
    },
  });
  const bole = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      name: 'Bole Branch',
      location: 'Bole Michael',
      license: { create: { status: 'TRIAL', trialEndsAt: new Date(Date.now() + 14 * 24 * 3600 * 1000) } },
    },
  });

  // branch assignments
  const users = await prisma.user.findMany({ where: { tenantId: tenant.id } });
  const byRole = (role: string) => users.find((u) => u.role === role)!;
  await prisma.userBranch.createMany({
    data: [
      { userId: byRole('BRANCH_MANAGER').id, branchId: main.id },
      { userId: byRole('PHARMACIST').id, branchId: main.id },
      { userId: byRole('CASHIER').id, branchId: main.id },
      { userId: byRole('INVENTORY_MANAGER').id, branchId: main.id },
      { userId: byRole('INVENTORY_MANAGER').id, branchId: bole.id },
      { userId: byRole('WHOLESALE_MANAGER').id, branchId: main.id },
    ],
  });

  // Categories
  const catNames = ['Pain Relief', 'Antibiotics', 'Vitamins', 'Cough & Cold', 'Allergy', 'Digestive'];
  const cats = new Map<string, string>();
  for (const name of catNames) {
    const c = await prisma.category.create({ data: { tenantId: tenant.id, name } });
    cats.set(name, c.id);
  }

  // Products
  const products: { name: string; generic: string; strength: string; cat: string; price: number; cost: number; wholesale: number; reorder: number; barcode: string }[] = [
    { name: 'Paracetamol 500mg', generic: 'Paracetamol', strength: '500mg tablet', cat: 'Pain Relief', price: 5, cost: 3, wholesale: 4, reorder: 20, barcode: '1000000001' },
    { name: 'Ibuprofen 200mg', generic: 'Ibuprofen', strength: '200mg tablet', cat: 'Pain Relief', price: 3.5, cost: 2, wholesale: 2.8, reorder: 30, barcode: '1000000002' },
    { name: 'Amoxicillin 500mg', generic: 'Amoxicillin', strength: '500mg capsule', cat: 'Antibiotics', price: 12, cost: 8, wholesale: 9.6, reorder: 15, barcode: '1000000003' },
    { name: 'Vitamin C 1000mg', generic: 'Ascorbic Acid', strength: '1000mg tablet', cat: 'Vitamins', price: 8, cost: 5, wholesale: 6.4, reorder: 40, barcode: '1000000004' },
    { name: 'Cough Syrup', generic: 'Guaifenesin', strength: '100ml bottle', cat: 'Cough & Cold', price: 7.5, cost: 4.5, wholesale: 6, reorder: 20, barcode: '1000000005' },
    { name: 'Cetirizine 10mg', generic: 'Cetirizine', strength: '10mg tablet', cat: 'Allergy', price: 4, cost: 2.5, wholesale: 3.2, reorder: 50, barcode: '1000000006' },
    { name: 'ORS Packet', generic: 'Oral Rehydration Salt', strength: '20.5g sachet', cat: 'Digestive', price: 2, cost: 1, wholesale: 1.6, reorder: 100, barcode: '1000000007' },
    { name: 'Augmentin 625mg', generic: 'Amoxicillin/Clavulanate', strength: '625mg tablet', cat: 'Antibiotics', price: 18, cost: 12, wholesale: 14.4, reorder: 10, barcode: '1000000008' },
  ];
  const productIds = new Map<string, string>();
  for (const p of products) {
    const created = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: p.name,
        genericName: p.generic,
        strength: p.strength,
        categoryId: cats.get(p.cat),
        packSize: 30,
        barcode: p.barcode,
        unitPrice: p.price,
        costPrice: p.cost,
        wholesalePrice: p.wholesale,
        reorderLevel: p.reorder,
      },
    });
    productIds.set(p.name, created.id);
  }

  // Opening stock at Main Branch (batches)
  let i = 0;
  for (const p of products) {
    i += 1;
    await prisma.batch.create({
      data: {
        tenantId: tenant.id,
        branchId: main.id,
        productId: productIds.get(p.name)!,
        batchNo: `B2026-00${i}`,
        expiryDate: new Date(Date.now() + (120 + i * 30) * 24 * 3600 * 1000),
        qtyOnHand: p.reorder * 3,
        costPrice: p.cost,
      },
    });
  }
  // one near-expiry batch for alerts
  await prisma.batch.create({
    data: {
      tenantId: tenant.id,
      branchId: main.id,
      productId: productIds.get('Cough Syrup')!,
      batchNo: 'B2025-EXP',
      expiryDate: new Date(Date.now() + 20 * 24 * 3600 * 1000),
      qtyOnHand: 6,
      costPrice: 4.5,
    },
  });
  // some stock at Bole
  await prisma.batch.create({
    data: {
      tenantId: tenant.id,
      branchId: bole.id,
      productId: productIds.get('Paracetamol 500mg')!,
      batchNo: 'B2026-101',
      expiryDate: new Date(Date.now() + 200 * 24 * 3600 * 1000),
      qtyOnHand: 60,
      costPrice: 3,
    },
  });

  // Suppliers
  await prisma.supplier.createMany({
    data: [
      { tenantId: tenant.id, name: 'PharmaCo Ethiopia', phone: '0112223333', email: 'sales@pharmaco.et', address: 'Addis Ababa' },
      { tenantId: tenant.id, name: 'MedSupply PLC', phone: '0114445555', email: 'info@medsupply.et', address: 'Dire Dawa' },
    ],
  });

  // Customers
  await prisma.customer.createMany({
    data: [
      { tenantId: tenant.id, name: 'John Doe', phone: '0912345678', email: 'john@example.com' },
      { tenantId: tenant.id, name: 'Sarah Johnson', phone: '0919876543' },
      { tenantId: tenant.id, name: 'ABC Pharmacy', phone: '0911111111', isWholesale: true, creditLimit: 20000 },
      { tenantId: tenant.id, name: 'Health Plus Clinic', phone: '0912222222', isWholesale: true, creditLimit: 10000 },
    ],
  });

  console.log('✓ demo tenant: TenaLesew Pharma (Demo)');
  console.log('  owner / Owner2026!');
  console.log('  manager|pharmacist|cashier|inventory|wholesale / Staff2026!');
  console.log(`  tenant id: ${tenant.id}`);
  void superAdmin;
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
