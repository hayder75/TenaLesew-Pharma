# TenaLesew Pharma — Full System Architecture & Master Plan

> Multi-tenant pharmacy SaaS platform. This document is the single source of truth
> for what we are building, how it is structured, and the build order.

---

## 1. Vision

A SaaS platform where:

- **You (Super Admin)** run the platform. You register pharmacy businesses (tenants),
  grant them admin access, monitor them, and manage their licensing.
- **Each pharmacy** manages its own branches, staff, users, stock, sales, and reporting.
- **Licensing is manual for now**: pharmacies pay per-branch via Telebirr, you verify the
  payment, and you activate/renew that branch's license manually from the Super Admin panel.
- Ethiopia market → currency **ETB**, Telebirr payments, Amharic language support later.
- Deferred (do NOT build now): tax calculation, Stripe/online payment gateways,
  Docker, S3/cloud storage, insurance integration.

---

## 2. Tenancy Model

```
PLATFORM
│  (you — SUPER_ADMIN)
│
├── TENANT = one registered pharmacy company        e.g. "TenaLesew Pharma"
│     ├── status: pending / active / suspended
│     ├── owner account (first admin you create for them)
│     ├── tenant settings (name, phone, logo, receipt header, currency=ETB)
│     ├── PRODUCTS catalog (shared across the tenant's branches)
│     └── BRANCHES
│           ├── each branch has its own LICENSE (active/expired + paid-until date)
│           └── branch-scoped data: stock batches, sales, shifts, cashiers
└── USERS belong to a TENANT, assigned to branch(es), each with a ROLE
```

### Rules

| Rule | Detail |
|---|---|
| Tenant creation | Only Super Admin registers a tenant (no public self-signup for now) |
| First user | Super Admin creates the Owner account for the pharmacy and hands over credentials |
| Self-management | After handover, the Owner/Admin creates branches, invites staff, assigns roles |
| Stock | Always belongs to a **branch**, never floats at tenant level |
| Product catalog | Belongs to the **tenant**, shared by all its branches (prices can differ per branch) |
| Sales | Always recorded against a **branch** + the cashier's shift |
| Isolation | Every query is scoped by `tenant_id` (enforced in backend middleware, not trust-the-client) |
| License | A **branch** works only while its license is active. Expired → read-only (view reports, no transactions). Data is never deleted. |

---

## 3. Roles & Permissions

Fixed set of roles (no custom role builder for v1).

### Platform level
| Role | Scope | Capabilities |
|---|---|---|
| **SUPER_ADMIN** | Whole platform | Register/suspend/reactivate tenants, record Telebirr payments, issue/renew branch licenses, view cross-tenant dashboards (tenants, branches, revenue, activity), impersonate a tenant for support |

### Tenant level
| Role | Scope | Capabilities |
|---|---|---|
| **OWNER** | All branches | Everything in their pharmacy incl. staff management, branch licenses info, all reports. Cannot touch other tenants or billing |
| **ADMIN** | All branches | Same as Owner minus deleting the tenant / transferring ownership |
| **BRANCH_MANAGER** | Assigned branch(es) | Branch dashboard, approve adjustments/transfers, manage branch staff schedule, branch reports |
| **PHARMACIST** | Assigned branch | POS, prescription verification/dispensing, view stock |
| **CASHIER** | Assigned branch | POS, open/close own shift, view own sales |
| **INVENTORY_MANAGER** | Assigned branch(es) or all | Products, purchases/GRN, stock counts, adjustments, suppliers, transfers |
| **WHOLESALE_MANAGER** | Tenant-wide | Wholesale orders, credit clients, collections |
| **ACCOUNTANT** | Read-mostly, tenant-wide | Finance, P&L, expenses, exports. No stock mutations |

Permission enforcement: backend middleware checks `role + branch scope` per endpoint.
Frontend hides/disables what a role can't use (UI is convenience; backend is law).

---

## 4. Licensing & Manual Payments (Telebirr, per-branch)

### Model
- Pricing unit: **per branch, per month** (price TBD — keep configurable constant).
- Flow:
  1. You register tenant → create branches → each new branch gets a **trial license**
     (e.g. 14 days, configurable).
  2. Pharmacy pays via **Telebirr** to your personal/business number.
  3. You open Super Admin panel → find tenant/branch → **Record Payment**
     (amount, method=Telebirr, transaction reference, months paid) → license extends
     to `paid_until` date automatically.
  4. Reminders: in-app banner for staff at 14/7/3 days before expiry; expired →
     read-only lock (sales/POS blocked, reports visible, nothing lost).
  5. Suspension (tenant-level): repeated non-payment or policy violation →
     Super Admin suspends → whole tenant locked read-only.

