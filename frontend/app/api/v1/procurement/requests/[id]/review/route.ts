import { apiSuccess } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { ProcurementService } from '@/lib/services/procurement.service';
import { withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const procurementService = new ProcurementService();

// PATCH /api/v1/procurement/requests/[id]/review - Approve or reject PO request
export const PATCH = withRoles(
  [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  async (req: NextRequest, { params, user }) => {
    const { id } = await params;
    const body = await req.json();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    const data = await procurementService.reviewPoRequest(
      id,
      body.status,
      body.reviewNote,
      user,
      ip,
    );
    return apiSuccess(data);
  }
);
