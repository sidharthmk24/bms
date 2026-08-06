# PLAN.md — Bookstore Management System

The full build plan. `CLAUDE.md` holds the rules and architecture; this file holds the *what*.

---

## 1. System Overview

One bookstore brand → several branches → one central warehouse → occasional travelling exhibitions.

Four things move through the system:

1. **Books** — supplier → central pool → branch shelf → customer (or → exhibition → back).
2. **Money** — bills at the counter produce revenue; manually entered costs produce expenses; the two produce P&L.
3. **Requests** — a branch asks central for stock; a branch manager asks to run an exhibition; a customer asks for a book we don't stock.
4. **Records** — every stock change and every sensitive action is permanently logged.

---

## 2. NestJS Module Map

Each is a folder under `backend/src/` with `.module.ts`, `.controller.ts`, `.service.ts`, `entities/`, `dto/`.

| Module | Owns |
|---|---|
| `auth` | login, refresh, logout, password reset, JWT + Local strategies |
| `users` | user CRUD, role assignment, deactivation, reset triggering |
| `branches` | branch CRUD (one is the warehouse) |
| `catalog` | books, authors, publishers, categories, suppliers |
| `inventory` | central stock, branch inventory, adjustments, stock movements |
| `billing` | bills, bill items, void, receipts |
| `restock` | restock requests → review → dispatch → receive |
| `procurement` | purchase orders, receiving into the central pool |
| `exhibitions` | request → approve → dispatch → close with reconciliation |
| `enquiries` | book enquiries, demand summary, new title requests |
| `finance` | revenue, expenses, P&L, branch comparison, cash reconciliation, export |
| `dashboard` | one endpoint per role |
| `audit` | audit log read + the `AuditService` other modules call |
| `settings` | system settings key/value |
| `notifications` | the SSE stream + `triggerRefresh()` |

---

## 3. TypeORM Entities

All entities use **UUID primary keys**, `createdAt`, `updatedAt`. Money is `decimal(10,2)`.

### 3.1 Identity & Structure

**`Branch`** — `name`, `code` (unique, e.g. `BR-01`), `type` enum(`STORE`,`WAREHOUSE`), `address`, `city`, `phone`, `isActive`.
Exactly one row has `type = WAREHOUSE`; it is the central pool's home.

**`User`** — `name`, `email` (unique, login id), `passwordHash` (bcrypt cost 10), `roles` (many-to-many relationship with UserRole), `primaryRole` enum (the 7), `branchId` FK **nullable**, `isActive` (soft delete), `lastLoginAt`, `createdById` FK → User.

Service-layer constraint: `branchId` **must** be set for `BRANCH_MANAGER` / `BRANCH_INVENTORY` / `BRANCH_FRONT_OFFICE`; **must** be null for `SUPER_ADMIN` / `ADMIN` / `CENTRAL_INVENTORY_MANAGER`; **may** be either for `FINANCE`.

**`RefreshToken`** — `userId` FK, `tokenHash`, `expiresAt`, `revokedAt` nullable, `userAgent`.
**`PasswordResetToken`** — `userId` FK, `tokenHash`, `expiresAt`, `usedAt` nullable.

### 3.2 Catalog (shared, identical for every branch)

**`Author`** — `name`, `bio` nullable.
**`Publisher`** — `name`.
**`Category`** — `name`, `parentId` FK → Category nullable (sub-genres).
**`Supplier`** — `name`, `contactPerson`, `phone`, `email`, `address`.

**`Book`** — `title` (indexed), `isbn` (unique), `barcode` (unique, **indexed** — the billing lookup), `description` nullable, `price`, `costPrice` nullable, `coverImageUrl` nullable, `authorId`, `publisherId`, `categoryId` FKs, `isActive`.

`barcode` defaults to the ISBN when a book has no separate internal barcode.

### 3.3 Stock

**`CentralStock`** — `bookId` FK unique, `quantity`, `reorderThreshold` default 20.

**`BranchInventory`** — `branchId` FK, `bookId` FK, `quantity` default 0, `reorderThreshold` default 5.
`@Unique(['branchId','bookId'])` — also the primary lookup index.

