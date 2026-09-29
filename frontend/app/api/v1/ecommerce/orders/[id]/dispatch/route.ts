import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-response';
import { withEcommerceAuth } from '@/lib/middleware/withEcommerceAuth';
import { EcommerceService } from '@/lib/services/ecommerce.service';
import { BadRequestException } from '@/lib/errors';

const ecomService = new EcommerceService();

/**
 * POST /api/v1/ecommerce/orders/[id]/dispatch
 *
 * Called by BMS warehouse staff after handing the package to the courier.
 * Stores dispatch details and fires the Kairali website webhook to update
 * order status and trigger the customer notification email/SMS.
 *
 * [id] = bms_order_id (the UUID returned when the order was created)
 *
 * Auth: x-api-key header (ECOMMERCE_API_KEY)
 *
 * Body:
 * {
 *   "courier_name": "India Post / Speed Post",
 *   "tracking_number": "EK987654321IN",
 *   "tracking_url": "https://www.indiapost.gov.in/..." (optional)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "bms_order_id": "...",
 *   "web_order_id": "KB-2026-10492",
 *   "invoice_number": "...",
 *   "dispatched_at": "2026-09-25T14:30:00Z",
 *   "webhook_delivered": true,
 *   "webhook_status": 200
 * }
 */
export const POST = withEcommerceAuth(async (req: NextRequest, context: any) => {
  const bmsOrderId = context?.params?.id as string;
  if (!bmsOrderId) throw new BadRequestException('Order ID is required');

  let body: any;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestException('Invalid JSON body');
  }

  const result = await ecomService.markDispatched(bmsOrderId, body);
  return apiSuccess(result, 'Order marked as dispatched');
});
