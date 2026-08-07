import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { ExhibitionsService } from '@/lib/services/exhibitions.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const exhibitionsService = new ExhibitionsService();

export const POST = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER], async (req: NextRequest, { user, params }) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  // If dto has status REJECTED, reject it, else approve it. 
  // Let's assume frontend passes `status` in body for review.
  if (body.status === 'REJECTED') {
    const data = await exhibitionsService.rejectExhibition(p.id, body, user, ip);
    return apiSuccess(data);
  }
  const data = await exhibitionsService.approveExhibition(p.id, body, user, ip);
  return apiSuccess(data);
});
