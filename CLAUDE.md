# CLAUDE.md — Bookstore Management System (BMS)

Persistent project context. Read before making any change. If a request conflicts with this file, say so and ask.

This project follows the **Megamind ERP architecture**: modular NestJS backend + Next.js App Router frontend, with Server-Sent Events for real-time data synchronisation.

---

## 1. What This Project Is

A multi-branch **Bookstore Management System**. One brand, several branches, one central warehouse, and travelling exhibitions.

**Staff-facing only.** No customer login, no public storefront, no online ordering, no payment gateway. Every user is an employee with an assigned role. Payment is *recorded* manually at the counter (Paid/Unpaid, Cash/UPI) — never processed.

**Core truth:** every branch reads and writes one shared database, so stock, sales, and money stay consistent across locations. When one branch changes stock, every other open screen learns about it immediately via SSE.

---

## 2. Repository Layout

```text
bms/
├── backend/            # NestJS application
├── frontend/           # Next.js 15 App Router application
├── package.json        # workspace references
└── README.md
```

Two independent projects. They communicate only over HTTP + SSE. Never import across the boundary.

---

## 3. Technology Stack (fixed — do not substitute)

### Backend
| Concern | Choice |
|---|---|
| Framework | **NestJS** (TypeScript) |
| ORM | **TypeORM** |
| Database | **MySQL 8** (driver: `mysql2`) |
| Caching | Redis via `cache-manager-redis-yet`, with in-memory fallback for local dev |
| Validation | `class-validator` + `class-transformer` on every DTO |
| Auth | Passport (JWT + Local strategies), `bcrypt` |
| Real-time | NestJS SSE endpoint backed by an RxJS `Subject` |
| Rate limiting | `@nestjs/throttler` |
| Security | `helmet`, `compression`, `cookie-parser` |
| API docs | Swagger OpenAPI UI at `/api-docs` |

### Frontend
| Concern | Choice |
|---|---|
| Framework | **Next.js 15+ App Router**, React 19 |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`) |
| HTTP | Axios — single centralised instance in `src/lib/api.ts` |
| State | React Context (`AuthContext`, `BillingContext`) |
| Data fetching | Custom hooks per domain (`useInventory`, `useBills`, …) |
| Forms | `react-hook-form` + `zod` resolvers |
| Animation | `framer-motion` |
| Icons | `lucide-react` |
| Charts | `recharts` |

**Explicitly NOT used:** Prisma, Express, Vite, Supabase, Firebase, Redux, TanStack Query, Zustand, MUI, payment gateways, courier APIs, WebSockets (SSE instead).

---

## 4. The Seven Roles

Every user can have one or multiple `roles` and a `branchId` that is **NULL for chain-wide roles**.
A single user can hold multiple roles at once and gets the combined access of all of them.

| Role enum | Scope | Job |
|---|---|---|
| `SUPER_ADMIN` | Chain | Owns the system — settings, catalog, all users, all branches. |
| `ADMIN` | Chain | Operations deputy. Super Admin's day-to-day powers minus system settings, user deletion, and catalog price changes. |
| `CENTRAL_INVENTORY_MANAGER` | Chain | Central stock pool, supplier purchase orders, distribution to branches. |
| `FINANCE` | Chain **or** Branch | Revenue (read-only, automatic), expense entry, P&L. `branchId` NULL = chain-wide. |
| `BRANCH_MANAGER` | One branch | Runs one branch: staff, oversight, exhibition requests. |
| `BRANCH_INVENTORY` | One branch | Keeps that branch's shelf count accurate. Cannot bill. |
| `BRANCH_FRONT_OFFICE` | One branch | Bills customers at the counter. Cannot edit stock directly. |

### Hard permission rules — never violate
1. Only `SUPER_ADMIN` creates or deletes users. `ADMIN` and `BRANCH_MANAGER` create only roles below themselves, never a `SUPER_ADMIN`.
2. **Nobody sets another user's password.** Admins trigger a reset link; the user sets their own.
3. `BRANCH_FRONT_OFFICE` never writes to `branch_inventory` directly — stock moves for them only as a side effect of completing or voiding a bill.
4. `BRANCH_INVENTORY` never creates a `SALE` movement. Sales come only from billing.
5. Only `SUPER_ADMIN` edits the master `books` catalog (title / price / ISBN).
6. Branch-scoped roles touch only rows where `branchId` = their own — enforced by `BranchScopeGuard` reading the JWT, **never** trusted from the client.
7. `FINANCE` is read-only on revenue, write-only on expenses. Never stock, bills, or catalog.

Enforcement pattern (mirrors the ERP's `RolesGuard` / `DepartmentGuard`): `@Roles(...)` decorator + `RolesGuard`, then `BranchScopeGuard` on every branch-scoped route.

---

## 5. Backend Architecture Rules

### Module structure — domain-driven, one folder per feature
```text
backend/src/
├── main.ts                     # UTC timezone init, helmet, compression, cookie-parser,
│                               # global ValidationPipe, CORS, Swagger at /api-docs
├── app.module.ts               # module registry, TypeORM config, Cache + Throttler registration
├── common/
│   ├── decorators/             # @CurrentUser, @Roles, @BranchScope, @Public
│   ├── guards/                 # JwtAuthGuard, RolesGuard, BranchScopeGuard
│   ├── filters/                # AllExceptionsFilter — uniform error JSON
│   ├── interceptors/           # TransformInterceptor — uniform success wrapper
│   └── helpers/                # stock.helper.ts, billNumber.helper.ts
├── database/
│   ├── data-source.ts          # TypeORM DataSource for CLI migrations
│   ├── migrations/
│   └── seeds/
├── notifications/              # SSE stream + refresh dispatcher
└── [feature]/                  # books, branches, users, inventory, billing, restock,
    ├── [feature].module.ts     # exhibitions, enquiries, finance, dashboard, audit, settings
    ├── [feature].controller.ts # routes, guards, validation pipes — THIN
    ├── [feature].service.ts    # repository injection + all business logic
    ├── entities/               # TypeORM entities, UUID primary keys
    └── dto/                    # class-validator decorated DTOs
