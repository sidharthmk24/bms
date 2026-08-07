import { apiSuccess } from '@/lib/api-response';
import { NextResponse } from 'next/server';
import {  withAuth, AuthenticatedRequest  } from '@/lib/middleware/withAuth';
import { UsersService } from '@/lib/services/users.service';

const usersService = new UsersService();

async function updateStatusHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  const { isActive } = await req.json();
  const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
  
  await usersService.updateStatus((await params).id, isActive, req.user, ipAddress);
  return apiSuccess({ message: 'User status updated successfully' });
}

export const PATCH = withAuth(updateStatusHandler);
