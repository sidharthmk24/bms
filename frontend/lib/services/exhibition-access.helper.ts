import { DataSource } from 'typeorm';
import { JwtPayload } from '../auth/jwt';
import { UserRole } from '../api-backend/users/enums/user-role.enum';
import { hasRole } from '../api-backend/common/helpers/role.helper';
import { ForbiddenException, NotFoundException } from '../errors';
import { Exhibition } from '../api-backend/exhibitions/entities/exhibition.entity';
import { ExhibitionAssignment } from '../api-backend/exhibitions/entities/exhibition-assignment.entity';
import { getDataSource } from '../db/data-source';

export interface ExhibitionAccessResult {
  exhibition: Exhibition;
  isLead: boolean;
  isStaff: boolean;
  isBranchManager: boolean;
  isAdmin: boolean;
  isFinance: boolean;
  isCentralManager: boolean;
}

/**
 * Enforces per-exhibition access control.
 *
 * Who can access a given exhibition:
 * - Users assigned to it in exhibition_assignments
 * - Legacy assignedUserId on exhibition (if set)
 * - The branch manager of its sourceBranchId
 * - SUPER_ADMIN, ADMIN
 * - FINANCE (read-only)
 * - CENTRAL_INVENTORY_MANAGER (read-only, plus stock request review)
 *
 * A branch manager from a different branch is REFUSED access (403).
 */
export async function canAccessExhibition(
  user: JwtPayload,
  exhibitionId: string,
  ds?: DataSource,
): Promise<ExhibitionAccessResult> {
  const dataSource = ds || (await getDataSource());
  const exhibitionRepo = dataSource.getRepository(Exhibition);
  const assignmentRepo = dataSource.getRepository(ExhibitionAssignment);

  const exhibition = await exhibitionRepo.findOne({
    where: { id: exhibitionId },
    relations: ['sourceBranch', 'requestedBy', 'approvedBy', 'assignedUser', 'stock', 'stock.book'],
  });

  if (!exhibition) {
    throw new NotFoundException(`Exhibition ${exhibitionId} not found`);
  }

  const isAdmin = hasRole(user, UserRole.SUPER_ADMIN) || hasRole(user, UserRole.ADMIN);
  const isFinance = hasRole(user, UserRole.FINANCE);
  const isCentralManager = hasRole(user, UserRole.CENTRAL_INVENTORY_MANAGER);
  const isBranchManager =
    hasRole(user, UserRole.BRANCH_MANAGER) && user.branchId === exhibition.sourceBranchId;

  // Check explicit assignment table
  const assignment = await assignmentRepo.findOne({
    where: { exhibitionId, userId: user.userId },
  });

  const isLegacyAssigned = exhibition.assignedUserId === user.userId;
  const isAssigned = !!assignment || isLegacyAssigned;
  const isLead = (assignment && assignment.role === 'LEAD') || (isLegacyAssigned && isBranchManager) || isAdmin;
  const isStaff = !!assignment || isLegacyAssigned;

  const hasAccess =
    isAdmin ||
    isFinance ||
    isBranchManager ||
    isAssigned;

  if (!hasAccess) {
    throw new ForbiddenException(
      `Access denied. You are not assigned to exhibition "${exhibition.name}". Central Inventory Managers cannot access live exhibition workspaces or perform day-close reconciliations.`,
    );
  }

  return {
    exhibition,
    isLead: !!isLead,
    isStaff: !!isStaff,
    isBranchManager,
    isAdmin,
    isFinance,
    isCentralManager,
  };
}
