import { apiSuccess } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { ExhibitionsService } from '@/lib/services/exhibitions.service';
import { withAuth } from '@/lib/middleware/withAuth';

const exhibitionsService = new ExhibitionsService();

export const GET = withAuth(async (req: NextRequest, context: any) => {
  const params = await context.params;
  const data = await exhibitionsService.getExhibitionDashboard(params.id, context.user);
  return apiSuccess(data);
});
