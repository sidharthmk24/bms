import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { ExhibitionsService } from '@/lib/services/exhibitions.service';
import { withAuth } from '@/lib/middleware/withAuth';

const exhibitionsService = new ExhibitionsService();

export const GET = withAuth(async (req: NextRequest, context: any) => {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get('ids');
  if (!idsParam) {
    return NextResponse.json(
      { success: false, error: { message: 'Query parameter "ids" (comma-separated exhibition IDs) is required.' } },
      { status: 400 },
    );
  }
  const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
  const comparison = await exhibitionsService.compareExhibitions(ids, context.user);
  return apiSuccess(comparison);
});