**`StockMovement`** — append-only. Never updated, never deleted.
| Field | Notes |
|---|---|
| `bookId` FK | |
| `branchId` FK nullable | null = central-pool-only movement |
| `type` enum | `SALE`, `SALE_VOID`, `RESTOCK_IN`, `TRANSFER_OUT`, `TRANSFER_IN`, `EXHIBITION_OUT`, `EXHIBITION_RETURN`, `ADJUSTMENT` |
| `reason` enum nullable | `DAMAGED`, `LOST`, `SAMPLE`, `RETURNED_TO_SUPPLIER`, `CORRECTION` — only for `ADJUSTMENT` |
| `quantity` | **signed**: negative leaving, positive arriving |
| `referenceType` enum nullable | `BILL`, `RESTOCK_REQUEST`, `EXHIBITION`, `PURCHASE_ORDER`, `MANUAL` |
| `referenceId` uuid nullable | |
| `performedById` FK → User | |
| `note` nullable | |

Indexes: `(bookId, createdAt)`, `(branchId, createdAt)`, `(referenceType, referenceId)`.

### 3.4 Supply Chain

**`PurchaseOrder`** — `supplierId` FK, `orderNumber` unique, `status` enum(`DRAFT`,`PLACED`,`PARTIALLY_RECEIVED`,`RECEIVED`,`CANCELLED`), `expectedDate`, `placedById` FK, `totalCost`.
**`PurchaseOrderItem`** — `purchaseOrderId` FK, `bookId` FK, `quantityOrdered`, `quantityReceived` default 0, `unitCost`.

Receiving a PO increases `CentralStock.quantity` and writes `RESTOCK_IN` movements with `branchId = null`.

**`RestockRequest`** — `branchId` FK, `requestedById` FK, `status` enum(`PENDING`,`APPROVED`,`PARTIALLY_APPROVED`,`REJECTED`,`FULFILLED`,`RECEIVED`), `reviewedById` FK nullable, `reviewNote` nullable, `reviewedAt` nullable.
**`RestockRequestItem`** — `restockRequestId` FK, `bookId` FK, `quantityRequested`, `quantityApproved` default 0, `quantityReceived` default 0.

Lifecycle:
```
Branch creates request                    → PENDING
Central approves (full or partial)        → APPROVED / PARTIALLY_APPROVED
Central dispatches                        → FULFILLED  (CentralStock↓, TRANSFER_OUT)
Branch confirms actual quantity received  → RECEIVED   (BranchInventory↑, TRANSFER_IN)
```
The gap between `quantityApproved` and `quantityReceived` is the shipping discrepancy and must stay visible.

### 3.5 Selling

**`Bill`** — `billNumber` unique (`BR01-20260803-0007`), `branchId` FK, `exhibitionId` FK nullable, `createdById` FK, `subTotal`, `discount`, `totalAmount`, `paymentStatus` enum(`PAID`,`UNPAID`), `paymentMode` enum(`CASH`,`UPI`) nullable, `status` enum(`COMPLETED`,`VOIDED`), `voidedById`/`voidReason`/`voidedAt` nullable, `customerName`/`customerPhone` nullable. `createdAt` indexed.

**`BillItem`** — `billId` FK, `bookId` FK, `quantity`, `unitPrice` *(price captured at sale time — never join to `Book.price` for a historical bill)*, `lineTotal`.

### 3.6 Exhibitions

**`Exhibition`** — `name`, `location`, `sourceBranchId` FK, `startDate`, `endDate`, `status` enum(`REQUESTED`,`APPROVED`,`REJECTED`,`ONGOING`,`CLOSED`), `requestedById` FK, `approvedById` FK nullable.

**`ExhibitionStock`** — `exhibitionId` FK, `bookId` FK, `quantityTaken`, `quantitySold` default 0, `quantityReturned` default 0, `quantityDamaged` default 0, `quantityLost` default 0.

Reconciliation rule on close — the endpoint **rejects** anything that doesn't balance:
`quantityTaken = quantitySold + quantityReturned + quantityDamaged + quantityLost`

### 3.7 Demand

