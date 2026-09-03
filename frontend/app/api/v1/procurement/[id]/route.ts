import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { ProcurementService } from '@/lib/services/procurement.service';
import {  withAuth  } from '@/lib/middleware/withAuth';

const procurementService = new ProcurementService();

export const GET = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  if (p.id === 'pms-titles') {
    const { PmsIntegrationService } = await import('@/lib/services/pms.service');
    const pmsService = new PmsIntegrationService();
    const data = await pmsService.getCompletedTitles();
    return apiSuccess(data);
  }
  const data = await procurementService.findOne(p.id);
  return apiSuccess(data);
});
