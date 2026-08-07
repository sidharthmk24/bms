const fs = require('fs');
const path = require('path');

const API_V1_DIR = path.join(__dirname, '../app/api/v1');

const routes = {
  'restock/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { RestockService } from '../../../lib/services/restock.service';
import { withAuth } from '../../../lib/auth/with-auth';
import { UserRole } from '../../../lib/api-backend/users/enums/user-role.enum';

const restockService = new RestockService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const query: any = Object.fromEntries(url.searchParams.entries());
  const data = await restockService.findAll(query, user);
  return NextResponse.json(data);
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await restockService.createRequest(body, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY] });
  `,
  'restock/[id]/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { RestockService } from '../../../../lib/services/restock.service';
import { withAuth } from '../../../../lib/auth/with-auth';

const restockService = new RestockService();

export const GET = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const data = await restockService.findOne(p.id, user);
  return NextResponse.json(data);
});
  `,
  'restock/[id]/review/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { RestockService } from '../../../../../lib/services/restock.service';
import { withAuth } from '../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../lib/api-backend/users/enums/user-role.enum';

const restockService = new RestockService();

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await restockService.reviewRequest(p.id, body, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER] });
  `,
  'restock/[id]/dispatch/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { RestockService } from '../../../../../lib/services/restock.service';
import { withAuth } from '../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../lib/api-backend/users/enums/user-role.enum';

const restockService = new RestockService();

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await restockService.dispatchRequest(p.id, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER] });
  `,
  'restock/[id]/receive/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { RestockService } from '../../../../../lib/services/restock.service';
import { withAuth } from '../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../lib/api-backend/users/enums/user-role.enum';

const restockService = new RestockService();

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await restockService.receiveRequest(p.id, body, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY] });
  `,
};

for (const [routePath, content] of Object.entries(routes)) {
  const fullPath = path.join(API_V1_DIR, routePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\\n');
  console.log('Created', fullPath);
}