**`BookEnquiry`** — `bookId` FK nullable, `freeTextTitle` nullable, `branchId` FK, `loggedById` FK, `customerName`/`customerPhone` nullable, `status` enum(`OPEN`,`STOCK_REQUESTED`,`NEW_TITLE_REQUESTED`,`FULFILLED`,`CLOSED`).
Either `bookId` (in catalog, just out of stock) **or** `freeTextTitle` (not in catalog at all) must be present.

**`NewTitleRequest`** — `freeTextTitle`, `author` nullable, `isbn` nullable, `requestedById` FK, `enquiryCount`, `status` enum(`PENDING`,`APPROVED`,`REJECTED`), `reviewedById` FK nullable, `createdBookId` FK nullable.

### 3.8 Money

**`Expense`** — `branchId` FK **nullable** (null = chain-wide cost), `category` enum(`RENT`,`SALARY`,`UTILITIES`,`SUPPLIES`,`MAINTENANCE`,`MARKETING`,`OTHER`), `amount`, `description`, `expenseDate` date, `enteredById` FK.

**`ExpenseRevision`** — `expenseId` FK, `previousAmount`, `previousDescription`, `changedById` FK, `changedAt`. Written on every edit so the original is never lost.

**`CashReconciliation`** — `branchId` FK, `reconciliationDate` date, `systemCashTotal`, `countedCashTotal`, `variance`, `note`, `reconciledById` FK.

### 3.9 Oversight

**`AuditLog`** — `userId` FK, `action` (e.g. `BOOK_PRICE_UPDATED`), `entityType`, `entityId`, `beforeJson` json nullable, `afterJson` json nullable, `ipAddress`. Indexed on `(entityType, entityId)` and `createdAt`.

**`SystemSetting`** — `key` PK, `value` json, `updatedById` FK.
Seeded keys: `allowed_payment_modes`, `default_low_stock_threshold`, `currency_symbol`, `bill_number_prefix`.

---

## 4. API Surface (`/api/v1`)

Roles listed are the **only** roles permitted, via `@Roles()`. Branch-scoped roles are additionally restricted to their own `branchId` by `BranchScopeGuard`.

### Auth — `@Public()` except where noted
`POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/forgot-password` · `POST /auth/reset-password` · `GET /auth/me` *(authenticated)* · `PATCH /auth/change-password` *(authenticated, own only)*

### Notifications
`GET /notifications/sync` — `@Sse()`, authenticated. The refresh stream + 30s heartbeat.

### Users — `SUPER_ADMIN`, `ADMIN` (limited), `BRANCH_MANAGER` (own branch, lower roles only)
`GET /users` · `GET /users/:id` · `POST /users` · `PATCH /users/:id` · `PATCH /users/:id/deactivate` · `POST /users/:id/send-reset`

### Branches — `SUPER_ADMIN`, `ADMIN` (read + update)
`GET /branches` · `GET /branches/:id` · `POST /branches` · `PATCH /branches/:id`

### Catalog — write: `SUPER_ADMIN` only · read: all authenticated
`GET /books` *(search title/isbn/barcode, filter, paginate)* · `GET /books/barcode/:barcode` *(the billing lookup — must be fast, cached)* · `GET /books/:id` · `POST /books` · `PATCH /books/:id` · `DELETE /books/:id` *(soft)*
Same CRUD shape for `/authors`, `/publishers`, `/categories`, `/suppliers`.

### Central stock — `CENTRAL_INVENTORY_MANAGER`, `SUPER_ADMIN`, `ADMIN`
`GET /central-stock` · `GET /central-stock/low` · `PATCH /central-stock/:bookId/threshold`

### Purchase orders — `CENTRAL_INVENTORY_MANAGER`, `SUPER_ADMIN`
`GET /purchase-orders` · `POST /purchase-orders` · `GET /purchase-orders/:id` · `PATCH /purchase-orders/:id/place` · `POST /purchase-orders/:id/receive`

### Branch inventory — read: branch + chain roles · write: `BRANCH_INVENTORY`, `BRANCH_MANAGER`
`GET /branches/:branchId/inventory` · `GET /branches/:branchId/inventory/low` · `POST /branches/:branchId/inventory` *(add a catalog book with an opening quantity)* · `PATCH /branches/:branchId/inventory/:bookId/threshold` · `POST /branches/:branchId/inventory/:bookId/adjust` *(quantity + reason — **never** a SALE)*
`GET /stock-movements` *(filter by book, branch, type, date range)*

