import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withEcommerceAuth } from '@/lib/middleware/withEcommerceAuth';
import { EcommerceService } from '@/lib/services/ecommerce.service';
import { BadRequestException } from '@/lib/errors';

const ecomService = new EcommerceService();

/**
 * POST /api/v1/ecommerce/inventory/check
 *
 * Live stock & price check — called at checkout before payment to confirm
 * items are still in stock after the last catalog sync.
 *
 * Auth: x-api-key header (ECOMMERCE_API_KEY)
 *
 * Body: { "isbns": ["9788126412345", "9788126498765"] }
 *
 * Response:
 * {
 *   "inventory": [
 *     { "isbn13": "...", "bms_id": "...", "stock_quantity": 45, "sale_price": 314, "found": true },
 *     { "isbn13": "...", "stock_quantity": 0, "sale_price": null, "found": false }
 *   ]
 * }
 */
export const POST = withEcommerceAuth(async (req: NextRequest) => {
  let body: any;
  try {
    body = await req.json();
  } catch {
    throw new BadRequestException('Invalid JSON body');
  }

  if (!body?.isbns) {
    throw new BadRequestException('Request body must contain "isbns" array');
  }

  const data = await ecomService.checkInventory(body.isbns);
  return apiSuccess(data);
});
