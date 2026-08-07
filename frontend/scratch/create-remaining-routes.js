const fs = require('fs');
const path = require('path');

const API_V1_DIR = path.join(__dirname, '../app/api/v1');

const routes = {
  // --- Dashboard ---
  'dashboard/super-admin/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '../../../../lib/services/dashboard.service';
import { withAuth } from '../../../../lib/auth/with-auth';
import { UserRole } from '../../../../lib/api-backend/users/enums/user-role.enum';

const dashboardService = new DashboardService();
export const GET = withAuth(async () => NextResponse.json(await dashboardService.getSuperAdminDashboard()), { roles: [UserRole.SUPER_ADMIN] });
  `,
  'dashboard/admin/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '../../../../lib/services/dashboard.service';
import { withAuth } from '../../../../lib/auth/with-auth';
import { UserRole } from '../../../../lib/api-backend/users/enums/user-role.enum';

const dashboardService = new DashboardService();
export const GET = withAuth(async () => NextResponse.json(await dashboardService.getAdminDashboard()), { roles: [UserRole.ADMIN] });
  `,
  'dashboard/central-inventory/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '../../../../lib/services/dashboard.service';
import { withAuth } from '../../../../lib/auth/with-auth';
import { UserRole } from '../../../../lib/api-backend/users/enums/user-role.enum';

const dashboardService = new DashboardService();
export const GET = withAuth(async () => NextResponse.json(await dashboardService.getCentralInventoryDashboard()), { roles: [UserRole.CENTRAL_INVENTORY_MANAGER] });
  `,
  'dashboard/finance/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '../../../../lib/services/dashboard.service';
import { withAuth } from '../../../../lib/auth/with-auth';
import { UserRole } from '../../../../lib/api-backend/users/enums/user-role.enum';

const dashboardService = new DashboardService();
export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const days = Number(url.searchParams.get('days')) || 30;
  return NextResponse.json(await dashboardService.getFinanceDashboard(days));
}, { roles: [UserRole.FINANCE] });
  `,
  'dashboard/branch-manager/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '../../../../lib/services/dashboard.service';
import { withAuth } from '../../../../lib/auth/with-auth';
import { UserRole } from '../../../../lib/api-backend/users/enums/user-role.enum';

const dashboardService = new DashboardService();
export const GET = withAuth(async (req, { user }) => {
  const url = new URL(req.url);
  const days = Number(url.searchParams.get('days')) || 30;
  return NextResponse.json(await dashboardService.getBranchManagerDashboard(user, days));
}, { roles: [UserRole.BRANCH_MANAGER] });
  `,
  'dashboard/branch-inventory/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '../../../../lib/services/dashboard.service';
import { withAuth } from '../../../../lib/auth/with-auth';
import { UserRole } from '../../../../lib/api-backend/users/enums/user-role.enum';

const dashboardService = new DashboardService();
export const GET = withAuth(async (req, { user }) => NextResponse.json(await dashboardService.getBranchInventoryDashboard(user)), { roles: [UserRole.BRANCH_INVENTORY] });
  `,
  'dashboard/branch-front-office/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '../../../../lib/services/dashboard.service';
import { withAuth } from '../../../../lib/auth/with-auth';
import { UserRole } from '../../../../lib/api-backend/users/enums/user-role.enum';

const dashboardService = new DashboardService();
export const GET = withAuth(async (req, { user }) => NextResponse.json(await dashboardService.getBranchFrontOfficeDashboard(user)), { roles: [UserRole.BRANCH_FRONT_OFFICE] });
  `,

  // --- Enquiries ---
  'enquiries/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { EnquiriesService } from '../../../lib/services/enquiries.service';
import { withAuth } from '../../../lib/auth/with-auth';

const enquiriesService = new EnquiriesService();

export const GET = withAuth(async (req, { user }) => NextResponse.json(await enquiriesService.findAllEnquiries(user)));
export const POST = withAuth(async (req, { user }) => {
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  return NextResponse.json(await enquiriesService.createEnquiry(body, user, ip));
});
  `,
  'enquiries/[id]/status/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { EnquiriesService } from '../../../../../lib/services/enquiries.service';
import { withAuth } from '../../../../../lib/auth/with-auth';

const enquiriesService = new EnquiriesService();
export const PATCH = withAuth(async (req, { user, params }) => {
  const p = await params;
  const body = await req.json();
  return NextResponse.json(await enquiriesService.updateEnquiryStatus(p.id, body, user));
});
  `,
  'enquiries/demand/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { EnquiriesService } from '../../../../lib/services/enquiries.service';
import { withAuth } from '../../../../lib/auth/with-auth';
import { UserRole } from '../../../../lib/api-backend/users/enums/user-role.enum';

const enquiriesService = new EnquiriesService();
export const GET = withAuth(async () => NextResponse.json(await enquiriesService.getDemandSummary()), { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER] });
  `,
  'enquiries/new-title/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { EnquiriesService } from '../../../../lib/services/enquiries.service';
import { withAuth } from '../../../../lib/auth/with-auth';
import { UserRole } from '../../../../lib/api-backend/users/enums/user-role.enum';

const enquiriesService = new EnquiriesService();
export const GET = withAuth(async () => NextResponse.json(await enquiriesService.findAllNewTitleRequests()), { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER] });
export const POST = withAuth(async (req, { user }) => NextResponse.json(await enquiriesService.createNewTitleRequest(await req.json(), user)), { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_FRONT_OFFICE, UserRole.BRANCH_INVENTORY] });
  `,
  'enquiries/new-title/[id]/review/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { EnquiriesService } from '../../../../../../lib/services/enquiries.service';
import { withAuth } from '../../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../../lib/api-backend/users/enums/user-role.enum';

const enquiriesService = new EnquiriesService();
export const POST = withAuth(async (req, { user, params }) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  return NextResponse.json(await enquiriesService.reviewNewTitleRequest(p.id, body, user, ip));
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER] });
  `,

  // --- Audit ---
  'audit/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from '../../../lib/services/audit.service';
import { withAuth } from '../../../lib/auth/with-auth';
import { UserRole } from '../../../lib/api-backend/users/enums/user-role.enum';

const auditService = new AuditService();
export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit')) || 100;
  return NextResponse.json(await auditService.findAll(limit));
}, { roles: [UserRole.SUPER_ADMIN] });
  `,

  // --- Settings ---
  'settings/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { SettingsService } from '../../../lib/services/settings.service';
import { withAuth } from '../../../lib/auth/with-auth';
import { UserRole } from '../../../lib/api-backend/users/enums/user-role.enum';

const settingsService = new SettingsService();
export const GET = withAuth(async () => NextResponse.json(await settingsService.findAll()), { roles: [UserRole.SUPER_ADMIN] });
  `,
  'settings/[key]/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { SettingsService } from '../../../../lib/services/settings.service';
import { withAuth } from '../../../../lib/auth/with-auth';
import { UserRole } from '../../../../lib/api-backend/users/enums/user-role.enum';

const settingsService = new SettingsService();
export const GET = withAuth(async (req, { params }) => NextResponse.json(await settingsService.getSetting((await params).key)), { roles: [UserRole.SUPER_ADMIN] });
export const PATCH = withAuth(async (req, { user, params }) => NextResponse.json(await settingsService.updateSetting((await params).key, await req.json(), user)), { roles: [UserRole.SUPER_ADMIN] });
  `
};

for (const [routePath, content] of Object.entries(routes)) {
  const fullPath = path.join(API_V1_DIR, routePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\\n');
  console.log('Created', fullPath);
}
