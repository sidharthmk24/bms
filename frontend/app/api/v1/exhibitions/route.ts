import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { ExhibitionsService } from '@/lib/services/exhibitions.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const exhibitionsService = new ExhibitionsService();

export const GET = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY], async (req: NextRequest, { user }) => {
  const data = await exhibitionsService.findAll(user);
  return apiSuccess(data);
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await exhibitionsService.createExhibition(body, user, ip);
  return apiSuccess(data);
});