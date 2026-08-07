const fs = require('fs');
const path = require('path');

const API_V1_DIR = path.join(__dirname, '../app/api/v1');

const routes = {
  'billing/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '../../../lib/services/billing.service';
import { withAuth } from '../../../lib/auth/with-auth';

const billingService = new BillingService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const query: any = Object.fromEntries(url.searchParams.entries());
  const data = await billingService.getBills(query, user);
  return NextResponse.json(data);
});
  `,
  'billing/checkout/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '../../../../lib/services/billing.service';
import { withAuth } from '../../../../lib/auth/with-auth';

const billingService = new BillingService();

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await billingService.checkout(body, user, ip);
  return NextResponse.json(data);
});
  `,
  'billing/[id]/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '../../../../lib/services/billing.service';
import { withAuth } from '../../../../lib/auth/with-auth';

const billingService = new BillingService();

export const GET = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const data = await billingService.findOne(p.id, user);
  return NextResponse.json(data);
});
  `,
  'billing/[id]/void/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '../../../../../lib/services/billing.service';
import { withAuth } from '../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../lib/api-backend/users/enums/user-role.enum';

const billingService = new BillingService();

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await billingService.voidBill(p.id, body.voidReason, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER] });
  `
};

for (const [routePath, content] of Object.entries(routes)) {
  const fullPath = path.join(API_V1_DIR, routePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\\n');
  console.log('Created', fullPath);
}
