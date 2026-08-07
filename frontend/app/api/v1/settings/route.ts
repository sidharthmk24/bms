import { apiSuccess } from '@/lib/api-response';
import { NextRequest, NextResponse } from 'next/server';
import { SettingsService } from '@/lib/services/settings.service';
import { withAuth, withRoles } from '@/lib/middleware/withAuth';
import { UserRole } from '@/lib/api-backend/users/enums/user-role.enum';

const settingsService = new SettingsService();
export const GET = withRoles([UserRole.SUPER_ADMIN], async () => apiSuccess(await settingsService.findAll()));