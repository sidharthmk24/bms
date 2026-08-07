import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { RestockService } from '@/lib/services/restock.service';
import {  withAuth  } from '@/lib/middleware/withAuth';

const restockService = new RestockService();

export const GET = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const data = await restockService.findOne(p.id, user);
  return apiSuccess(data);
});