### Tables involved
- `branch_licenses`: branch_id, status(trial/active/grace/expired), trial_ends_at, paid_until
- `payments`: id, tenant_id, branch_id (nullable = tenant-wide), amount_etb, method(telebirr/manual),
  reference_no, months_paid, period_start, period_end, note, recorded_by(super_admin), created_at

> Later (explicitly out of scope now): online Telebirr API integration, Stripe,
> automated webhooks, invoicing PDFs.

---

## 5. Super Admin Portal — What You See

Single dashboard after logging in as SUPER_ADMIN:

### 5.1 Overview page
- Total tenants (active / suspended / expired-license count)
- Total branches (licensed vs expired vs trial)
- Platform-wide sales today / this month (ETB, aggregated)
- New registrations timeline
- Licenses expiring within 7 days (action list)

### 5.2 Tenants list
Searchable table: name, owner, phone, #branches, status, created date, last activity date,
total sales this month. Click → tenant detail.

### 5.3 Tenant detail page
- Profile + owner contact
- Branches tab: each branch with license status, paid_until, quick actions
  (record payment, renew, suspend branch)
- Activity tab: what they've been doing recently — logins, sales count/volume per branch,
  top products, staff count (summary level, NOT reading their private records line-by-line;
  aggregates + audit events, privacy-respecting)
- Payments tab: full payment history + "Record Payment" button
- Actions: impersonate (support login), suspend, reactivate

### 5.4 Payments page
All recorded Telebirr payments across tenants, filterable by tenant/date/method.

### 5.5 Audit page
Platform-level events: tenant created, license issued/renewed, suspensions, logins by super admin.

---

## 6. Business Modules (the whole system)

### 6.1 Authentication & Users
- Login: username/email + password → JWT access token (short) + refresh token (long, rotating)
- Passwords hashed with argon2; failed-attempt lockout; rate limiting on auth routes
- Forgot/reset password (email or SMS code — email provider TBD, fallback: admin resets manually)
- Staff invitation: Owner/Admin generates invite link/code → user sets own password
- User profile, change password, session management (logout everywhere)
- Deactivate users (never hard-delete — history must stay intact)

### 6.2 Products & Inventory
- Product (tenant-level): brand name, generic name, strength/dosage form, manufacturer,
  category, pack size (e.g. box of 30), barcode, unit sell price, cost price (default),
  reorder level, image, notes
- **Batch/Lot tracking (critical)**: every received quantity = batch with
  `{product, branch, batch_no, expiry_date, qty_on_hand, cost_price}`.
  Selling consumes from the **earliest-expiring batch first (FEFO)**.
- Pack OR unit selling (sell 1 tablet out of a strip/box; fractional packs tracked per unit)
- Low-stock alerts (per branch reorder level), dead-stock report
- Expiry management: near-expiry report (30/60/90 days), expired stock report,
  write-off workflow (expired → damaged/return-to-supplier adjustment with reason)
- Stock movements ledger: every qty change is an immutable row
  `{branch, product, batch, type: sale|purchase|adjustment|transfer_in|transfer_out|damage|return, qty_before, qty_after, reason, user, timestamp}`
- Physical stock count: create count session → enter counted qty → variance report → approve → auto-adjustment
- Stock transfer between branches: request → approve at destination → in-transit state → receive (both ledgers updated)
- Barcode: scan-to-search in POS/purchases; generate labels for unlabeled items (print later phase)

### 6.3 Suppliers & Purchasing
- Supplier directory (name, phone, TIN optional, address, balance)
- Purchase Order: select supplier + products + expected qty/cost → statuses
  draft → sent → partially_received → received → closed (also cancelled)
- Goods Received Note (GRN): receive against PO (partial allowed) → creates **batches**
  (batch no + expiry entered at receiving — mandatory for medicines) → updates payable
- Supplier returns (damaged/expiring goods back to supplier) → reduces payable
- Supplier statement: purchases, returns, payments made, running balance

### 6.4 POS (Point of Sale)
- Fast product search: name/generic/barcode; keyboard-first UX; favorites grid
- Cart: qty, pack/unit toggle, per-line discount (permission-gated % cap), customer attach (optional)
- Payment methods: Cash / Card / Telebirr / Mixed-split
- Hold/park sale & resume (multiple parked carts)
- Receipt: numbered sequence per branch, printable thermal format (ESC/POS via browser print v1),
  pharmacy logo/name/address from tenant settings
