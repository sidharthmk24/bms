import { apiSuccess } from '@/lib/api-response';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { PmsIntegrationService } from '@/lib/services/pms.service';

const pmsService = new PmsIntegrationService();

async function getPmsTitlesHandler(_req: AuthenticatedRequest) {
  const data = await pmsService.getCompletedTitles();
  return apiSuccess(data);
}

export const GET = withAuth(getPmsTitlesHandler);
