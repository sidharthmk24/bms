import { apiSuccess } from '@/lib/api-response';
import { NextResponse } from 'next/server';
import { withAuth, withRoles, withBranchScope, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { BranchesService } from '@/lib/services/branches.service';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const branchesService = new BranchesService();

async function getBranchesHandler(req: AuthenticatedRequest) {
  const branches = await branchesService.findAll();
  return apiSuccess(branches);
}

async function createBranchHandler(req: AuthenticatedRequest) {
  const body = await req.json();
  const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
  
  const branch = await branchesService.create(body, req.user.userId, ipAddress);
  return apiSuccess(branch, undefined, 201);
}

export const GET = withAuth(getBranchesHandler);
export const POST = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN], createBranchHandler);