- Returns/refunds: pick original sale → refund lines → restock logic (good stock → back to batch;
  damaged → write-off) → manager permission required above threshold
- Offline-tolerant design decision (see §9): v1 requires internet; PWA offline queue in Phase 4
- Credit sale toggle (permission-gated): goes to customer credit account instead of payment

### 6.5 Shifts & Cash Management
- Open shift: starting float entered → shift bound to cashier+till
- During shift: all cash sales logged; cash-in/cash-out entries (paid-out, cash drop) with reason
- Close shift: counted cash entered → auto compare vs expected → variance recorded → Z-report
  (shift summary: sales by type, discounts, refunds, cash expected/counted/variance)
- End-of-day report per branch (all shifts combined)
- Manager dashboard: who has open shifts, current till balances

### 6.6 Customers / Patients
- Profile: name, phone, optional DOB/gender/allergies/chronic conditions/notes
- Phone-based quick lookup in POS
- Purchase history per customer
- Loyalty points: earn % of purchase, redeem as discount (simple v1; tiers later)
- Credit accounts (esp. wholesale): credit limit, outstanding balance, payments collected,
  statements, aging report (who owes how long)

### 6.7 Prescriptions
- Record prescription: patient link, uploaded photo (phone camera), doctor name, items dispensed
- Workflow: entered → pharmacist verifies → dispensed (links to sale lines) → archived
- Retention: never delete; view dispensing history per patient
- (Later: interaction warnings, refill schedules)

### 6.8 Wholesale Module
- Wholesale price tier per product
- Wholesale orders: bigger carts, credit terms, delivery note printing, invoice printing
- Dedicated wholesale customer list with credit management
- Collections: record payments against credit, receipts printed

### 6.9 Finance
- Auto-recorded: daily sales, refunds, discounts given
- Expenses module: categories (rent, salary, utility, transport, misc), per branch, attachments optional
- Cash deposit tracking (deposits vs cash sales reconciliation)
- Reports: Profit & Loss (revenue − COGS using batch cost − expenses − discounts/refunds),
  margins per product/category, cash flow summary
- Exports: CSV/PDF everywhere

### 6.10 Reports & Dashboards (per role scope)
- Branch dashboard: today/week/month sales, transactions, avg basket, low stock, expiring soon,
  top movers
- Owner dashboard: consolidated across branches, branch-vs-branch comparison
- Sales reports: by day/product/cashier/payment method/category
- Inventory reports: valuation (qty × cost per branch), movement history, dead stock,
  near-expiry, low stock
- Staff reports: sales per cashier, shift variances, discount usage
- Scheduled summaries later (email/SMS digest)

### 6.11 Notifications & Alerts
In-app notification center + badge:
- Low stock / out of stock (to inventory + owner)
- Near-expiry batches
- License expiry warnings (owner sees; staff see neutral banner)
- Transfer requests awaiting approval
- Shift variance flagged
(SMS/Telegram later — provider TBD)

### 6.12 Settings
- Tenant: name, logo, phone, address, receipt header/footer text, fiscal note placeholder
  (tax field exists but unused — deferred), currency fixed ETB for now
- Branch: name, location, phone, working hours
- Per-role policy toggles: max discount % per role, refund approval threshold,
  negative-sale allowance (default off), credit sale permissions

### 6.13 Audit Log
Every sensitive action recorded: login/logout, price changes, product edits, deletions,
discounts > threshold, refunds, adjustments, approvals, user/role changes, license changes.
Filterable by actor/action/date. Immutable (append-only).

---

## 7. Data Model (PostgreSQL schema sketch)

Core identity & tenancy:
```
users            id, username, email?, phone?, password_hash, full_name, role,
                 tenant_id NULLABLE (null = platform super admin), is_active, created_at
user_branches    user_id, branch_id          ← which branches a user may work in
tenants          id, name, owner_user_id?, phone, address, logo_path?, status,
                 created_at, created_by
branches         id, tenant_id, name, location?, phone?, is_active
branch_licenses  id, branch_id UNIQUE, status(trial|active|grace|expired),
                 trial_ends_at, paid_until
payments         id, tenant_id, branch_id?, amount_etb, method, reference_no,
                 months_paid, period_start, period_end, note, recorded_by, created_at
invites          id, tenant_id, branch_ids[], role, code, invited_by, expires_at, used_at?
password_resets  id, user_id, token_hash, expires_at, used_at
sessions/refresh_hashes  user_id, token_hash, device?, expires_at, revoked_at
```

