import { apiSuccess } from '@/lib/api-response';
import { NextResponse } from 'next/server';
import { withAuth, withRoles, withBranchScope, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { CatalogService } from '@/lib/services/catalog.service';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const catalogService = new CatalogService();

async function getHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  let items;
  switch (entity) {
    case 'authors': items = await catalogService.findAllAuthors(); break;
    case 'publishers': items = await catalogService.findAllPublishers(); break;
    case 'categories': items = await catalogService.findAllCategories(); break;
    case 'suppliers': items = await catalogService.findAllSuppliers(); break;
    case 'books': {
      const { searchParams } = new URL(req.url);
      const query = Object.fromEntries(searchParams.entries());
      items = await catalogService.findAllBooks(query);
      break;
    }
    default: return apiSuccess({ message: 'Not Found' }, undefined, 404);
  }
  return apiSuccess(items);
}

async function postHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  const body = await req.json();
  const userId = req.user.userId;
  const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';

  let item;
  switch (entity) {
    case 'authors': item = await catalogService.createAuthor(body); break;
    case 'publishers': item = await catalogService.createPublisher(body); break;
    case 'categories': item = await catalogService.createCategory(body); break;
    case 'suppliers': item = await catalogService.createSupplier(body); break;
    case 'books': item = await catalogService.createBook(body, userId, ipAddress); break;
    default: return apiSuccess({ message: 'Not Found' }, undefined, 404);
  }
  return apiSuccess(item, undefined, 201);
}

export const GET = withAuth(getHandler);
export const POST = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER], postHandler);
