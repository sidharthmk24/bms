const fs = require('fs');
const path = require('path');

const API_V1_DIR = path.join(__dirname, '../app/api/v1');

const routes = {
  'procurement/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { ProcurementService } from '../../../lib/services/procurement.service';
import { withAuth } from '../../../lib/auth/with-auth';
import { UserRole } from '../../../lib/api-backend/users/enums/user-role.enum';

const procurementService = new ProcurementService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const query: any = Object.fromEntries(url.searchParams.entries());
  const data = await procurementService.findAll(query, user);
  return NextResponse.json(data);
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await procurementService.createPurchaseOrder(body, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER] });
  `,
  'procurement/[id]/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { ProcurementService } from '../../../../lib/services/procurement.service';
import { withAuth } from '../../../../lib/auth/with-auth';

const procurementService = new ProcurementService();

export const GET = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const data = await procurementService.findOne(p.id, user);
  return NextResponse.json(data);
});
  `,
  'procurement/[id]/receive/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { ProcurementService } from '../../../../../lib/services/procurement.service';
import { withAuth } from '../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../lib/api-backend/users/enums/user-role.enum';

const procurementService = new ProcurementService();

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await procurementService.receivePurchaseOrder(p.id, body, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER] });
  `
};

for (const [routePath, content] of Object.entries(routes)) {
  const fullPath = path.join(API_V1_DIR, routePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\\n');
  console.log('Created', fullPath);
}
