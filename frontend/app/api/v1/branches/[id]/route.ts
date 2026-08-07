import { apiSuccess } from '@/lib/api-response';
import { NextResponse } from 'next/server';
import { withAuth, withRoles, withBranchScope, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { BranchesService } from '@/lib/services/branches.service';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const branchesService = new BranchesService();

async function getBranchByIdHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  const branch = await branchesService.findOne((await params).id);
  return apiSuccess(branch);
}

async function updateBranchHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json();
  const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
  
  const branch = await branchesService.update((await params).id, body, req.user.userId, ipAddress);
  return apiSuccess(branch);
}

export const GET = withAuth(getBranchByIdHandler);
export const PATCH = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN], updateBranchHandler);