### Restock — create: `BRANCH_INVENTORY`, `BRANCH_MANAGER` · review/dispatch: `CENTRAL_INVENTORY_MANAGER`
`GET /restock-requests` *(scoped by role)* · `POST /restock-requests` · `GET /restock-requests/:id` · `PATCH /restock-requests/:id/review` *(approve full / partial / reject)* · `POST /restock-requests/:id/dispatch` · `POST /restock-requests/:id/receive`

### Billing — `BRANCH_FRONT_OFFICE` (+ `BRANCH_MANAGER` read)
`POST /bills` · `GET /bills` *(own branch, date range, status)* · `GET /bills/:id` · `POST /bills/:id/void` *(reason required)* · `GET /bills/:id/receipt`

### Exhibitions — request: `BRANCH_MANAGER` · approve: `SUPER_ADMIN`, `ADMIN` · stock ops: `BRANCH_INVENTORY`
`GET /exhibitions` · `POST /exhibitions` · `GET /exhibitions/:id` · `PATCH /exhibitions/:id/approve` · `PATCH /exhibitions/:id/reject` · `POST /exhibitions/:id/dispatch` · `POST /exhibitions/:id/close`

### Enquiries — log: `BRANCH_FRONT_OFFICE` · view: branch + chain roles
`GET /enquiries` · `POST /enquiries` · `PATCH /enquiries/:id/status` · `GET /enquiries/demand-summary` *(grouped by book across all branches — Central Inventory's key view)* · `GET /new-title-requests` · `POST /new-title-requests` · `PATCH /new-title-requests/:id/review`

### Finance — `FINANCE`, `SUPER_ADMIN`, `ADMIN`; `BRANCH_MANAGER` read-only for own branch
`GET /finance/revenue` *(auto from bills; groupBy day/month/branch/paymentMode)* · `GET /expenses` · `POST /expenses` · `PATCH /expenses/:id` *(writes a revision)* · `DELETE /expenses/:id` · `GET /finance/pnl` · `GET /finance/branch-comparison` · `POST /finance/cash-reconciliation` · `GET /finance/cash-reconciliation` · `GET /finance/export` *(CSV)*

### Dashboards — one per role, returning exactly what that dashboard renders
`GET /dashboard/super-admin` · `/admin` · `/central-inventory` · `/finance` · `/branch-manager` · `/branch-inventory` · `/branch-front-office`

### Audit & settings — `SUPER_ADMIN` (+ `BRANCH_MANAGER` sees own branch only)
`GET /audit-logs` · `GET /settings` · `PATCH /settings/:key`

---

## 5. Frontend Routes & Screens

```text
app/
├── (public)/
│   ├── login/
│   ├── forgot-password/
│   └── reset-password/
└── dashboard/
    ├── layout.tsx              # auth gate + sidebar + <RealTimeSync />
    ├── page.tsx                # role switch → renders one of 7 dashboards
    ├── billing/
    ├── inventory/
    ├── central-stock/
    ├── purchase-orders/
    ├── restock/
    ├── exhibitions/
    ├── enquiries/
    ├── catalog/
    ├── users/
    ├── branches/
    ├── finance/
    ├── audit/
    └── settings/
```

### The seven dashboards — all genuinely different

| Role | Shows |
|---|---|
| **Super Admin** | Chain revenue today/week/month · branch comparison bar chart · total stock value · pending approvals (exhibitions, new titles) · chain-wide low-stock count · recent audit entries |
| **Admin** | Same operational cards, minus settings and audit; emphasis on pending approvals and branch performance |
| **Central Inventory Manager** | Central pool value · books below central threshold · incoming restock queue · open purchase orders · chain-wide enquiry demand leaderboard · branch stock imbalance table |
| **Finance** | Revenue vs expenses chart (12 months) · net profit this month · cash vs UPI split · branch P&L table · unreconciled cash days · recent expenses |
| **Branch Manager** | Today's branch sales · bills by staff member · unpaid bills count · branch low-stock list · pending exhibition requests · branch P&L summary · recent local activity |
| **Branch Inventory** | Low-stock list (actionable) · restock requests + status · stock awaiting receipt confirmation · recent adjustments · exhibition stock currently out |
| **Branch Front Office** | Big "New Bill" action · today's sales total and bill count · cash vs UPI today · unpaid bills to follow up · recent bills · quick enquiry log button |

### Key screens
- **Billing** — tablet-first. Auto-focused scan input that clears after each scan; scanned book appends to the bill; editable quantity; running total; payment step (Paid/Unpaid → Cash/UPI); confirm; printable receipt. A barcode that isn't found offers to **log an enquiry** right there.
- **Inventory** — searchable table with stock badges (ok / low / out), adjust-with-reason modal, add-book-to-branch modal.
- **Restock** — two faces: branch users see their own requests + create; central users see the review queue with approve / partial / reject and dispatch.
- **Exhibitions** — list + detail with a reconciliation form that refuses to submit unless quantities balance.
- **Users** — role-filtered list, create form (role dropdown limited by the creator's own role), deactivate, send-reset.
- **Catalog** — books CRUD for Super Admin, read-only browse for everyone else.
- **Finance** — revenue view, expenses CRUD, P&L, branch comparison, cash reconciliation, CSV export.
- **Enquiries** — log form, list, demand summary for chain roles.
- **Audit** — filterable log table.
- **Settings** — Super Admin only.

---

## 6. Build Order

Each phase must run and be testable in Swagger before the next begins.

| Phase | Scope |
|---|---|
| **0** | Both projects scaffolded. `main.ts` with UTC, helmet, compression, cookie-parser, global `ValidationPipe`, `TransformInterceptor`, `AllExceptionsFilter`, CORS, Swagger at `/api-docs`. TypeORM connected to MySQL. Cache + Throttler registered. Health route. |
| **1** | All TypeORM entities + first migration + seed scripts |
| **2** | `auth` module: JWT + Local strategies, login/refresh/logout/reset, `JwtAuthGuard`, `RolesGuard`, `BranchScopeGuard`, `@CurrentUser`, `@Roles`, `@Public` |
| **3** | `notifications` module: SSE stream + heartbeat + `triggerRefresh()` |
| **4** | `users` + `branches` with the role-creation rules enforced |
| **5** | `catalog`: books, authors, publishers, categories, suppliers (+ Redis caching on reads) |
| **6** | `inventory` foundation: central stock, branch inventory, adjustments, the atomic stock helper, `StockMovement` writer |
| **7** | `billing`: create bill (transactional), list, void, receipt |
| **8** | `restock`: request → review → dispatch → receive |
| **9** | `procurement`: purchase orders + receiving into central pool |
| **10** | `exhibitions`: request → approve → dispatch → close with reconciliation |
| **11** | `enquiries` + new title requests + demand summary |
| **12** | `finance`: revenue, expenses, P&L, comparison, reconciliation, CSV export |
| **13** | `dashboard` (all 7 endpoints) + `audit` + `settings` |
| **14** | Frontend shell: Next.js App Router, `lib/api.ts` (cache + mutation broadcast + 401 redirect), `AuthContext`, login, `dashboard/layout.tsx` with sidebar, `RealTimeSync` |
| **15** | Frontend: all 7 dashboards + domain hooks wired to `app:data-mutated` |
| **16** | Frontend: billing screen (tablet-optimised) |
| **17** | Frontend: inventory, central stock, restock, purchase orders, exhibitions, enquiries |
| **18** | Frontend: users, branches, catalog, finance, audit, settings |
| **19** | Polish: loading / empty / error states everywhere, framer-motion transitions, responsive pass, README |

---

## 7. Definition of Done

A phase is done when:
1. Every endpoint appears in Swagger with accurate DTO schemas and role annotations.
2. Every mutating endpoint validates with `class-validator` and returns the standard envelope.
3. Every stock-touching operation is inside a transaction and writes a `StockMovement` row.
4. Every meaningful write calls `notificationService.triggerRefresh()`.
5. Role and branch restrictions are enforced server-side and verified by logging in as a role that should be blocked.
6. Seed data exercises the feature — there is something real to look at, not an empty table.
7. On the frontend: loading, empty, and error states all exist and were actually seen; the list refreshes itself when another session mutates the same data.