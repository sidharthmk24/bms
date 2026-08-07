const fs = require('fs');
const path = require('path');

const API_V1_DIR = path.join(__dirname, '../app/api/v1');

const routes = {
  'inventory/central-stock/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '../../../../lib/services/inventory.service';
import { withAuth } from '../../../../lib/auth/with-auth';
import { UserRole } from '../../../../lib/api-backend/users/enums/user-role.enum';

const inventoryService = new InventoryService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const query: any = Object.fromEntries(url.searchParams.entries());
  const data = await inventoryService.getCentralStock(query);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER] });
  `,
  'inventory/central-stock/low/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '../../../../../lib/services/inventory.service';
import { withAuth } from '../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../lib/api-backend/users/enums/user-role.enum';

const inventoryService = new InventoryService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const query: any = Object.fromEntries(url.searchParams.entries());
  const data = await inventoryService.getCentralStockLow(query);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER] });
  `,
  'inventory/central-stock/[bookId]/threshold/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '../../../../../../lib/services/inventory.service';
import { withAuth } from '../../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../../lib/api-backend/users/enums/user-role.enum';

const inventoryService = new InventoryService();

export const PATCH = withAuth(async (req: NextRequest, { user, params }) => {
  const body = await req.json();
  const bookId = (await params).bookId;
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await inventoryService.updateCentralThreshold(bookId, body, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER] });
  `,
  'inventory/branches/[branchId]/inventory/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '../../../../../../lib/services/inventory.service';
import { withAuth } from '../../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../../lib/api-backend/users/enums/user-role.enum';

const inventoryService = new InventoryService();

export const GET = withAuth(async (req: NextRequest, { user, params }) => {
  const branchId = (await params).branchId;
  const url = new URL(req.url);
  const query: any = Object.fromEntries(url.searchParams.entries());
  const data = await inventoryService.getBranchInventory(branchId, query, user);
  return NextResponse.json(data);
});

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  const branchId = (await params).branchId;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await inventoryService.addBranchInventory(branchId, body, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY] });
  `,
  'inventory/branches/[branchId]/inventory/low/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '../../../../../../../lib/services/inventory.service';
import { withAuth } from '../../../../../../../lib/auth/with-auth';

const inventoryService = new InventoryService();

export const GET = withAuth(async (req: NextRequest, { user, params }) => {
  const branchId = (await params).branchId;
  const url = new URL(req.url);
  const query: any = Object.fromEntries(url.searchParams.entries());
  const data = await inventoryService.getBranchInventoryLow(branchId, query, user);
  return NextResponse.json(data);
});
  `,
  'inventory/branches/[branchId]/inventory/[bookId]/threshold/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '../../../../../../../../lib/services/inventory.service';
import { withAuth } from '../../../../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../../../../lib/api-backend/users/enums/user-role.enum';

const inventoryService = new InventoryService();

export const PATCH = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await inventoryService.updateBranchThreshold(p.branchId, p.bookId, body, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY] });
  `,
  'inventory/branches/[branchId]/inventory/[bookId]/adjust/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '../../../../../../../../lib/services/inventory.service';
import { withAuth } from '../../../../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../../../../lib/api-backend/users/enums/user-role.enum';

const inventoryService = new InventoryService();

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await inventoryService.adjustBranchStock(p.branchId, p.bookId, body, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY] });
  `,
  'inventory/stock-movements/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '../../../../lib/services/inventory.service';
import { withAuth } from '../../../../lib/auth/with-auth';

const inventoryService = new InventoryService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const query: any = Object.fromEntries(url.searchParams.entries());
  const data = await inventoryService.getStockMovements(query);
  return NextResponse.json(data);
});
  `
};

for (const [routePath, content] of Object.entries(routes)) {
  const fullPath = path.join(API_V1_DIR, routePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\\n');
  console.log('Created', fullPath);
}
