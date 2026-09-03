import { apiSuccess } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { ProcurementService } from '@/lib/services/procurement.service';
import { withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const procurementService = new ProcurementService();

// GET /api/v1/procurement/requests - List PO requests
export const GET = withRoles(
  [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER],
  async (req: NextRequest) => {
    const url = new URL(req.url);
    const query: any = Object.fromEntries(url.searchParams.entries());
    const data = await procurementService.findAllPoRequests(query);
    return apiSuccess(data);
  }
);

// POST /api/v1/procurement/requests - Create a PO approval request
export const POST = withRoles(
  [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER],
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const data = await procurementService.createPoRequest(body, user, ip);
    return apiSuccess(data);
  }
);
