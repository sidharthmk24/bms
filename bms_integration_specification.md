# 📘 Technical Integration & API Specification: Book Management System (BMS) & Kairali Website

This document provides a comprehensive specification of all backend and frontend API endpoints created and updated in the Book Management System (BMS) and Kairali PMS based on the recent system requirements.

---

## 1. Procurement & Purchase Orders (PO) APIs
- `GET /api/v1/procurement`
  - **Description**: List purchase orders with status filtering (`DRAFT`, `PLACED`, `DISPATCHED`, `RECEIVED`, `CANCELLED`), supplier filter, date range, and backend pagination query.
- `POST /api/v1/procurement`
  - **Description**: Create a new Purchase Order with multiple book line items (supports 3 action buttons: `Cancel`, `Save Draft`, `Place Order`).
- `GET /api/v1/procurement/[id]`
  - **Description**: Retrieve full details of a specific Purchase Order.
- `PUT /api/v1/procurement/[id]` / `PATCH /api/v1/procurement/[id]`
  - **Description**: Update/Edit Purchase Order before dispatching.
- `DELETE /api/v1/procurement/[id]`
  - **Description**: Delete/Cancel Purchase Order prior to dispatch.
- `POST /api/v1/procurement/[id]/receive`
  - **Description**: Receive Purchase Order stock into Central Inventory.
- `GET /api/v1/procurement/[id]/pdf`
  - **Description**: Generate and download formatted Purchase Order PDF document.
- `GET /api/v1/procurement/pms-titles`
  - **Description**: Fetch titles from PMS ready for print order / procurement integration.
- `GET /api/v1/procurement/requests` & `POST /api/v1/procurement/requests`
  - **Description**: Manage procurement requests across branches.
- `PATCH /api/v1/procurement/requests/[id]/review`
  - **Description**: Approve/reject branch procurement requests.

---

## 2. Restock Requests & Partial Fulfillment APIs
- `GET /api/v1/restock`
  - **Description**: List restock requests with status filters and backend pagination (`limit`, `page`).
- `POST /api/v1/restock`
  - **Description**: Create a restock request supporting multi-book selection from exhibition/catalog modal.
- `GET /api/v1/restock/[id]`
  - **Description**: Get restock request details with itemized requested vs fulfilled quantities.
- `PATCH /api/v1/restock/[id]/review`
  - **Description**: Review and accept restock requests (supports partial acceptance flag).
- `POST /api/v1/restock/[id]/dispatch`
  - **Description**: Partially or fully dispatch restock items from Central Inventory to Branch.
- `POST /api/v1/restock/[id]/receive`
  - **Description**: Partially or fully receive restock items at Branch Inventory modal.

---

## 3. Stock Transfers & Inter-Branch Stock Movement APIs
- `GET /api/v1/transfers`
  - **Description**: List stock transfer requests with status and pagination parameters.
- `POST /api/v1/transfers`
  - **Description**: Initiate stock transfer request between branches or central warehouse.
- `GET /api/v1/transfers/[id]`
  - **Description**: Retrieve transfer details and stock line items.
- `POST /api/v1/transfers/[id]/dispatch`
  - **Description**: Dispatch transfer shipment.
- `POST /api/v1/transfers/[id]/receive`
  - **Description**: Receive transfer shipment at destination branch.
- `POST /api/v1/transfers/[id]/reject`
  - **Description**: Reject transfer request with rejection reason.
- `POST /api/v1/transfers/[id]/cancel`
  - **Description**: Cancel transfer request before dispatch.
- `POST /api/v1/transfers/[id]/split`
  - **Description**: Split partial transfer shipments into separate dispatches.
- `GET /api/v1/transfers/stock`
  - **Description**: Query available source stock for transfer verification.
- `GET /api/v1/transfers/stock-by-book`
  - **Description**: Query stock availability across all branches for a given title.

---

## 4. Exhibition & Event Management APIs
- `GET /api/v1/exhibitions`
  - **Description**: List all active, upcoming, and completed exhibitions.
- `POST /api/v1/exhibitions`
  - **Description**: Create a new exhibition event with multi-book selection support.
- `GET /api/v1/exhibitions/[id]`
  - **Description**: Get exhibition details, allocated inventory, and live performance metrics.
- `PATCH /api/v1/exhibitions/[id]`
  - **Description**: Update exhibition parameters and schedule.
- `DELETE /api/v1/exhibitions/[id]`
  - **Description**: Cancel or remove exhibition event.
- `GET /api/v1/exhibitions/compare`
  - **Description**: Compare performance, revenue, and copy sales across multiple exhibitions.
