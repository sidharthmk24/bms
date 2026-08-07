import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from '@/lib/services/audit.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const auditService = new AuditService();
export const GET = withRoles([UserRole.SUPER_ADMIN], async (req) => {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit')) || 100;
  return apiSuccess(await auditService.findAll(limit));
});