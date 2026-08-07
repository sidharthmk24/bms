import { apiSuccess } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    const payload = verifyJwt(token);
    return apiSuccess({ payload });
  } catch (err: any) {
    return apiSuccess({ error: err.message, name: err.name });
  }
}
