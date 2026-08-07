const fs = require('fs');
const path = require('path');

const API_V1_DIR = path.join(__dirname, '../app/api/v1');

const routes = {
  'finance/expenses/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '../../../../lib/services/finance.service';
import { withAuth } from '../../../../lib/auth/with-auth';
import { UserRole } from '../../../../lib/api-backend/users/enums/user-role.enum';

const financeService = new FinanceService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const data = await financeService.findAllExpenses(user);
  return NextResponse.json(data);
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const data = await financeService.createExpense(body, user);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER] });
  `,
  'finance/expenses/[id]/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '../../../../../lib/services/finance.service';
import { withAuth } from '../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../lib/api-backend/users/enums/user-role.enum';

const financeService = new FinanceService();

export const PATCH = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await financeService.updateExpense(p.id, body, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER] });

export const DELETE = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  await financeService.deleteExpense(p.id, user, ip);
  return NextResponse.json({ success: true });
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER] });
  `,
  'finance/cash-reconciliations/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '../../../../lib/services/finance.service';
import { withAuth } from '../../../../lib/auth/with-auth';
import { UserRole } from '../../../../lib/api-backend/users/enums/user-role.enum';

const financeService = new FinanceService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const data = await financeService.findAllCashReconciliations(user);
  return NextResponse.json(data);
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const data = await financeService.createCashReconciliation(body, user);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER, UserRole.BRANCH_FRONT_OFFICE] });
  `,
  'finance/reports/revenue/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '../../../../../lib/services/finance.service';
import { withAuth } from '../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../lib/api-backend/users/enums/user-role.enum';

const financeService = new FinanceService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const data = await financeService.getRevenue(user, startDate || undefined, endDate || undefined);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.BRANCH_MANAGER] });
  `,
  'finance/reports/pnl/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '../../../../../lib/services/finance.service';
import { withAuth } from '../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../lib/api-backend/users/enums/user-role.enum';

const financeService = new FinanceService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  if (!startDate || !endDate) return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 });
  const data = await financeService.getPnL(startDate, endDate);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE] });
  `,
  'finance/reports/branch-comparison/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '../../../../../lib/services/finance.service';
import { withAuth } from '../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../lib/api-backend/users/enums/user-role.enum';

const financeService = new FinanceService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  if (!startDate || !endDate) return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 });
  const data = await financeService.getBranchComparison(startDate, endDate);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE] });
  `,
  'finance/reports/export/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '../../../../../lib/services/finance.service';
import { withAuth } from '../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../lib/api-backend/users/enums/user-role.enum';

const financeService = new FinanceService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  if (!startDate || !endDate) return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 });
  const csv = await financeService.exportFinanceData(startDate, endDate);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="finance_export.csv"',
    }
  });
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE] });
  `
};

for (const [routePath, content] of Object.entries(routes)) {
  const fullPath = path.join(API_V1_DIR, routePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\\n');
  console.log('Created', fullPath);
}
