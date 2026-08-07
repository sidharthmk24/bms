import { apiSuccess } from '@/lib/api-response';
import { NextResponse } from 'next/server';
import { withAuth, withRoles, withBranchScope, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { CatalogService } from '@/lib/services/catalog.service';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const catalogService = new CatalogService();

async function getHandler(req: AuthenticatedRequest) {
  const items = await catalogService.findAllAuthors();
  return apiSuccess(items);
}

async function postHandler(req: AuthenticatedRequest) {
  const body = await req.json();
  const item = await catalogService.createAuthor(body);
  return apiSuccess(item, undefined, 201);
}

export const GET = withAuth(getHandler);
export const POST = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER], postHandler);
