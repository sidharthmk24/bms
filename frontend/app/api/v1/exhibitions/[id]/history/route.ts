import { apiSuccess, apiError } from '@/lib/api-response';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { ExhibitionsService } from '@/lib/services/exhibitions.service';

import { BadRequestException } from '@/lib/errors';

const exhibitionsService = new ExhibitionsService();

async function getExhibitionHistoryHandler(req: AuthenticatedRequest, context: any) {
  try {
    const { id } = await context.params;
    if (!id) {
      return apiError(new BadRequestException('id parameter is required'));
    }
    
    const data = await exhibitionsService.getExhibitionHistory(id, req.user);
    return apiSuccess(data);
  } catch (error: any) {
    console.error('Exhibitions History GET API Error:', error);
    return apiError(error);
  }
}

export const GET = withAuth(getExhibitionHistoryHandler);
