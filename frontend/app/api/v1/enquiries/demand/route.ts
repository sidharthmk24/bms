import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { EnquiriesService } from '@/lib/services/enquiries.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const enquiriesService = new EnquiriesService();
export const GET = withRoles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER], async () => apiSuccess(await enquiriesService.getDemandSummary()));