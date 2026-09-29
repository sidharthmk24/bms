import { apiSuccess } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { ExhibitionsService } from '@/lib/services/exhibitions.service';
import { withAuth } from '@/lib/middleware/withAuth';

const exhibitionsService = new ExhibitionsService();

export const GET = withAuth(async (req: NextRequest, context: any) => {
  const params = await context.params;
  const url = new URL(req.url);
  if (url.searchParams.get('summary') === 'today') {
    const summary = await exhibitionsService.getTodayCloseSummary(params.id, context.user);
    return apiSuccess(summary);
  }
  const dayCloses = await exhibitionsService.getDayCloses(params.id, context.user);
  return apiSuccess(dayCloses);
});

export const POST = withAuth(async (req: NextRequest, context: any) => {
  const params = await context.params;
  const body = await req.json();
  const result = await exhibitionsService.performDayClose(params.id, body, context.user);
  return apiSuccess(result, 'Day close recorded successfully', 201);
});