```

Controllers stay thin. All logic lives in services. Prefer many small files.

### Entity conventions
- **UUID primary keys** (`@PrimaryGeneratedColumn('uuid')`) on every table.
- Every entity has `createdAt` / `updatedAt` (`@CreateDateColumn` / `@UpdateDateColumn`).
- Money is `decimal(10,2)` with a numeric transformer. **Never float.**
- Users are **soft-deleted** (`isActive: false`). Never hard-delete — their bills must survive.
- Real foreign keys with explicit `onDelete`. Default `RESTRICT` for anything financial or historical.
- Server runs in **UTC**, set in `main.ts` before bootstrap, exactly as the ERP does.

### The two rules that matter most

**A. Stock changes are atomic.** Never load a quantity into JS and write it back. Always a conditional single statement inside a `queryRunner` transaction:
```typescript
const result = await queryRunner.manager.query(
  `UPDATE branch_inventory SET quantity = quantity - ?
   WHERE branchId = ? AND bookId = ? AND quantity >= ?`,
  [qty, branchId, bookId, qty],
);
if (result.affectedRows === 0) throw new ConflictException('INSUFFICIENT_STOCK');
```
One shared helper (`common/helpers/stock.helper.ts`) does this everywhere stock moves.

**B. Every stock change writes a `stock_movements` row in the same transaction.** `branch_inventory.quantity` is the running total; `stock_movements` is the permanent append-only diary. Stock changed with no movement row = bug.

Movement types: `SALE`, `SALE_VOID`, `RESTOCK_IN`, `TRANSFER_OUT`, `TRANSFER_IN`, `EXHIBITION_OUT`, `EXHIBITION_RETURN`, `ADJUSTMENT`.
Adjustment reasons: `DAMAGED`, `LOST`, `SAMPLE`, `RETURNED_TO_SUPPLIER`, `CORRECTION`.

### Response format — enforced globally
`TransformInterceptor` wraps every success; `AllExceptionsFilter` wraps every error.
```jsonc
{ "success": true,  "data": {}, "message": "..." }
{ "success": false, "error": { "code": "INSUFFICIENT_STOCK", "message": "..." } }
```
Status codes: 200, 201, 400 (validation), 401, 403, 404, 409 (conflict / insufficient stock), 500.

### Caching
Redis (in-memory fallback locally) for read-heavy, slow-changing data: the book catalog, categories/authors/publishers, and system settings. **Never cache stock counts, bills, or dashboard figures** — those must always be live. Bust catalog cache on any catalog write.

### Swagger
Every endpoint documented with `@ApiOperation`, `@ApiResponse`, DTO schemas, **and the roles permitted to call it**. Live at `/api-docs`.

---

## 6. Real-Time Sync (SSE) — mirrors the ERP exactly

Chosen over WebSockets: one-way, lightweight, survives load balancers.

**1. Server stream** — `notifications/notification.service.ts` holds an RxJS `Subject`, merged with a 30-second heartbeat so proxies don't drop the connection:
```typescript
getRefreshStream(): Observable<{ data: string; type: string }> {
  return merge(
    this.refreshStream.asObservable(),
    interval(30000).pipe(map(() => ({ data: 'heartbeat', type: 'ping' }))),
  );
}
```
Exposed at `GET /api/v1/notifications/sync` via `@Sse()`.

**2. Services trigger it** after any meaningful write:
```typescript
this.notificationService.triggerRefresh('stock_changed');
```
Mandatory after: bill created/voided, stock adjusted, restock dispatched/received, exhibition dispatched/closed, purchase order received, enquiry logged, expense created/edited, user created/deactivated.

**3. Client listener** — headless `components/shared/RealTimeSync.tsx` opens an `EventSource` on the sync route and calls `broadcastMutation()`, dispatching the window event `app:data-mutated`.

**4. Hooks react** — every list hook subscribes:
```typescript
useEffect(() => {
  const handleRefresh = () => fetchInventory(page);
  window.addEventListener('app:data-mutated', handleRefresh);
  return () => window.removeEventListener('app:data-mutated', handleRefresh);
}, [fetchInventory, page]);
```

Net effect: front office sells the last copy, and the inventory manager's screen in the back room updates itself without a refresh.

---

## 7. Frontend Architecture Rules

```text
frontend/src/
├── app/
│   ├── (public)/               # login, forgot-password, reset-password
│   ├── dashboard/
│   │   ├── layout.tsx          # auth guard, sidebar, RealTimeSync mount
│   │   └── [pages]/            # billing, inventory, restock, exhibitions,
│   │                           # enquiries, users, catalog, finance, audit, settings
│   ├── globals.css             # Tailwind v4 imports + CSS variables
│   └── layout.tsx              # root html/body/fonts
├── components/
│   ├── shared/                 # Sidebar, PageHeader, RealTimeSync, DataTable, StatCard
│   └── [feature]/              # feature-specific modals and panels
├── context/                    # AuthContext, BillingContext
├── hooks/                      # useInventory, useBills, useRestock, useDashboard, …
├── lib/api.ts                  # centralised Axios client + cache + mutation broadcast
├── schemas/                    # Zod schemas
└── types/                      # TypeScript definitions for API responses
```

### Centralised Axios client (`lib/api.ts`) — same behaviours as the ERP
1. Base URL from `NEXT_PUBLIC_API_URL` with a local fallback.
2. Request interceptor injects `Authorization: Bearer <token>`.
3. **GET deduplication with a 1-second TTL** via a `Map` cache — identical concurrent GETs return the cached instance instead of hitting the server again.
4. **Self-cleaning mutations** — on any successful POST/PUT/PATCH/DELETE, wipe the GET cache and dispatch the window-wide `app:data-mutated` event.
5. **401 handling** — clear stored session state, redirect to `/login`.

### Routing & guards
- `dashboard/layout.tsx` is the single auth gate — unauthenticated users are redirected to `/login`. It also mounts `<RealTimeSync />` and the sidebar.
- After login, land on `/dashboard`, which renders **a different component per role**. Seven roles = seven genuinely distinct dashboards, not one dashboard with hidden sections.
- The sidebar is generated from the logged-in role. **A user must never see a nav item they cannot use.**
- Unauthorised route access renders a proper 403 page, never a blank screen.

### UI rules
- Every list view has a loading skeleton, an empty state, and an error state. No silent blank tables.
- `framer-motion` for page and modal transitions.
- The **billing screen is tablet-first** (barcode scanner): always-focused scan input, large tap targets, keyboard-first flow, minimal clicks.
- `localStorage` holds tokens and nothing else.

---

## 8. Seeding

`backend/src/database/seeds/` must produce an immediately demoable system:
- 1 warehouse + 3 branches
- ≥9 users covering all 7 roles, every password `Password@123`
- ~60 books, ~8 categories, authors, publishers, suppliers
- Central pool + per-branch stock, **some deliberately below threshold** so low-stock alerts fire
- ~40 bills over the last 30 days, mixed CASH/UPI/UNPAID, a couple voided
- 2 restock requests (one pending, one fulfilled)
- 1 closed exhibition (with returns and 2 missing copies) + 1 ongoing
- ~10 book enquiries, some repeated across branches
- ~20 expenses across categories over 2 months

`npm run seed` after `npm run db:reset` always yields the same demo state. Print every seeded login to the console when finished.

---

## 9. Working Style

- Build in the order in `PLAN.md` §6. Do not start a later phase while an earlier one is incomplete.
- A phase is done when it is **runnable and testable in Swagger**.
- Never invent a feature that isn't in `PLAN.md`. If something looks missing or ambiguous, ask first.
- Comments explain *why*, not *what*.