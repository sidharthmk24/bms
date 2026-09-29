import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '../api-response';
import { UnauthorizedException } from '../errors';

type EcomHandler = (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse;

/**
 * withEcommerceAuth — guards ecommerce integration endpoints with a shared API key.
 *
 * The website must pass the key in the "x-api-key" header.
 * Key is stored server-side only in ECOMMERCE_API_KEY — never exposed to the browser.
 *
 * Usage:
 *   export const GET = withEcommerceAuth(async (req) => { ... });
 */
export function withEcommerceAuth(handler: EcomHandler) {
  return async (req: NextRequest, context?: any) => {
    try {
      const apiKey = req.headers.get('x-api-key');
      const validKey = process.env.ECOMMERCE_API_KEY;

      if (!validKey) {
        console.error('[EcommerceAuth] ECOMMERCE_API_KEY is not set in environment');
        throw new UnauthorizedException('Integration not configured');
      }

      if (!apiKey || apiKey !== validKey) {
        throw new UnauthorizedException('Invalid or missing API key');
      }

      return await handler(req, context);
    } catch (error: any) {
      return apiError(error);
    }
  };
}
