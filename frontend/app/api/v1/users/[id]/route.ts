import { apiSuccess } from '@/lib/api-response';
import { NextResponse } from 'next/server';
import {  withAuth, AuthenticatedRequest  } from '@/lib/middleware/withAuth';
import { UsersService } from '@/lib/services/users.service';

const usersService = new UsersService();

async function getUserByIdHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await usersService.findOne((await params).id, req.user);
  const { passwordHash, ...safe } = user as any;
  return apiSuccess(safe);
}

async function updateUserHandler(req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json();
  const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
  
  const user = await usersService.update((await params).id, body, req.user, ipAddress);
  const { passwordHash, ...safe } = user as any;
  return apiSuccess(safe);
}

export const GET = withAuth(getUserByIdHandler);
export const PATCH = withAuth(updateUserHandler);
