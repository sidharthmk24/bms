# 🌐 Kairali E-Commerce & Book Management System (BMS) Integration Specification

This technical document outlines all APIs, payloads, authentication methods, and webhooks required for the **External E-Commerce Website Developer** to integrate the online store with the **Kairali Book Management System (BMS)**.

---

## 📌 1. Authentication & Base URL

- **Base URL**: `https://<bms-domain>/api/v1/ecommerce`
- **Authentication**: All API requests from the e-commerce website to BMS must include the `x-api-key` HTTP header.
  ```http
  x-api-key: YOUR_ECOMMERCE_API_KEY
  Content-Type: application/json
  ```
*(Note: Provide the developer with the configured `ECOMMERCE_API_KEY` string.)*

---

## 📚 2. Catalog & Book Sync API

Used by the e-commerce website to fetch published books, pricing, stock levels, Malayalam title/author details, categories, and cover images. Supports both **Initial Full Sync** and **Incremental Real-time Sync**.

### Endpoint
`GET /api/v1/ecommerce/catalog`

### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | Integer | No | `1` | Page index |
| `limit` | Integer | No | `100` | Max items per request (Max: 500) |
| `updated_since` | ISO 8601 String | No | - | e.g. `2026-09-24T00:00:00Z`. Returns only books updated since timestamp (Incremental Sync) |

### Sample Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "total": 450,
    "page": 1,
    "limit": 100,
    "books": [
      {
        "bms_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "isbn13": "9788126412345",
        "title": "ആടുജീവിതം (Aadujeevitham)",
        "author_name": "Benyamin",
        "author_id": "auth-123",
        "category": "Fiction / Novel",
        "language": "Malayalam",
        "mrp": 350.00,
        "sale_price": 315.00,
        "stock_quantity": 85,
        "is_active": true,
        "description": "Full book synopsis...",
        "cover_image_url": "https://cdn.kairali.in/covers/9788126412345.jpg",
        "publisher_name": "Kairali Books",
        "updated_at": "2026-09-28T14:30:00.000Z"
      }
    ]
  }
}
```

---

## 🔍 3. Live Inventory & Price Check API

Called by the website during checkout **right before payment gateway redirect** to verify real-time central warehouse stock availability and avoid overselling items that sold out since the last catalog sync.

### Endpoint
`POST /api/v1/ecommerce/inventory/check`

### Request Body
```json
{
  "isbns": [
    "9788126412345",
    "9788126498765"
  ]
}
```

### Sample Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "isbn13": "9788126412345",
        "bms_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "stock_quantity": 45,
        "sale_price": 315.00,
        "found": true
      },
      {
        "isbn13": "9788126498765",
        "bms_id": null,
        "stock_quantity": 0,
        "sale_price": null,
        "found": false
      }
    ]
  }
}
```

---

## 🛍️ 4. Order Sync & Central Stock Deduction API

Called by the e-commerce website immediately after a customer completes payment (e.g., via PayU / Razorpay / UPI). This creates an online bill in BMS, deducts inventory from Central Warehouse, and queues the order for dispatch.

### Endpoint
`POST /api/v1/ecommerce/orders`

### Request Body (`EcomOrderPayload`)
```json
{
  "web_order_id": "KB-ONLINE-88492",
  "order_timestamp": "2026-09-29T10:15:30Z",
  "payment": {
    "gateway": "PayU",
    "gateway_transaction_id": "payu_tx_9981247",
    "status": "PAID",
    "amount_paid": 680.00
  },
  "customer": {
    "name": "Anand Kumar",
    "email": "anand.k@example.com",
    "phone": "+919876543210"
  },
  "shipping_address": {
    "recipient_name": "Anand Kumar",
    "phone": "+919876543210",
    "address_line1": "Flat 4B, Maple Apartments",
    "address_line2": "MG Road, Broadway",
    "city": "Kochi",
    "state": "Kerala",
    "pincode": "682011",
    "country": "India"
  },
  "items": [
    {
      "isbn13": "9788126412345",
      "quantity": 2,
      "unit_price": 315.00
    }
  ],
  "financials": {
    "items_subtotal": 630.00,
    "shipping_charge": 50.00,
    "discount_applied": 0.00,
    "grand_total": 680.00
  }
}
```

### Sample Response (`201 Created`)
```json
{
  "success": true,
  "bms_order_id": "e2f1a941-8c4d-4e9b-b27a-563b7df089a1",
  "invoice_number": "ONLINE-20260929-0012",
  "message": "Order accepted for processing"
}
```

---

## 📦 5. Webhook: Order Dispatch Notification (BMS → E-Commerce Website)

When BMS warehouse staff pack the parcel and assign a tracking number (e.g. India Post, Speed Post, DTDC), BMS automatically fires a POST webhook to the e-commerce website so the website can send SMS/Email tracking notifications to the buyer and update the order status to `SHIPPED`.

### Webhook Target URL
The external developer must provide an endpoint (e.g. `https://your-website.com/api/webhooks/bms-dispatch`).

### Headers sent by BMS
```http
Content-Type: application/json
x-bms-secret: YOUR_CONFIGURED_WEBHOOK_SECRET
```

### Webhook Payload sent by BMS
```json
{
  "web_order_id": "KB-ONLINE-88492",
  "bms_order_id": "e2f1a941-8c4d-4e9b-b27a-563b7df089a1",
  "invoice_number": "ONLINE-20260929-0012",
  "status": "SHIPPED",
  "courier_name": "India Post / Speed Post",
  "tracking_number": "EK987654321IN",
  "tracking_url": "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignmentNo=EK987654321IN",
  "dispatched_at": "2026-09-29T11:45:00.000Z"
}
```

---

## 📝 6. Customer Enquiries & Stock Requests (Optional)

If the e-commerce website has forms for "Request Out-of-Stock Book" or "Request New Title", submit them directly to BMS:

- **Demand Enquiry API**: `POST /api/v1/enquiries/demand`
- **New Title Suggestion API**: `POST /api/v1/enquiries/new-title`

---

## ⚙️ Environment Configuration Checklist for Developer

Before testing integration, ensure the following environment variables are synchronized:

| Environment Variable | Where it lives | Purpose |
| :--- | :--- | :--- |
| `ECOMMERCE_API_KEY` | BMS `.env` & Website Config | Shared secret string for `x-api-key` header authentication |
| `ECOMMERCE_BRANCH_ID` | BMS `.env` | UUID of the "Online Store" virtual branch in BMS |
| `ECOMMERCE_WEBHOOK_URL` | BMS `.env` | Website endpoint URL for receiving dispatch & tracking webhooks |
| `ECOMMERCE_WEBHOOK_SECRET` | BMS `.env` & Website Config | Shared secret for verifying webhook signature from BMS |
