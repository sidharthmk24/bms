const fs = require('fs');
const path = require('path');

const API_V1_DIR = path.join(__dirname, '../app/api/v1');

const routes = {
  'exhibitions/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { ExhibitionsService } from '../../../lib/services/exhibitions.service';
import { withAuth } from '../../../lib/auth/with-auth';
import { UserRole } from '../../../lib/api-backend/users/enums/user-role.enum';

const exhibitionsService = new ExhibitionsService();

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const data = await exhibitionsService.findAll(user);
  return NextResponse.json(data);
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await exhibitionsService.createExhibition(body, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER] });
  `,
  'exhibitions/[id]/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { ExhibitionsService } from '../../../../lib/services/exhibitions.service';
import { withAuth } from '../../../../lib/auth/with-auth';

const exhibitionsService = new ExhibitionsService();

export const GET = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const data = await exhibitionsService.findOne(p.id, user);
  return NextResponse.json(data);
});
  `,
  'exhibitions/[id]/review/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { ExhibitionsService } from '../../../../../lib/services/exhibitions.service';
import { withAuth } from '../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../lib/api-backend/users/enums/user-role.enum';

const exhibitionsService = new ExhibitionsService();

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  // If dto has status REJECTED, reject it, else approve it. 
  // Let's assume frontend passes \`status\` in body for review.
  if (body.status === 'REJECTED') {
    const data = await exhibitionsService.rejectExhibition(p.id, body, user, ip);
    return NextResponse.json(data);
  }
  const data = await exhibitionsService.approveExhibition(p.id, body, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER] });
  `,
  'exhibitions/[id]/dispatch/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { ExhibitionsService } from '../../../../../lib/services/exhibitions.service';
import { withAuth } from '../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../lib/api-backend/users/enums/user-role.enum';

const exhibitionsService = new ExhibitionsService();

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await exhibitionsService.dispatchExhibition(p.id, user, ip);
  return NextResponse.json(data);
}, { roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY] });
  `,
  'exhibitions/[id]/close/route.ts': `
import { NextRequest, NextResponse } from 'next/server';
import { ExhibitionsService } from '../../../../../lib/services/exhibitions.service';
import { withAuth } from '../../../../../lib/auth/with-auth';
import { UserRole } from '../../../../../lib/api-backend/users/enums/user-role.enum';

const exhibitionsService = new ExhibitionsService();

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  const p = await params;
  const body = await req.json();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const data = await exhibitionsService.closeExhibition(p.id, body, user, ip);
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
