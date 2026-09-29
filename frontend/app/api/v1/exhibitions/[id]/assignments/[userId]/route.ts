import { apiSuccess } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { ExhibitionsService } from '@/lib/services/exhibitions.service';
import { withAuth } from '@/lib/middleware/withAuth';

const exhibitionsService = new ExhibitionsService();

export const DELETE = withAuth(async (req: NextRequest, { user, params }: any) => {
  const p = await params;
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  await exhibitionsService.removeStaff(p.id, p.userId, user, ip);
  return apiSuccess({ message: 'Staff member removed successfully' });
});
