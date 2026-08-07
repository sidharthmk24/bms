import { apiSuccess } from '@/lib/api-response';
import { NextResponse } from 'next/server';
import {  withAuth, AuthenticatedRequest  } from '@/lib/middleware/withAuth';
import { UsersService } from '@/lib/services/users.service';

const usersService = new UsersService();

async function resetPasswordHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
  
  await usersService.sendReset((await params).id, req.user, ipAddress);
  return apiSuccess({ message: 'Reset token generated successfully' });
}

export const POST = withAuth(resetPasswordHandler);