Catalog & stock:
```
products         id, tenant_id, brand_name, generic_name?, strength/form?, manufacturer?,
                 category_id?, pack_size, barcode?, unit_price, default_cost,
                 reorder_level, image_path?, is_active
categories       id, tenant_id, name
batches          id, product_id, branch_id, batch_no, expiry_date, qty_on_hand(numeric),
                 cost_price, received_at, grn_item_id?
stock_movements  id, tenant_id, branch_id, product_id, batch_id?, type, qty_delta,
                 qty_after, reason?, ref_table?, ref_id?, user_id, created_at   ← append-only
suppliers        id, tenant_id, name, phone, address?, tin?, balance, is_active
purchase_orders      id, tenant_id, supplier_id, branch_id, status, expected_date?, totals, created_by
purchase_order_items po_id, product_id, qty_expected, unit_cost
goods_receipts       id, po_id?, supplier_id, branch_id, received_by, invoice_no?, total
grn_items            grn_id, product_id, qty_received, unit_cost, batch_no, expiry_date
stock_transfers      id, tenant_id, from_branch, to_branch, status(requested|approved|in_transit|received|cancelled), requested_by, approved_by
stock_transfer_items transfer_id, product_id, qty
stock_counts         id, branch_id, status(open|counting|review|approved), started_by, approved_by
stock_count_items    count_id, product_id, batch_id, system_qty, counted_qty, variance
```

Sales & money:
```
customers        id, tenant_id, name, phone?, dob?, gender?, allergies?, conditions?, notes?,
                 loyalty_points, credit_balance, credit_limit?, is_wholesale, created_at
shifts           id, branch_id, cashier_id, opened_at, closed_at?, opening_float,
                 expected_cash?, counted_cash?, variance?, status, z_report_no?
sales            id, tenant_id, branch_id, shift_id, cashier_id, customer_id?,
                 subtotal, discount_total, total, payment_method(cash|card|telebirr|mixed|credit),
                 amount_paid, change_due, status(completed|refunded|partially_refunded),
                 receipt_no, offline_uuid?, created_at
sale_items       sale_id, product_id, batch_id, qty, unit_price, pack_qty/unit_qty, discount, line_total
sale_refunds     id, sale_id, processed_by, reason, total, created_at
refund_items     refund_id, sale_item_id, qty, restock(batch back | written off)
customer_payments id, tenant_id, customer_id, amount, method, collected_by, sale_id?, created_at
prescriptions    id, tenant_id, branch_id, customer_id?, photo_path, doctor_name?,
                 status(received|verified|dispensed), verified_by, sale_id?, notes, created_at
expenses         id, tenant_id, branch_id?, category, amount, description?, spent_at, recorded_by
wholesale_orders → reuse sales with wholesale customer + delivery_note_no? (decision: reuse, add flags)
```

Platform ops:
```
audit_logs       id, tenant_id?, branch_id?, actor_id, action, entity_type, entity_id,
                 detail_json, ip?, created_at                          ← append-only
notifications    id, tenant_id, audience_role?, branch_id?, type, title, body, link?, read_at?
settings         tenant_id PK, json (receipt header/footer, policies, trial_days, price_per_branch...)
```

Indexes: everything filtered by `(tenant_id, …)`; `batches(branch_id, product_id, expiry_date)`;
`sales(tenant_id, branch_id, created_at)`; partial index on low stock & expiring batches.

Money rule: all amounts `NUMERIC(12,2)` — never floats.

---

## 8. Backend Design

- **Stack**: Node.js + Express (TypeScript) + Prisma ORM + PostgreSQL + Redis (cache/rate-limit) 
- **Structure**: modular routers — `/auth`, `/platform`, `/tenants`, `/branches`, `/users`,
  `/products`, `/inventory`, `/purchases`, `/pos`, `/shifts`, `/customers`, `/prescriptions`,
  `/wholesale`, `/finance`, `/reports`, `/notifications`, `/settings`
- **Middleware chain**: authenticate(JWT) → load tenant context → check license/lock state →
  authorize(role + branch scope) → validate(Zod) → handler
- **License gate**: if branch license expired → allow GET (reports/history) but block
  mutations (402-style error, friendly frontend lock screen)
- **Transactions**: sale creation = single DB transaction
  (validate stock → decrement FEFO batches → insert sale+items+movements+loyalty) — atomic
