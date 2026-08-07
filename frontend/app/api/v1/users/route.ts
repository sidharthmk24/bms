import { apiSuccess } from '@/lib/api-response';
import { NextResponse } from 'next/server';
import {  withAuth, AuthenticatedRequest  } from '@/lib/middleware/withAuth';
import { UsersService } from '@/lib/services/users.service';

const usersService = new UsersService();

async function getUsersHandler(req: AuthenticatedRequest) {
  try {
    const users = await usersService.findAll(req.user);
    // Sanitize outputs
    return apiSuccess(users.map(u => {
      const { passwordHash, ...safe } = u as any;
      return safe;
    }));
  } catch (error: any) {
    console.error('Users API Error:', error);
    return apiError(new Error(error.message || 'Failed to fetch users'));
  }
}

async function createUserHandler(req: AuthenticatedRequest) {
  const body = await req.json();
  const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
  
  const user = await usersService.create(body, req.user, ipAddress);
  const { passwordHash, ...safe } = user as any;
  return apiSuccess(safe, undefined, 201);
}

export const GET = withAuth(getUsersHandler);
export const POST = withAuth(createUserHandler);
