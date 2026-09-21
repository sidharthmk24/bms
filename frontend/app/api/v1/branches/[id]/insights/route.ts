import { apiSuccess } from '@/lib/api-response';
import { withAuth, withRoles, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { BranchesService } from '@/lib/services/branches.service';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const branchesService = new BranchesService();

async function getBranchInsightsHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const days = Number(url.searchParams.get('days')) || 30;

  const insights = await branchesService.getBranchInsights(id, days);
  return apiSuccess(insights);
}

export const GET = withRoles(
  [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER],
  getBranchInsightsHandler
);
