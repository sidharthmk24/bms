import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { ExhibitionsService } from '@/lib/services/exhibitions.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const exhibitionsService = new ExhibitionsService();

export const POST = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY], async (req: NextRequest, { user, params }) => {
  const p = await params;
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await exhibitionsService.dispatchExhibition(p.id, user, ip);
  return apiSuccess(data);
});
