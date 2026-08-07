import { apiSuccess } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { CatalogService } from '@/lib/services/catalog.service';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const catalogService = new CatalogService();

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const query = Object.fromEntries(searchParams.entries());
  return apiSuccess(await catalogService.findAllBooks(query));
});

export const POST = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER], async (req: NextRequest, { user }: any) => {
  const body = await req.json();
  const userId = user.userId;
  const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
  return apiSuccess(await catalogService.createBook(body, userId, ipAddress), undefined, 201);
});
