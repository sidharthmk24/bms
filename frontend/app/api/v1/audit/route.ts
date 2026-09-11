import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from '@/lib/services/audit.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const auditService = new AuditService();
export const GET = withRoles([UserRole.SUPER_ADMIN], async (req) => {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams.entries());
  return apiSuccess(await auditService.findAll(query));
});