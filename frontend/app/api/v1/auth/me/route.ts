import { apiSuccess } from '@/lib/api-response';
import { NextResponse } from 'next/server';
import {  withAuth, AuthenticatedRequest  } from '@/lib/middleware/withAuth';
import { getDataSource } from '@/lib/db/data-source';
import { User } from '@/lib/api-backend/users/entities/user.entity';

async function meHandler(req: AuthenticatedRequest) {
  const currentUser = req.user;
  
  const ds = await getDataSource();
  const userRepo = ds.getRepository<User>(User.name);
  
  const user = await userRepo.findOne({
    where: { id: currentUser.userId, isActive: true },
    relations: ['branch', 'roles'],
  });

  if (!user) {
    return apiSuccess({ message: 'User not found or inactive' }, undefined, 404);
  }

  return apiSuccess({
    id: user.id,
    name: user.name,
    email: user.email,
    roles: currentUser.roles,
    primaryRole: currentUser.primaryRole,
    originalRoles: currentUser.originalRoles,
    originalPrimaryRole: currentUser.originalPrimaryRole,
    branchId: currentUser.branchId,
    branch: user.branch,
  });
}

export const GET = withAuth(meHandler);
