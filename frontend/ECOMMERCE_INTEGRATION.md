# BMS ↔ Kairali Website — API Integration Reference

**Version:** 1.0 | **Date:** September 2026 | **Base URL:** `https://bms.kairalibooks.com/api/v1`

---

## Authentication

All ecommerce endpoints use a **shared API key** — no JWT required.

```
x-api-key: kairali_bms_ecom_k3y_9a2f7c4b1d8e5g6h
```

> Change this value in BMS `.env.local` → `ECOMMERCE_API_KEY` and share only with the website backend. **Never expose it to the browser.**

---

## Setup Checklist (one-time, before first call)

| Step | What to do |
|------|-----------|
| 1 | Create an **"Online Store"** branch in BMS (Dashboard → Branches → Add Branch, type = STORE, code = `ONLINE`) |
| 2 | Copy the branch UUID and paste it into `.env.local` → `ECOMMERCE_BRANCH_ID` |
| 3 | Create a **system user** in BMS with role `CASHIER` named "Online Store System" and set its UUID as `ECOMMERCE_SYSTEM_USER_ID` in `.env.local` |
| 4 | Share the `ECOMMERCE_API_KEY` with the website dev team |
| 5 | Share the `ECOMMERCE_WEBHOOK_SECRET` with the website dev team (used to verify BMS → website webhooks) |

---

## API 1 — Catalog Sync

**Full sync (scheduled daily):**

```
GET /api/v1/ecommerce/catalog?page=1&limit=100
```

**Incremental sync (every 15 min, only changed books):**

```
GET /api/v1/ecommerce/catalog?updated_since=2026-09-24T00:00:00Z
```

### Response

```json
{
  "success": true,
  "data": {
    "total": 1420,
    "page": 1,
    "limit": 100,
    "books": [
      {
        "bms_id": "550e8400-e29b-41d4-a716-446655440000",
        "isbn13": "9788126412345",
        "title": "Kesavante Vilapangal",
        "author_name": "M. Mukundan",
        "author_id": "...",
        "category": "Novel",
        "language": "Malayalam",
        "mrp": 349.00,
        "sale_price": 349.00,
        "stock_quantity": 45,
        "is_active": true,
        "description": "...",
        "cover_image_url": "https://...",
        "publisher_name": "Kairali Books",
        "updated_at": "2026-09-24T06:30:00Z"
      }
    ]
  }
}
```

> **Primary key for the website:** `isbn13`. Use `bms_id` only for the order payload.

---

## API 2 — Live Inventory Check (Pre-Checkout)

```
POST /api/v1/ecommerce/inventory/check
Content-Type: application/json
x-api-key: <key>
```

```json
{
  "isbns": ["9788126412345", "9788126498765"]
}
```

### Response

```json
{
  "success": true,
  "data": {
    "inventory": [
      { "isbn13": "9788126412345", "bms_id": "...", "stock_quantity": 45, "sale_price": 349.00, "found": true },
      { "isbn13": "9788126498765", "bms_id": "...", "stock_quantity": 0, "sale_price": 200.00, "found": true }
    ]
  }
}
```

- If `stock_quantity = 0` → block checkout for that item
- If `found = false` → ISBN doesn't exist in BMS; block checkout

---

## API 3 — Push Paid Order to BMS

Called **immediately after PayU confirms payment**.

```
POST /api/v1/ecommerce/orders
Content-Type: application/json
x-api-key: <key>
```

```json
{
  "web_order_id": "KB-2026-10492",
  "order_timestamp": "2026-09-24T12:00:00Z",
  "payment": {
    "gateway": "PayU",
    "gateway_transaction_id": "TXN_987654321",
    "status": "PAID",
    "amount_paid": 628.00
  },
  "customer": {
    "name": "Arun Kumar",
    "email": "arun@example.com",
    "phone": "+919876543210"
  },
  "shipping_address": {
    "recipient_name": "Arun Kumar",
    "phone": "+919876543210",
    "address_line1": "Flat 4B, Greenfield Apartments",
    "address_line2": "Civil Station Road",
    "city": "Kannur",
    "state": "Kerala",
    "pincode": "670002",
    "country": "India"
  },
  "items": [
    {
      "isbn13": "9788126412345",
      "title": "Kesavante Vilapangal",
      "quantity": 2,
      "unit_price": 314.00
    }
  ],
  "financials": {
    "items_subtotal": 628.00,
    "shipping_charge": 0.00,
    "discount_applied": 0.00,
    "grand_total": 628.00
  }
}
```

### Success Response (HTTP 201)

```json
{
  "success": true,
  "data": {
    "success": true,
    "bms_order_id": "uuid-of-the-bill",
    "invoice_number": "ONLINE-20260924-0001",
    "message": "Order accepted for processing"
  }
}
```

**Store `bms_order_id` in the website's orders table — you'll need it for the dispatch webhook.**

### Error Responses

| HTTP | Scenario |
|------|----------|
| 400 | Missing fields, invalid JSON |
| 404 | ISBN not found in BMS catalog |
| 409 | Duplicate `web_order_id` (order already recorded) |
| 400 | Insufficient stock (race condition at checkout) |

---

## API 4 — Get Online Order Dispatch Queue (BMS internal)

Used by BMS warehouse staff to see pending orders to pack and ship.

```
GET /api/v1/ecommerce/orders?status=pending&page=1&limit=20
```

`status` options: `pending` (default), `dispatched`, `all`

Returns the list of orders with items and dispatch info.

---

## Webhook — BMS Notifies Website on Dispatch

When warehouse staff click **Mark as Dispatched** in BMS, this webhook fires **automatically**.

```
POST /api/v1/ecommerce/orders/{bms_order_id}/dispatch
Content-Type: application/json
x-api-key: <key>
```

```json
{
  "courier_name": "India Post / Speed Post",
  "tracking_number": "EK987654321IN",
  "tracking_url": "https://www.indiapost.gov.in/..."
}
```

BMS will then call the **website webhook**:

```
POST https://kairalibooks.com/api/integrations/bms/order-status
x-bms-secret: kairali_webhook_secret_x7m2p9n4q1r8s5t
```

```json
{
  "web_order_id": "KB-2026-10492",
  "bms_order_id": "...",
  "invoice_number": "ONLINE-20260924-0001",
  "status": "SHIPPED",
  "courier_name": "India Post / Speed Post",
  "tracking_number": "EK987654321IN",
  "tracking_url": "https://...",
  "dispatched_at": "2026-09-25T14:30:00Z"
}
```

The website must verify `x-bms-secret` header matches `ECOMMERCE_WEBHOOK_SECRET` before processing.

---

## Error Response Format (all APIs)

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Books not found in BMS for ISBNs: 9788126499999",
  "error": "NotFound"
}
```

---

## Summary Table

| # | Method | Endpoint | Called by | Purpose |
|---|--------|----------|-----------|---------|
| 1 | GET | `/api/v1/ecommerce/catalog` | Website (scheduled) | Sync book catalog + stock |
| 2 | POST | `/api/v1/ecommerce/inventory/check` | Website (at checkout) | Real-time stock verification |
| 3 | POST | `/api/v1/ecommerce/orders` | Website (after payment) | Push paid order to BMS |
| 4 | GET | `/api/v1/ecommerce/orders` | BMS UI | View dispatch queue |
| 5 | POST | `/api/v1/ecommerce/orders/{id}/dispatch` | BMS UI / warehouse staff | Mark shipped + notify website |
