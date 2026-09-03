import { apiSuccess, apiError } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { InventoryService } from '@/lib/services/inventory.service';
import { withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const inventoryService = new InventoryService();

export const POST = withRoles(
  [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER],
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();
      const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
      const result = await inventoryService.createBookWithCentralStock(body, user, ipAddress);
      return apiSuccess(result, 'Book and warehouse stock created successfully', 201);
    } catch (error) {
      return apiError(error);
    }
  }
);
