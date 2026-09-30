import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '../api-response';

type EcomHandler = (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse;

/**
 * withEcommerceAuth — wrapper for ecommerce integration endpoints.
 * Public access — requests pass through without requiring an API key.
 *
 * Usage:
 *   export const GET = withEcommerceAuth(async (req) => { ... });
 */
export function withEcommerceAuth(handler: EcomHandler) {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error: any) {
      return apiError(error);
    }
  };
}
