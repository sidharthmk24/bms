import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withEcommerceAuth } from '@/lib/middleware/withEcommerceAuth';
import { EcommerceService } from '@/lib/services/ecommerce.service';

const ecomService = new EcommerceService();

/**
 * GET /api/v1/ecommerce/catalog
 *
 * Paginated book catalog with current central-stock quantities.
 * Used by the Kairali website for full and incremental catalog sync.
 *
 * Auth: x-api-key header (ECOMMERCE_API_KEY)
 *
 * Query params:
 *   page          - page number (default: 1)
 *   limit         - items per page, max 500 (default: 100)
 *   updated_since - ISO timestamp for incremental sync (e.g. 2026-09-24T00:00:00Z)
 */
export const GET = withEcommerceAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const query = Object.fromEntries(searchParams.entries());
  const data = await ecomService.getCatalog(query);
  return apiSuccess(data);
});
