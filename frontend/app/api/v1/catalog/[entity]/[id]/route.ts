import { apiSuccess } from '@/lib/api-response';
import { NextResponse } from 'next/server';
import { withAuth, withRoles, withBranchScope, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { CatalogService } from '@/lib/services/catalog.service';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const catalogService = new CatalogService();

async function getByIdHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ entity: string, id: string }> }) {
  const { entity, id } = await params;
  
  // Only books need GET by ID in current logic, others are cached full lists
  if (entity === 'books') {
    const book = await catalogService.findBookById(id);
    return apiSuccess(book);
  }
  if (entity === 'books-barcode') {
    const book = await catalogService.findBookByBarcode(id);
    return apiSuccess(book);
  }
  
  return apiSuccess({ message: 'Not Found' }, undefined, 404);
}

async function patchHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ entity: string, id: string }> }) {
  const { entity, id } = await params;
  const body = await req.json();
  const userId = req.user.userId;
  const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';

  let item;
  switch (entity) {
    case 'authors': item = await catalogService.updateAuthor(id, body); break;
    case 'publishers': item = await catalogService.updatePublisher(id, body); break;
    case 'categories': item = await catalogService.updateCategory(id, body); break;
    case 'suppliers': item = await catalogService.updateSupplier(id, body); break;
    case 'books': item = await catalogService.updateBook(id, body, userId, ipAddress); break;
    default: return apiSuccess({ message: 'Not Found' }, undefined, 404);
  }
  return apiSuccess(item);
}

async function deleteHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ entity: string, id: string }> }) {
  const { entity, id } = await params;
  const userId = req.user.userId;
  const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';

  switch (entity) {
    case 'authors': await catalogService.deleteAuthor(id); break;
    case 'publishers': await catalogService.deletePublisher(id); break;
    case 'categories': await catalogService.deleteCategory(id); break;
    case 'suppliers': await catalogService.deleteSupplier(id); break;
    case 'books': await catalogService.deleteBook(id, userId, ipAddress); break;
    default: return apiSuccess({ message: 'Not Found' }, undefined, 404);
  }
  return apiSuccess({ message: 'Deleted successfully' });
}

export const GET = withAuth(getByIdHandler);
export const PATCH = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER], patchHandler);
export const DELETE = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER], deleteHandler);
