import { apiSuccess } from '@/lib/api-response';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  return apiSuccess({
    secret: process.env.JWT_SECRET,
    hasSecret: !!process.env.JWT_SECRET,
    length: process.env.JWT_SECRET?.length
  });
}