- **Validation**: Zod schemas shared shape with frontend types
- **Rate limiting**: strict on auth; general limiter on API
- **File uploads** (prescription photos, logos, expense receipts): stored locally under
  `/home/ubuntu/tenalesew-pharma/uploads/<tenantId>/…` served through authenticated route
  (S3 swap-in later behind same interface)
- **Jobs (Redis/BullMQ or node-cron v1)**: nightly expiry scan (notifications),
  license status transitions, backup trigger

### API conventions
- REST under `/api/v1/…`, JSON, snake→camel consistent
- Pagination (`?page&limit`) + filtering on all list endpoints
- Errors: `{ error: { code, message, details? } }`
- Impersonation: SUPER_ADMIN issues scoped short-lived token carrying `impersonated_by`

---

## 9. Frontend Plan

- Keep React 19 + Vite + Tailwind + React Router; add **TanStack Query** (server state,
  caching, retries), **react-hook-form + Zod** (forms), **recharts** (dashboards)
- Two app shells:
  1. **Platform shell** — super admin portal (routes under `/platform/*`)
  2. **Pharmacy shell** — existing sidebar layout, role-filtered menu, branch switcher
     (top-right) for multi-branch users
- Auth screens: login, forgot/reset, accept-invite (set password)
- Locked-state UX: expired license → friendly full-screen notice w/ owner contact,
  reports still browsable
- POS page rebuilt: fast keyboard flow, hold/resume drawer, mixed-payment modal, receipt print
- PWA manifest now (installable); true offline queue = Phase 4
- Amharic i18n scaffold added but English strings first (i18next, Phase 4 fill-in)

---

## 10. Deployment (current VPS, simple — no Docker/S3 for now)

Server: `144.217.167.195` (existing: sms-backend :3001, gech-salon :3200 — untouched)

| Component | How | Port |
|---|---|---|
| Frontend (this React app) | pm2 `serve dist` — already running | 4300 public |
| Backend API | pm2 Node process, internal only | 4400 localhost |
| PostgreSQL | already installed on server | 5432 localhost only |
| Redis | already installed | 6379 localhost only |
| Uploads | local dir, excluded from rsync deploys | — |
| nginx | added when domain arrives: proxy `/` → 4300, `/api` → 4400, HTTPS via certbot | 80/443 |

Ops hygiene (cheap now, saves pain later):
- Nightly `pg_dump` cron → gzip → keep 14 days (local + copy off-box when possible)
- `.env` files never committed; secrets in server-only env
- UFW: expose only needed ports (4300 now; 80/443 later; 4400 stays internal)
- pm2 save + startup already enabled

Environments: `dev` (local) → `prod` (VPS). Staging skipped until revenue justifies it;
DB migrations via Prisma migrate with backup-before-migrate habit.

---

## 11. Build Roadmap

### Phase 0 — Foundation (backend skeleton)
Prisma schema for tenancy core → migrations → Express app + middleware chain →
auth (login/refresh/invite/reset) → tenant/branch/user CRUD (scoped) → seed script
(you as super admin + demo tenant) → deploy API alongside current frontend.

### Phase 1 — Real pharmacy engine (single branch works end-to-end)
Products/categories → batches + GRN purchasing → stock movements ledger →
POS rebuild (real transactions, shifts, receipts) → returns → customers basics →
core reports (sales, stock, expiry, valuation) → replace ALL mock data with live APIs.

### Phase 2 — Multi-branch + control
Transfers w/ approvals → stock counts → branch scoping everywhere + branch switcher →
expenses + finance reports → audit log UI → notification center → role policy toggles.

### Phase 3 — Platform/SaaS layer
Super admin portal (tenants, tenant detail, payments recording, license issuance/renewal,
suspend/reactivate, impersonate, cross-tenant dashboards, platform audit) →
license gating middleware + lock screens → trials → Telebirr manual flow polished.

### Phase 4 — Differentiators (post-launch)
PWA offline POS queue → SMS/Telegram alerts (Telebirr API automation) → loyalty v2 →
prescription v2 (interactions) → Amharic i18n → accounting export → insurance hooks.

Definition of "launch-ready": Phase 0–3 complete, one real pilot pharmacy running
daily operations on it for 2 weeks, backups proven restorable, license flow exercised.

---

## 12. Explicitly Deferred (parking lot)

Tax/VAT computation • Stripe/online payments • Telebirr API automation • Docker •
S3/object storage • multi-currency • self-service signup • custom domains per tenant •
drug-interaction DB • demand forecasting • supplier portal • insurance claims •
QuickBooks export • WhatsApp integration • native mobile apps.

---

*Last updated: 2026-08-25 — living document; update as decisions land.*
