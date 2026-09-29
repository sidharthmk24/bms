import { apiSuccess } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { ExhibitionsService } from '@/lib/services/exhibitions.service';
import { withAuth } from '@/lib/middleware/withAuth';

const exhibitionsService = new ExhibitionsService();

export const GET = withAuth(async (req: NextRequest, { user, params }: any) => {
  const p = await params;
  const data = await exhibitionsService.getAssignments(p.id, user);
  return apiSuccess(data);
});

export const POST = withAuth(async (req: NextRequest, { user, params }: any) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await exhibitionsService.assignStaff(p.id, body, user, ip);
  return apiSuccess(data);
});
