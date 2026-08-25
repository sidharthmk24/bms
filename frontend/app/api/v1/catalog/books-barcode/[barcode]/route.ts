import { apiSuccess, apiError } from '@/lib/api-response';
import { HttpError } from '@/lib/errors';
import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { CatalogService } from '@/lib/services/catalog.service';

const catalogService = new CatalogService();

/**
 * GET /api/v1/catalog/books-barcode/[barcode]
 *
 * Looks up a book by its barcode OR isbn field.
 * Used by the billing POS scanner to quickly find a book by scanning its barcode.
 * Falls back to ISBN lookup if no match on barcode.
 */
export const GET = withAuth(async (req: NextRequest, { params }: any) => {
  try {
    const p = await params;
    const barcode = decodeURIComponent(p.barcode || '').trim();
    if (!barcode) {
      return apiError(new HttpError(400, 'Barcode is required'));
    }

    // Try barcode first, then fallback to isbn
    let book: any = null;
    try {
      book = await catalogService.findBookByBarcode(barcode);
    } catch {
      // Not found by barcode — try isbn as fallback
      try {
        book = await catalogService.findBookByIsbn(barcode);
      } catch {
        return apiError(new HttpError(404, `No book found with barcode or ISBN "${barcode}"`));
      }
    }

    return apiSuccess(book);
  } catch (e: any) {
    return apiError(new HttpError(e.statusCode || 500, e.message || 'Internal Server Error'));
  }
});