- `GET /api/v1/exhibitions/[id]/books`
  - **Description**: Retrieve list of books allocated to stall with live inventory balance.
- `POST /api/v1/exhibitions/[id]/books`
  - **Description**: Add/update multi-book allocations for an exhibition stall.
- `GET /api/v1/exhibitions/[id]/sales` & `POST /api/v1/exhibitions/[id]/sales`
  - **Description**: Log and view sales transactions conducted directly at exhibition stalls.

---

## 5. Billing, Sales & EOD Analytics APIs
- `GET /api/v1/billing`
  - **Description**: Search and filter bills/invoices by status, date range, payment method, branch, with server-side pagination.
- `POST /api/v1/billing`
  - **Description**: Create new POS sale transaction invoice.
- `GET /api/v1/billing/[id]`
  - **Description**: Get invoice details and printable bill content.
- `GET /api/v1/billing/eod`
  - **Description**: Fetch End of Day (EOD) sales aggregate summary, total revenue, breakdown by payment method.
- `GET /api/v1/billing/eod/graph`
  - **Description**: Fetch sales graph time-series data for the EOD Sales tab on the dashboard.

---

## 6. Dashboard & Role-Specific Information APIs
- `GET /api/v1/dashboard/central-inventory`
  - **Description**: Enhanced Central Inventory Manager Dashboard API showing overall stock valuation, branch alerts, pending dispatches, and restock requests.
- `GET /api/v1/dashboard/branch-office`
  - **Description**: Enhanced Branch Front Office Dashboard API with daily transaction summary, top-selling titles, and active bills.
- `GET /api/v1/dashboard/branch-inventory`
  - **Description**: Enhanced Branch Inventory Dashboard API detailing local stock alerts, incoming restock shipments, and inventory movements.
- `GET /api/v1/branches/[id]/dashboard`
  - **Description**: Super Admin API to view complete dashboard analytics and inventory state of any specific branch.
- `GET /api/v1/branches/[id]` & `PATCH /api/v1/branches/[id]`
  - **Description**: View and update detailed branch metadata.

---

## 7. Inventory Audit & Central Stock Management APIs
- `GET /api/v1/inventory/central-stock`
  - **Description**: Central Inventory Manager view giving full access to central stock and all branch inventory levels.
- `GET /api/v1/inventory/central-stock/low`
  - **Description**: Central low stock threshold alerts.
- `PATCH /api/v1/inventory/central-stock/[bookId]/threshold`
  - **Description**: Update reorder stock threshold for any catalog item.
- `POST /api/v1/inventory/central-stock/[bookId]/notify-manager`
  - **Description**: Trigger low stock alert notification to inventory manager.
- `POST /api/v1/inventory/central-stock/add-book`
  - **Description**: Add new book title to central warehouse inventory.
- `GET /api/v1/inventory/branches/[branchId]/inventory/low`
  - **Description**: Get branch-specific low stock alert list.
- `POST /api/v1/inventory/branches/[branchId]/inventory/[bookId]/adjust`
  - **Description**: Audit adjustment of branch stock quantity.
- `GET /api/v1/inventory/stock-movements`
  - **Description**: Comprehensive audit log of all stock movements across central warehouse and branches.

---

## 8. Kairali PMS Integration APIs
- `GET /api/v1/pms/titles`
  - **Description**: List PMS titles available for cataloging or print order planning.
- `GET /api/v1/pms/upcoming-releases`
  - **Description**: Query titles in late-stage production (`final_proof`, `printing`, `post_production`) or print jobs due within the next 30 days.
- `POST /api/v1/pms/manuscripts/assign`
  - **Description**: Automatic round-robin assignment of submitted manuscripts across available editors, with manual override option for super admin/owner.
- `GET /api/v1/pms/author/dashboard`
  - **Description**: Author dashboard endpoints supporting dropdown toggles between Live Production Flow and My Submitted Manuscripts.
- `GET /api/v1/pms/author/contracts`
  - **Description**: Author contracts endpoint listing active publishing contracts for the logged-in author.

---

## 9. Common Server-Side Pagination Query Standard
All major listing APIs (`/api/v1/billing`, `/api/v1/procurement`, `/api/v1/restock`, `/api/v1/transfers`, `/api/v1/exhibitions`, `/api/v1/catalog/books`) now support standard server-side pagination parameters:
- `page`: Page index (1-based, default: `1`)
- `limit`: Number of items per page (default: `20`)
- `search`: Global search term
- `sort`: Field name to sort by
- `order`: `ASC` | `DESC`

**Response Structure**:
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8
  }
}
```
