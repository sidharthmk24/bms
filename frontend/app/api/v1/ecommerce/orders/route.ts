import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-response';
import { withEcommerceAuth } from '@/lib/middleware/withEcommerceAuth';
import { EcommerceService } from '@/lib/services/ecommerce.service';
import { BadRequestException } from '@/lib/errors';

const ecomService = new EcommerceService();

/**
 * POST /api/v1/ecommerce/orders
 *
 * Receives a paid online order from the Kairali website and records it in BMS.
 * Creates a Bill + BillItems, deducts from central warehouse stock.
 *
 * Auth: x-api-key header (ECOMMERCE_API_KEY)
 *
 * Body: see EcomOrderPayload in ecommerce.service.ts
 *
 * Response:
 * {
 *   "success": true,
 *   "bms_order_id": "uuid",
 *   "invoice_number": "ONLINE-20260924-0001",
 *   "message": "Order accepted for processing"
 * }
 */
export const POST = withEcommerceAuth(async (req: NextRequest) => {
  let body: any;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestException('Invalid JSON body');
  }

  const result = await ecomService.createOnlineOrder(body);
  return apiSuccess(result, 'Order accepted for processing', 201);
});

/**
 * GET /api/v1/ecommerce/orders
 *
 * Returns the dispatch queue — all online orders, optionally filtered by status.
 * Used by BMS warehouse UI to show pending shipments.
 *
 * Auth: x-api-key header (ECOMMERCE_API_KEY)
 *
 * Query params:
 *   page   - default 1
 *   limit  - default 20
 *   status - "pending" (default) | "dispatched" | "all"
 */
export const GET = withEcommerceAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const query = Object.fromEntries(searchParams.entries());
  const data = await ecomService.getOnlineOrders(query);
  return apiSuccess(data);
});
