import 'server-only';
import { hasRole } from '../api-backend/common/helpers/role.helper';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '../errors';
import { getDataSource } from '../db/data-source';

import { Exhibition, ExhibitionStatus } from '../api-backend/exhibitions/entities/exhibition.entity';
import { Branch, BranchType } from '../api-backend/branches/entities/branch.entity';
import { ExhibitionStock } from '../api-backend/exhibitions/entities/exhibition-stock.entity';
import { ExhibitionAssignment, ExhibitionAssignmentRole } from '../api-backend/exhibitions/entities/exhibition-assignment.entity';
import { ExhibitionStockSource, StockSourceType } from '../api-backend/exhibitions/entities/exhibition-stock-source.entity';
import { Expense } from '../api-backend/finance/entities/expense.entity';
import { CreditCopy } from '../api-backend/credit-copies/entities/credit-copy.entity';
import { Bill, BillStatus, PaymentStatus, PaymentMode } from '../api-backend/billing/entities/bill.entity';
import { BillItem } from '../api-backend/billing/entities/bill-item.entity';
import { Book } from '../api-backend/catalog/entities/book.entity';
import { generateBillNumber } from '../api-backend/common/helpers/bill-number.helper';
import { User } from '../api-backend/users/entities/user.entity';
import { Notification } from '../api-backend/notifications/entities/notification.entity';
import { ExhibitionStockRequest, ExhibitionStockRequestStatus } from '../api-backend/exhibitions/entities/exhibition-stock-request.entity';
import { ExhibitionStockRequestItem } from '../api-backend/exhibitions/entities/exhibition-stock-request-item.entity';
import { StockTransfer, StockTransferStatus } from '../api-backend/transfers/entities/stock-transfer.entity';
import { StockTransferItem } from '../api-backend/transfers/entities/stock-transfer-item.entity';
import { ExhibitionDayClose } from '../api-backend/exhibitions/entities/exhibition-day-close.entity';
import { AuditLog } from '../api-backend/audit/entities/audit-log.entity';
import { CreateExhibitionDto } from '../api-backend/exhibitions/dto/create-exhibition.dto';
import { UpdateExhibitionDto } from '../api-backend/exhibitions/dto/update-exhibition.dto';
import { ReviewExhibitionDto } from '../api-backend/exhibitions/dto/review-exhibition.dto';
import { DayCloseDto } from '../api-backend/exhibitions/dto/day-close.dto';
import { CreateStockRequestDto } from '../api-backend/exhibitions/dto/create-stock-request.dto';
import { ReviewStockRequestDto, ReviewAction } from '../api-backend/exhibitions/dto/review-stock-request.dto';
import { CloseExhibitionDto } from '../api-backend/exhibitions/dto/close-exhibition.dto';
import { AssignStaffDto } from '../api-backend/exhibitions/dto/assign-staff.dto';
import { canAccessExhibition } from './exhibition-access.helper';

import { JwtPayload } from '../auth/jwt';
import { UserRole } from '../api-backend/users/enums/user-role.enum';
import { NotificationsService } from './notifications.service';
import {
  decrementBranchStock,
  incrementBranchStock,
  decrementCentralStock,
  incrementCentralStock,
  writeStockMovement,
} from './stock.helper';

export class ExhibitionsService {
  private notificationsService = new NotificationsService();

  async checkAndUpdateOverdueExhibitions() {
    try {
      const { exhibitionRepo, dataSource } = await this.getRepos();
      const todayStr = new Date().toISOString().split('T')[0];

      // Find all active/ongoing/approved/requested exhibitions that have passed their dates
      const overdueExhibitions = await exhibitionRepo
        .createQueryBuilder('e')
        .leftJoinAndSelect('e.assignedUser', 'assignedUser')
        .where('e.status IN (:...statuses)', { 
          statuses: [ExhibitionStatus.REQUESTED, ExhibitionStatus.APPROVED, ExhibitionStatus.ONGOING] 
        })
        .andWhere(
          '( (e.status IN (:...plannedStatuses) AND e.startDate < :todayStr) OR (e.status = :ongoingStatus AND e.endDate < :todayStr) )',
          {
            plannedStatuses: [ExhibitionStatus.REQUESTED, ExhibitionStatus.APPROVED],
            ongoingStatus: ExhibitionStatus.ONGOING,
            todayStr
          }
        )
        .getMany();

      if (overdueExhibitions.length === 0) return;

      console.log(`[ExhibitionsService] Found ${overdueExhibitions.length} overdue/expired exhibitions. Updating...`);

      // Find users to notify: assigned user + admins + super admins
      const userRepo = dataSource.getRepository(User);
      const allActiveUsers = await userRepo.createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'userRole')
        .where('user.isActive = :isActive', { isActive: true })
        .getMany();

      const notifyList = allActiveUsers.filter(user => 
        user.roles.some(ur => [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(ur.role as UserRole)) ||
        (user.id && overdueExhibitions.some(ex => ex.assignedUserId === user.id))
      );

      const notifRepo = dataSource.getRepository(Notification);

      for (const exhibition of overdueExhibitions) {
        const isOngoing = exhibition.status === ExhibitionStatus.ONGOING;

        // 1. Update flags without overwriting status so ONGOING exhibitions remain closeable
        if (isOngoing) {
          await exhibitionRepo.update(exhibition.id, { isOverdue: true });
        } else {
          await exhibitionRepo.update(exhibition.id, { isStale: true });
        }

        // 2. Notify users
        for (const user of notifyList) {
          const isAssigned = user.id === exhibition.assignedUserId;
          const isAdmin = user.roles.some(ur => [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(ur.role as UserRole));
          
          if (!isAssigned && !isAdmin) continue;

          const existingNotif = await notifRepo.createQueryBuilder('n')
            .where('n.userId = :userId', { userId: user.id })
            .andWhere('n.title = :title', { title: 'Exhibition Alert' })
            .andWhere('n.message LIKE :msg', { msg: `%${exhibition.id}%` })
            .getOne();

          if (!existingNotif) {
            let message = '';
            if (isAssigned) {
              message = isOngoing
                ? `The exhibition "${exhibition.name}" (ID: ${exhibition.id}) you are assigned to has passed its scheduled end date (${exhibition.endDate}) but is not yet closed. Please reconcile and close the event.`
                : `The exhibition "${exhibition.name}" (ID: ${exhibition.id}) you are assigned to was scheduled to start on ${exhibition.startDate} but was never dispatched. It is now flagged as stale.`;
            } else {
              message = isOngoing
                ? `The exhibition "${exhibition.name}" (ID: ${exhibition.id}) assigned to ${exhibition.assignedUser?.name || 'Unassigned'} has passed its scheduled end date but remains unclosed.`
                : `The exhibition "${exhibition.name}" (ID: ${exhibition.id}) assigned to ${exhibition.assignedUser?.name || 'Unassigned'} was scheduled to start on ${exhibition.startDate} but was never dispatched and is flagged as stale.`;
            }

            await this.notificationsService.createNotification(
              user.id,
              'Exhibition Alert',
              message,
              'EXHIBITION'
            );
          }
        }
      }

      this.notificationsService.triggerRefresh('exhibition_changed');
    } catch (error) {
      console.error('[ExhibitionsService] Failed to check and update overdue exhibitions:', error);
    }
  }

  private async getRepos() {
    const ds = await getDataSource();
    return {
      dataSource: ds,
      exhibitionRepo: ds.getRepository(Exhibition),
    };
  }

  // ── Create exhibition request ─────────────────────────────────────────────────
  async createExhibition(
    dto: CreateExhibitionDto,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<Exhibition> {
    const isAdmin = hasRole(user, UserRole.SUPER_ADMIN) || hasRole(user, UserRole.ADMIN);
    const isBranchManager = hasRole(user, UserRole.BRANCH_MANAGER);
    const isCentralInventory = hasRole(user, UserRole.CENTRAL_INVENTORY_MANAGER);

    if (isCentralInventory && !isAdmin && !isBranchManager) {
      throw new ForbiddenException('Central Inventory Managers cannot create exhibitions. Exhibitions must be requested by Branch Managers or created by Admins.');
    }

    const branchId = dto.sourceBranchId || user.branchId;
    if (!branchId) {
      throw new ForbiddenException('Exhibitions must be requested with a branch context');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Exhibition must contain at least one book item');
    }

    const { dataSource, exhibitionRepo } = await this.getRepos();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const [branch] = await queryRunner.manager.query('SELECT id, name, type FROM branch WHERE id = ?', [branchId]);
      if (!branch) {
        throw new NotFoundException(`Branch with ID ${branchId} not found`);
      }
      const isWarehouse = branch.type === BranchType.WAREHOUSE;

      const isAdmin = hasRole(user, UserRole.SUPER_ADMIN) || hasRole(user, UserRole.ADMIN);
      const initialStatus = isAdmin ? ExhibitionStatus.APPROVED : ExhibitionStatus.REQUESTED;

      const exhibition = exhibitionRepo.create({
        name: dto.name,
        location: dto.location,
        sourceBranchId: branchId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        requestedById: user.userId,
        status: initialStatus,
        approvedById: isAdmin ? user.userId : null,
        assignedUserId: dto.assignedUserId || null,
      } as object);

      const savedExhibition = await queryRunner.manager.getRepository(Exhibition).save(exhibition);

      // Also create assignment row if assignedUserId provided
      if (dto.assignedUserId) {
        const assignment = queryRunner.manager.getRepository(ExhibitionAssignment).create({
          exhibitionId: savedExhibition.id,
          userId: dto.assignedUserId,
          role: ExhibitionAssignmentRole.LEAD,
          assignedById: user.userId,
        });
        await queryRunner.manager.getRepository(ExhibitionAssignment).save(assignment);
      }

      // Create stock entries & stock source rows (reserved, NOT deducted until DISPATCH)
      const stockItems = [];
      for (const item of dto.items) {
        if (!item.quantityTaken || item.quantityTaken <= 0) {
          throw new BadRequestException('Quantity taken must be greater than 0');
        }

        let branchQty = 0;
        let centralQty = 0;
        let splits: Record<string, number> = {};

        if (item.sourceSplits && Object.keys(item.sourceSplits).length > 0) {
          splits = { ...item.sourceSplits };
          centralQty = Number(splits['WAREHOUSE'] || 0);
          branchQty = Object.keys(splits).reduce((acc, k) => k !== 'WAREHOUSE' ? acc + (Number(splits[k]) || 0) : acc, 0);
        } else if (isWarehouse) {
          centralQty = item.quantityTaken;
          branchQty = 0;
          splits = { 'WAREHOUSE': centralQty };
        } else if (item.quantityFromBranch !== undefined && item.quantityFromCentral !== undefined) {
          branchQty = Number(item.quantityFromBranch);
          centralQty = Number(item.quantityFromCentral);
          splits = {
            [`BRANCH_${branchId}`]: branchQty,
            'WAREHOUSE': centralQty,
          };
        } else {
          // Automatic split default
          const [branchInv] = await queryRunner.manager.query(
            'SELECT quantity FROM branch_inventory WHERE branch_id = ? AND book_id = ?',
            [branchId, item.bookId]
          );
          const branchAvailable = branchInv ? Number(branchInv.quantity) : 0;
          branchQty = Math.min(branchAvailable, item.quantityTaken);
          centralQty = item.quantityTaken - branchQty;
          splits = {
            [`BRANCH_${branchId}`]: branchQty,
            'WAREHOUSE': centralQty,
          };
        }

        if (branchQty < 0 || centralQty < 0 || (branchQty + centralQty !== item.quantityTaken)) {
          throw new BadRequestException(`Invalid stock split for book. Total must equal ${item.quantityTaken}`);
        }

        const stockItem = queryRunner.manager.getRepository(ExhibitionStock).create({
          exhibitionId: savedExhibition.id,
          bookId: item.bookId,
          quantityTaken: item.quantityTaken,
          quantityTopUp: 0,
          quantityFromBranch: branchQty,
          quantityFromCentral: centralQty,
          sourceSplits: splits,
          quantitySold: 0,
          quantityReturned: 0,
          quantityDamaged: 0,
          quantityLost: 0,
          quantityCredit: 0,
        });
        const savedStockItem = await queryRunner.manager.getRepository(ExhibitionStock).save(stockItem);
        stockItems.push(savedStockItem);

        // Save exhibition_stock_source records
        for (const [sKey, sQty] of Object.entries(splits)) {
          const qty = Number(sQty) || 0;
          if (qty <= 0) continue;
          const isW = sKey === 'WAREHOUSE';
          const srcBranchId = isW ? null : sKey.replace('BRANCH_', '');
          const stockSource = queryRunner.manager.getRepository(ExhibitionStockSource).create({
            exhibitionStockId: savedStockItem.id,
            sourceType: isW ? StockSourceType.WAREHOUSE : StockSourceType.BRANCH,
            sourceBranchId: srcBranchId,
            quantityTaken: qty,
            quantityReturned: 0,
          });
          await queryRunner.manager.getRepository(ExhibitionStockSource).save(stockSource);
        }
      }

      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,NULL,?,?,DEFAULT)',
        [user.userId, isAdmin ? 'EXHIBITION_CREATED' : 'EXHIBITION_REQUESTED', 'Exhibition', savedExhibition.id, JSON.stringify(savedExhibition), ipAddress],
      );

      await queryRunner.commitTransaction();
      this.notificationsService.triggerRefresh('exhibition_changed');
      this.notificationsService.triggerRefresh('stock_changed');
      this.notificationsService.triggerRefresh('inventory_changed');
      
      // Notify assigned staff member on creation
      if (dto.assignedUserId) {
        await this.notificationsService.createNotification(
          dto.assignedUserId,
          'Exhibition Assigned',
          `You have been assigned to oversee the exhibition "${dto.name}".`,
          'EXHIBITION'
        );
      }
      
      await this.notificationsService.notifyRoles(
        [UserRole.SUPER_ADMIN, UserRole.ADMIN],
        null,
        isAdmin ? 'New Exhibition Created' : 'New Exhibition Request',
        `A new exhibition "${dto.name}" has been ${isAdmin ? 'created and stock checked out' : 'requested'}.`,
        'EXHIBITION'
      );

      return this.findOne(savedExhibition.id, user);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Update exhibition ─────────────────────────────────────────────────────────
  async updateExhibition(
    id: string,
    dto: UpdateExhibitionDto,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<Exhibition> {
    const { exhibitionRepo } = await this.getRepos();
    const exhibition = await this.findOne(id, user);

    // Permission checks
    const isAdmin = hasRole(user, UserRole.SUPER_ADMIN) || hasRole(user, UserRole.ADMIN);
    const isCentralManager = hasRole(user, UserRole.CENTRAL_INVENTORY_MANAGER);
    const isCreator = exhibition.requestedById === user.userId;
    const isAssigned = exhibition.assignedUserId === user.userId;
    const isBranchManager = hasRole(user, UserRole.BRANCH_MANAGER) && user.branchId === exhibition.sourceBranchId;

    if (!isAdmin && !isCentralManager && !isCreator && !isAssigned && !isBranchManager) {
      throw new ForbiddenException('You do not have permission to update this exhibition');
    }

    if (exhibition.status === ExhibitionStatus.CLOSED || exhibition.status === ExhibitionStatus.REJECTED) {
      throw new ConflictException(`Cannot update an exhibition in ${exhibition.status} status`);
    }

    const updates: Partial<Exhibition> = {};

    // Restore status back to APPROVED (for EXPIRED) or ONGOING (for OVERDUE) if dates are moved to the future
    if (exhibition.status === ExhibitionStatus.EXPIRED || exhibition.status === ExhibitionStatus.OVERDUE) {
      const newStartDate = dto.startDate ? new Date(dto.startDate) : exhibition.startDate;
      const newEndDate = dto.endDate ? new Date(dto.endDate) : exhibition.endDate;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (exhibition.status === ExhibitionStatus.EXPIRED && newStartDate >= today) {
        updates.status = ExhibitionStatus.APPROVED;
      } else if (exhibition.status === ExhibitionStatus.OVERDUE && newEndDate >= today) {
        updates.status = ExhibitionStatus.ONGOING;
      }
    }

    // Creators/Admins/Assigned staff can update details if not closed
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.location !== undefined) updates.location = dto.location;
    if (dto.startDate !== undefined) updates.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updates.endDate = new Date(dto.endDate);

    // Only Admins can assign users
    if (dto.assignedUserId !== undefined) {
      if (!isAdmin) {
        throw new ForbiddenException('Only administrators can assign users to an exhibition');
      }
      updates.assignedUserId = dto.assignedUserId;
    }

    const hasItemUpdates = Array.isArray(dto.items);

    if (Object.keys(updates).length === 0 && !hasItemUpdates) {
      return exhibition;
    }

    const { dataSource } = await this.getRepos();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (Object.keys(updates).length > 0) {
        await queryRunner.manager.getRepository(Exhibition).update({ id }, updates);
      }

      // Reconcile and adjust stock items if dto.items was provided
      if (hasItemUpdates && dto.items) {
        if (dto.items.length === 0) {
          throw new BadRequestException('Exhibition must contain at least one book item');
        }

        const [branch] = await queryRunner.manager.query(
          'SELECT id, name, type FROM branch WHERE id = ?',
          [exhibition.sourceBranchId]
        );
        const isWarehouse = branch?.type === BranchType.WAREHOUSE;
        const isOngoingOrApproved = exhibition.status === ExhibitionStatus.ONGOING || exhibition.status === ExhibitionStatus.APPROVED;

        const currentStocks = await queryRunner.manager.find(ExhibitionStock, {
          where: { exhibitionId: id },
        });

        const currentStockMap = new Map(currentStocks.map(s => [s.bookId, s]));
        const newStockMap = new Map(dto.items.map((i: any) => [i.bookId, i]));

        // 1. Removed books: return all previously deducted copies to shelf/warehouse (if exhibition is active/ongoing)
        for (const existing of currentStocks) {
          if (!newStockMap.has(existing.bookId)) {
            if (existing.quantitySold > 0) {
              throw new BadRequestException(
                `Cannot remove book with already recorded sales (${existing.quantitySold} copies sold)`
              );
            }

            if (isOngoingOrApproved) {
              const oldSplits: Record<string, number> = (existing.sourceSplits && typeof existing.sourceSplits === 'object')
                ? existing.sourceSplits
                : {
                    [`BRANCH_${exhibition.sourceBranchId}`]: Number(existing.quantityFromBranch || 0),
                    'WAREHOUSE': Number(existing.quantityFromCentral || 0),
                  };

              for (const [sKey, sQty] of Object.entries(oldSplits)) {
                const qty = Number(sQty) || 0;
                if (qty <= 0) continue;
                if (sKey === 'WAREHOUSE') {
                  await incrementCentralStock(queryRunner, existing.bookId, qty);
                  await writeStockMovement(queryRunner, {
                    bookId: existing.bookId,
                    branchId: null,
                    type: 'EXHIBITION_RETURN',
                    quantity: qty,
                    performedById: user.userId,
                    referenceType: 'EXHIBITION',
                    referenceId: id,
                    note: `Book removed from exhibition: returned to central warehouse`,
                  });
                } else if (sKey.startsWith('BRANCH_')) {
                  const bId = sKey.replace('BRANCH_', '');
                  await incrementBranchStock(queryRunner, bId, existing.bookId, qty);
                  await writeStockMovement(queryRunner, {
                    bookId: existing.bookId,
                    branchId: bId,
                    type: 'EXHIBITION_RETURN',
                    quantity: qty,
                    performedById: user.userId,
                    referenceType: 'EXHIBITION',
                    referenceId: id,
                    note: `Book removed from exhibition: returned to branch shelf`,
                  });
                }
              }
            }

            await queryRunner.manager.delete(ExhibitionStock, { id: existing.id });
          }
        }

        // 2. Added or Updated books
        for (const item of dto.items) {
          if (!item.quantityTaken || item.quantityTaken <= 0) {
            throw new BadRequestException('Quantity taken must be greater than 0');
          }

          const existing = currentStockMap.get(item.bookId);
          if (existing && item.quantityTaken < (existing.quantitySold || 0)) {
            throw new BadRequestException(
              `Quantity cannot be less than already sold quantity (${existing.quantitySold} copies sold)`
            );
          }

          let newSplits: Record<string, number> = {};
          if (item.sourceSplits && Object.keys(item.sourceSplits).length > 0) {
            newSplits = { ...item.sourceSplits };
          } else if (isWarehouse) {
            newSplits = { WAREHOUSE: item.quantityTaken };
          } else if (item.quantityFromBranch !== undefined && item.quantityFromCentral !== undefined) {
            newSplits = {
              [`BRANCH_${exhibition.sourceBranchId}`]: Number(item.quantityFromBranch),
              WAREHOUSE: Number(item.quantityFromCentral),
            };
          } else {
            const [bInv] = await queryRunner.manager.query(
              'SELECT quantity FROM branch_inventory WHERE branch_id = ? AND book_id = ?',
              [exhibition.sourceBranchId, item.bookId]
            );
            const bAvail = bInv ? Number(bInv.quantity) : 0;
            const bQty = Math.min(bAvail, item.quantityTaken);
            newSplits = {
              [`BRANCH_${exhibition.sourceBranchId}`]: bQty,
              WAREHOUSE: item.quantityTaken - bQty,
            };
          }

          const centralQty = Number(newSplits['WAREHOUSE'] || 0);
          let branchQty = 0;
          for (const k of Object.keys(newSplits)) {
            if (k !== 'WAREHOUSE') branchQty += Number(newSplits[k] || 0);
          }

          if (branchQty + centralQty !== item.quantityTaken) {
            throw new BadRequestException(`Invalid split for book. Total must equal ${item.quantityTaken}`);
          }

          // If exhibition is active/ongoing, reconcile deltas between old and new splits
          if (isOngoingOrApproved) {
            const oldSplits: Record<string, number> = (existing && existing.sourceSplits && typeof existing.sourceSplits === 'object')
              ? existing.sourceSplits
              : (existing ? {
                  [`BRANCH_${exhibition.sourceBranchId}`]: Number(existing.quantityFromBranch || 0),
                  'WAREHOUSE': Number(existing.quantityFromCentral || 0),
                } : {});

            const allKeys = new Set([...Object.keys(oldSplits), ...Object.keys(newSplits)]);
            for (const sKey of allKeys) {
              const oldVal = Number(oldSplits[sKey] || 0);
              const newVal = Number(newSplits[sKey] || 0);
              const delta = newVal - oldVal;

              if (delta > 0) {
                // Deduct additional stock
                if (sKey === 'WAREHOUSE') {
                  const [cInv] = await queryRunner.manager.query(
                    'SELECT quantity FROM central_stock WHERE book_id = ?',
                    [item.bookId]
                  );
                  const cAvail = cInv ? Number(cInv.quantity) : 0;
                  if (delta > cAvail) {
                    throw new BadRequestException(
                      `Warehouse only has ${cAvail} copies available (needed ${delta})`
                    );
                  }
                  await decrementCentralStock(queryRunner, item.bookId, delta);
                  await writeStockMovement(queryRunner, {
                    bookId: item.bookId,
                    branchId: null,
                    type: 'EXHIBITION_OUT',
                    quantity: -delta,
                    performedById: user.userId,
                    referenceType: 'EXHIBITION',
                    referenceId: id,
                    note: `Increased stock for exhibition from central warehouse`,
                  });
                } else if (sKey.startsWith('BRANCH_')) {
                  const bId = sKey.replace('BRANCH_', '');
                  const [bInv] = await queryRunner.manager.query(
                    'SELECT quantity FROM branch_inventory WHERE branch_id = ? AND book_id = ?',
                    [bId, item.bookId]
                  );
                  const bAvail = bInv ? Number(bInv.quantity) : 0;
                  if (delta > bAvail) {
                    const [bInfo] = await queryRunner.manager.query('SELECT name FROM branch WHERE id = ?', [bId]);
                    const bName = bInfo?.name || 'Branch';
                    throw new BadRequestException(
                      `${bName} shelf only has ${bAvail} copies available (needed ${delta})`
                    );
                  }
                  await decrementBranchStock(queryRunner, bId, item.bookId, delta);
                  await writeStockMovement(queryRunner, {
                    bookId: item.bookId,
                    branchId: bId,
                    type: 'EXHIBITION_OUT',
                    quantity: -delta,
                    performedById: user.userId,
                    referenceType: 'EXHIBITION',
                    referenceId: id,
                    note: `Increased stock for exhibition from branch shelf`,
                  });
                }
              } else if (delta < 0) {
                // Return stock
                const retQty = Math.abs(delta);
                if (sKey === 'WAREHOUSE') {
                  await incrementCentralStock(queryRunner, item.bookId, retQty);
                  await writeStockMovement(queryRunner, {
                    bookId: item.bookId,
                    branchId: null,
                    type: 'EXHIBITION_RETURN',
                    quantity: retQty,
                    performedById: user.userId,
                    referenceType: 'EXHIBITION',
                    referenceId: id,
                    note: `Reduced stock from exhibition: returned to central warehouse`,
                  });
                } else if (sKey.startsWith('BRANCH_')) {
                  const bId = sKey.replace('BRANCH_', '');
                  await incrementBranchStock(queryRunner, bId, item.bookId, retQty);
                  await writeStockMovement(queryRunner, {
                    bookId: item.bookId,
                    branchId: bId,
                    type: 'EXHIBITION_RETURN',
                    quantity: retQty,
                    performedById: user.userId,
                    referenceType: 'EXHIBITION',
                    referenceId: id,
                    note: `Reduced stock from exhibition: returned to branch shelf`,
                  });
                }
              }
            }
          }

          if (!existing) {
            const newStockEntry = queryRunner.manager.create(ExhibitionStock, {
              exhibitionId: id,
              bookId: item.bookId,
              quantityTaken: item.quantityTaken,
              quantityFromBranch: branchQty,
              quantityFromCentral: centralQty,
              sourceSplits: newSplits,
              quantitySold: 0,
              quantityReturned: 0,
              quantityDamaged: 0,
              quantityLost: 0,
              quantityCredit: 0,
            });
            await queryRunner.manager.save(newStockEntry);
          } else {
            await queryRunner.manager.update(ExhibitionStock, { id: existing.id }, {
              quantityTaken: item.quantityTaken,
              quantityFromBranch: branchQty,
              quantityFromCentral: centralQty,
              sourceSplits: newSplits,
            });
          }
        }
      }

      const updatedExhibition = await queryRunner.manager.getRepository(Exhibition).findOne({ where: { id } });

      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,?,?,?,DEFAULT)',
        [user.userId, 'EXHIBITION_UPDATED', 'Exhibition', id, JSON.stringify(exhibition), JSON.stringify(updatedExhibition), ipAddress],
      );

      await queryRunner.commitTransaction();
      this.notificationsService.triggerRefresh('exhibition_changed');
      this.notificationsService.triggerRefresh('stock_changed');
      this.notificationsService.triggerRefresh('inventory_changed');

      const previousAssignedUserId = exhibition.assignedUserId;
      const newAssignedUserId = updates.assignedUserId;

      if (newAssignedUserId !== undefined && newAssignedUserId !== previousAssignedUserId) {
        if (previousAssignedUserId) {
          await this.notificationsService.createNotification(
            previousAssignedUserId,
            'Exhibition Unassigned',
            `You are no longer assigned to oversee the exhibition "${exhibition.name}".`,
            'EXHIBITION'
          );
        }
        if (newAssignedUserId) {
          await this.notificationsService.createNotification(
            newAssignedUserId,
            'Exhibition Assigned',
            `You have been assigned to oversee the exhibition "${exhibition.name}".`,
            'EXHIBITION'
          );
        }
      } else {
        // Notify the currently assigned user if details (not assignment) changed
        const detailsChanged = (
          (dto.name !== undefined && dto.name !== exhibition.name) ||
          (dto.location !== undefined && dto.location !== exhibition.location) ||
          (dto.startDate !== undefined && new Date(dto.startDate).toISOString() !== new Date(exhibition.startDate).toISOString()) ||
          (dto.endDate !== undefined && new Date(dto.endDate).toISOString() !== new Date(exhibition.endDate).toISOString())
        );

        const assignedUserId = previousAssignedUserId;
        if (detailsChanged && assignedUserId) {
          // Build a human-readable summary of what changed
          const changes: string[] = [];
          if (dto.name !== undefined && dto.name !== exhibition.name) changes.push(`name to "${dto.name}"`);
          if (dto.location !== undefined && dto.location !== exhibition.location) changes.push(`location to "${dto.location}"`);
          if (dto.startDate !== undefined && new Date(dto.startDate).toISOString() !== new Date(exhibition.startDate).toISOString()) {
            changes.push(`start date to ${new Date(dto.startDate).toLocaleDateString()}`);
          }
          if (dto.endDate !== undefined && new Date(dto.endDate).toISOString() !== new Date(exhibition.endDate).toISOString()) {
            changes.push(`end date to ${new Date(dto.endDate).toLocaleDateString()}`);
          }
          const changeSummary = changes.join(', ');
          await this.notificationsService.createNotification(
            assignedUserId,
            'Exhibition Updated',
            `The exhibition "${exhibition.name}" you are assigned to has been updated: ${changeSummary}.`,
            'EXHIBITION'
          );
        }
      }

      return this.findOne(id, user);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── List exhibitions ─────────────────────────────────────────────────────────
  async findAll(user: JwtPayload): Promise<Exhibition[]> {
    await this.checkAndUpdateOverdueExhibitions();
    const { exhibitionRepo } = await this.getRepos();
    const qb = exhibitionRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.sourceBranch', 'branch')
      .leftJoinAndSelect('e.requestedBy', 'reqBy')
      .leftJoinAndSelect('e.stock', 'stock')
      .leftJoinAndSelect('stock.book', 'book')
      .leftJoinAndSelect('e.assignedUser', 'assignedUser')
      .orderBy('e.createdAt', 'DESC');

    // Super admins, admins, and central inventory managers see everything. Branch roles only see their own branch's OR ones they are assigned to.
    if (!hasRole(user, UserRole.SUPER_ADMIN) && !hasRole(user, UserRole.ADMIN) && !hasRole(user, UserRole.CENTRAL_INVENTORY_MANAGER)) {
      if (
        hasRole(user, UserRole.BRANCH_MANAGER) ||
        hasRole(user, UserRole.BRANCH_INVENTORY) ||
        hasRole(user, UserRole.BRANCH_FRONT_OFFICE)
      ) {
        qb.where('e.source_branch_id = :branchId OR e.assigned_user_id = :userId', { 
          branchId: user.branchId,
          userId: user.userId 
        });
      }
    }

    return qb.getMany();
  }

  // ── Find one ──────────────────────────────────────────────────────────────────
  async findOne(id: string, user: JwtPayload): Promise<Exhibition> {
    await this.checkAndUpdateOverdueExhibitions();
    const { exhibitionRepo } = await this.getRepos();
    const exhibition = await exhibitionRepo.findOne({
      where: { id },
      relations: ['sourceBranch', 'requestedBy', 'approvedBy', 'assignedUser', 'stock', 'stock.book'],
    });

    if (!exhibition) throw new NotFoundException(`Exhibition ${id} not found`);

    // Branch-scoped boundary
    if (!hasRole(user, UserRole.SUPER_ADMIN) && !hasRole(user, UserRole.ADMIN) && !hasRole(user, UserRole.CENTRAL_INVENTORY_MANAGER)) {
      if (
        hasRole(user, UserRole.BRANCH_MANAGER) ||
        hasRole(user, UserRole.BRANCH_INVENTORY) ||
        hasRole(user, UserRole.BRANCH_FRONT_OFFICE)
      ) {
        if (exhibition.sourceBranchId !== user.branchId && exhibition.assignedUserId !== user.userId) {
          throw new ForbiddenException('Access restricted to your branch exhibitions');
        }
      }
    }

    return exhibition;
  }

  // ── Approve exhibition ────────────────────────────────────────────────────────
  async approveExhibition(
    id: string,
    dto: ReviewExhibitionDto,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<Exhibition> {
    const { exhibitionRepo, dataSource } = await this.getRepos();
    const exhibition = await this.findOne(id, user);

    if (exhibition.status !== ExhibitionStatus.REQUESTED && !exhibition.isStale && exhibition.status !== ExhibitionStatus.DRAFT) {
      throw new ConflictException(`Cannot approve exhibition in status ${exhibition.status}`);
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Approval reserves stock without deducting from physical shelf until physical DISPATCH
      await queryRunner.manager.getRepository(Exhibition).update(id, {
        status: ExhibitionStatus.APPROVED,
        isStale: false,
        approvedById: user.userId,
      });

      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,?,?,?,DEFAULT)',
        [user.userId, 'EXHIBITION_APPROVED', 'Exhibition', id, JSON.stringify({ status: exhibition.status }), JSON.stringify({ status: 'APPROVED', note: dto.note }), ipAddress],
      );

      await queryRunner.commitTransaction();

      this.notificationsService.triggerRefresh('exhibition_changed');

      await this.notificationsService.notifyRoles(
        [UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY],
        exhibition.sourceBranchId,
        'Exhibition Approved',
        `Your exhibition request "${exhibition.name}" has been approved and is ready for dispatch!`,
        'EXHIBITION'
      );

      return this.findOne(id, user);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Reject exhibition ─────────────────────────────────────────────────────────
  async rejectExhibition(
    id: string,
    dto: ReviewExhibitionDto,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<Exhibition> {
    const { dataSource } = await this.getRepos();
    const exhibition = await this.findOne(id, user);

    if (
      exhibition.status !== ExhibitionStatus.REQUESTED &&
      exhibition.status !== ExhibitionStatus.APPROVED &&
      exhibition.status !== ExhibitionStatus.DISPATCHED &&
      exhibition.status !== ExhibitionStatus.ONGOING
    ) {
      throw new ConflictException(`Cannot reject exhibition in status ${exhibition.status}`);
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const isWarehouse = exhibition.sourceBranch?.type === BranchType.WAREHOUSE;

      // Restore physical stock ONLY if exhibition was already DISPATCHED / ONGOING
      if (exhibition.status === ExhibitionStatus.ONGOING || exhibition.status === ExhibitionStatus.DISPATCHED) {
        if (exhibition.stock && exhibition.stock.length > 0) {
          for (const stockItem of exhibition.stock) {
            let splits: Record<string, number> = {};
            if (stockItem.sourceSplits && typeof stockItem.sourceSplits === 'object' && Object.keys(stockItem.sourceSplits).length > 0) {
              splits = stockItem.sourceSplits;
            } else if (isWarehouse) {
              splits = { WAREHOUSE: stockItem.quantityTaken };
            } else {
              splits = {
                [`BRANCH_${exhibition.sourceBranchId}`]: Number(stockItem.quantityFromBranch || 0),
                WAREHOUSE: Number(stockItem.quantityFromCentral || 0),
              };
            }

            for (const [sKey, sQty] of Object.entries(splits)) {
              const qty = Number(sQty) || 0;
              if (qty <= 0) continue;

              if (sKey === 'WAREHOUSE') {
                await incrementCentralStock(queryRunner, stockItem.bookId, qty);
                await writeStockMovement(queryRunner, {
                  bookId: stockItem.bookId,
                  branchId: null,
                  type: 'EXHIBITION_RETURN',
                  quantity: qty,
                  performedById: user.userId,
                  referenceType: 'EXHIBITION',
                  referenceId: id,
                  note: `Exhibition rejected/cancelled: central warehouse stock restored`,
                });
              } else if (sKey.startsWith('BRANCH_')) {
                const bId = sKey.replace('BRANCH_', '');
                await incrementBranchStock(queryRunner, bId, stockItem.bookId, qty);
                await writeStockMovement(queryRunner, {
                  bookId: stockItem.bookId,
                  branchId: bId,
                  type: 'EXHIBITION_RETURN',
                  quantity: qty,
                  performedById: user.userId,
                  referenceType: 'EXHIBITION',
                  referenceId: id,
                  note: `Exhibition rejected/cancelled: branch shelf stock restored`,
                });
              }
            }
          }
        }
      }

      await queryRunner.manager.getRepository(Exhibition).update(id, { 
        status: ExhibitionStatus.REJECTED,
        rejectionReason: dto.note || null,
      });

      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,?,?,?,DEFAULT)',
        [user.userId, 'EXHIBITION_REJECTED', 'Exhibition', id, JSON.stringify({ status: exhibition.status }), JSON.stringify({ status: 'REJECTED', note: dto.note }), ipAddress],
      );

      await queryRunner.commitTransaction();

      this.notificationsService.triggerRefresh('exhibition_changed');
      this.notificationsService.triggerRefresh('stock_changed');
      this.notificationsService.triggerRefresh('inventory_changed');

      await this.notificationsService.notifyRoles(
        [UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY],
        exhibition.sourceBranchId,
        'Exhibition Rejected',
        `Your exhibition request "${exhibition.name}" has been rejected. Note: ${dto.note || 'No reason given'}`,
        'EXHIBITION'
      );

      return this.findOne(id, user);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Dispatch — Pre-flight checks + atomic stock deduction ───────────────────
  async dispatchExhibition(
    id: string,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<Exhibition> {
    const { dataSource } = await this.getRepos();
    const exhibition = await this.findOne(id, user);

    if (exhibition.status !== ExhibitionStatus.APPROVED && !exhibition.isStale) {
      throw new ConflictException(`Cannot dispatch exhibition in status ${exhibition.status}. Must be APPROVED first.`);
    }

    // Role verification
    if (exhibition.sourceBranch?.type === BranchType.WAREHOUSE) {
      const isCentralManager = hasRole(user, UserRole.CENTRAL_INVENTORY_MANAGER) ||
                               hasRole(user, UserRole.SUPER_ADMIN) ||
                               hasRole(user, UserRole.ADMIN);
      if (!isCentralManager) {
        throw new ForbiddenException('Only Central Warehouse Manager or Administrator can dispatch from Central Warehouse');
      }
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ── PRE-FLIGHT CHECKLIST (§4) ──────────────────────────────────────────
      // 1. Date checks
      const startDateObj = new Date(exhibition.startDate);
      const endDateObj = new Date(exhibition.endDate);
      startDateObj.setHours(0, 0, 0, 0);
      endDateObj.setHours(23, 59, 59, 999);
      if (endDateObj < startDateObj) {
        throw new BadRequestException('Pre-flight check failed: End date cannot be before start date');
      }

      // 2. Check at least one LEAD is assigned
      const assignments = await queryRunner.manager.getRepository(ExhibitionAssignment).find({
        where: { exhibitionId: id },
      });
      const hasLead = assignments.some(a => a.role === ExhibitionAssignmentRole.LEAD) || !!exhibition.assignedUserId;
      if (!hasLead) {
        throw new BadRequestException('Pre-flight check failed: At least one LEAD staff member must be assigned to the exhibition before dispatch.');
      }

      // 3. Check stock availability for every book at its named source
      if (!exhibition.stock || exhibition.stock.length === 0) {
        throw new BadRequestException('Pre-flight check failed: Exhibition must have at least one book item.');
      }

      for (const stockItem of exhibition.stock) {
        const sources = await queryRunner.manager.getRepository(ExhibitionStockSource).find({
          where: { exhibitionStockId: stockItem.id },
        });

        const splits = (sources.length > 0)
          ? sources.reduce((acc, s) => ({
              ...acc,
              [s.sourceType === StockSourceType.WAREHOUSE ? 'WAREHOUSE' : `BRANCH_${s.sourceBranchId}`]: s.quantityTaken
            }), {} as Record<string, number>)
          : (stockItem.sourceSplits || { [`BRANCH_${exhibition.sourceBranchId}`]: stockItem.quantityTaken });

        for (const [sKey, sQty] of Object.entries(splits)) {
          const qty = Number(sQty) || 0;
          if (qty <= 0) continue;

          if (sKey === 'WAREHOUSE') {
            const [cInv] = await queryRunner.manager.query(
              'SELECT quantity FROM central_stock WHERE book_id = ?',
              [stockItem.bookId]
            );
            const cAvail = cInv ? Number(cInv.quantity) : 0;
            if (qty > cAvail) {
              throw new ConflictException(
                `INSUFFICIENT_STOCK: Central Warehouse shelf only has ${cAvail} copies of "${stockItem.book?.title || 'Book'}" available (needed ${qty})`
              );
            }
          } else if (sKey.startsWith('BRANCH_')) {
            const bId = sKey.replace('BRANCH_', '');
            const [bInv] = await queryRunner.manager.query(
              'SELECT quantity FROM branch_inventory WHERE branch_id = ? AND book_id = ?',
              [bId, stockItem.bookId]
            );
            const bAvail = bInv ? Number(bInv.quantity) : 0;
            if (qty > bAvail) {
              const [bInfo] = await queryRunner.manager.query('SELECT name FROM branch WHERE id = ?', [bId]);
              const bName = bInfo?.name || 'Branch';
              throw new ConflictException(
                `INSUFFICIENT_STOCK: ${bName} shelf only has ${bAvail} copies of "${stockItem.book?.title || 'Book'}" available (needed ${qty})`
              );
            }
          }
        }
      }

      // ── EXECUTE ATOMIC STOCK DEDUCTION AT DISPATCH ──────────────────────────
      for (const stockItem of exhibition.stock) {
        const sources = await queryRunner.manager.getRepository(ExhibitionStockSource).find({
          where: { exhibitionStockId: stockItem.id },
        });

        const splits = (sources.length > 0)
          ? sources.reduce((acc, s) => ({
              ...acc,
              [s.sourceType === StockSourceType.WAREHOUSE ? 'WAREHOUSE' : `BRANCH_${s.sourceBranchId}`]: s.quantityTaken
            }), {} as Record<string, number>)
          : (stockItem.sourceSplits || { [`BRANCH_${exhibition.sourceBranchId}`]: stockItem.quantityTaken });

        for (const [sKey, sQty] of Object.entries(splits)) {
          const qty = Number(sQty) || 0;
          if (qty <= 0) continue;

          if (sKey === 'WAREHOUSE') {
            await decrementCentralStock(queryRunner, stockItem.bookId, qty);
            await writeStockMovement(queryRunner, {
              bookId: stockItem.bookId,
              branchId: null,
              type: 'EXHIBITION_OUT',
              quantity: -qty,
              performedById: user.userId,
              referenceType: 'EXHIBITION',
              referenceId: id,
              note: `Dispatched from Central Warehouse for exhibition: ${exhibition.name}`,
            });
          } else if (sKey.startsWith('BRANCH_')) {
            const bId = sKey.replace('BRANCH_', '');
            await decrementBranchStock(queryRunner, bId, stockItem.bookId, qty);
            await writeStockMovement(queryRunner, {
              bookId: stockItem.bookId,
              branchId: bId,
              type: 'EXHIBITION_OUT',
              quantity: -qty,
              performedById: user.userId,
              referenceType: 'EXHIBITION',
              referenceId: id,
              note: `Dispatched from branch shelf for exhibition: ${exhibition.name}`,
            });
          }
        }
      }

      await queryRunner.manager.getRepository(Exhibition).update({ id }, {
        status: ExhibitionStatus.ONGOING,
        isStale: false,
      });

      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,?,?,?,DEFAULT)',
        [user.userId, 'EXHIBITION_DISPATCHED', 'Exhibition', id, null, JSON.stringify({ status: 'ONGOING' }), ipAddress],
      );

      await queryRunner.commitTransaction();
      this.notificationsService.triggerRefresh('exhibition_changed');
      this.notificationsService.triggerRefresh('stock_changed');
      this.notificationsService.triggerRefresh('inventory_changed');
      return this.findOne(id, user);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Close — reconcile quantities, return unsold stock ─────────────────────────
  async closeExhibition(
    id: string,
    dto: CloseExhibitionDto,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<Exhibition> {
    const { dataSource } = await this.getRepos();
    const exhibition = await this.findOne(id, user);

    if (exhibition.status !== ExhibitionStatus.ONGOING && exhibition.status !== ExhibitionStatus.OVERDUE) {
      throw new ConflictException(`Cannot close exhibition in status ${exhibition.status}`);
    }

    // Pre-flight check 1: No open stock requests
    const openRequests = await dataSource.getRepository(ExhibitionStockRequest).find({
      where: { exhibitionId: id },
    });
    const hasOpenRequests = openRequests.some((r) =>
      ['PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'DISPATCHED'].includes(r.status),
    );
    if (hasOpenRequests) {
      throw new ConflictException('Cannot close exhibition with open stock top-up requests. Please resolve or cancel them first.');
    }

    // Validate identity per line item
    for (const closeItem of dto.items) {
      const stockItem = exhibition.stock.find((s) => s.id === closeItem.stockId);
      if (!stockItem) {
        throw new NotFoundException(`Stock line ${closeItem.stockId} not found in exhibition`);
      }

      const totalAvailable = Number(stockItem.quantityTaken || 0) + Number(stockItem.quantityTopUp || 0);
      const soldQty = stockItem.quantitySold;
      const creditQty = stockItem.quantityCredit;

      const totalReconciled =
        soldQty +
        creditQty +
        Number(closeItem.quantityReturned || 0) +
        Number(closeItem.quantityDamaged || 0) +
        Number(closeItem.quantityLost || 0);

      if (totalReconciled !== totalAvailable) {
        throw new BadRequestException(
          `Reconciliation failed for book ${stockItem.bookId}: available(${totalAvailable}) != ` +
            `sold(${soldQty}) + credit(${creditQty}) + returned(${closeItem.quantityReturned}) + ` +
            `damaged(${closeItem.quantityDamaged}) + lost(${closeItem.quantityLost}) = ${totalReconciled}`,
        );
      }
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sourceRepo = queryRunner.manager.getRepository(ExhibitionStockSource);

      for (const closeItem of dto.items) {
        const stockItem = exhibition.stock.find((s) => s.id === closeItem.stockId)!;
        const qtyReturned = Number(closeItem.quantityReturned || 0);
        const qtyDamaged = Number(closeItem.quantityDamaged || 0);
        const qtyLost = Number(closeItem.quantityLost || 0);

        // Update exhibition stock line with returns, damaged, lost
        await queryRunner.manager.getRepository(ExhibitionStock).update({ id: closeItem.stockId }, {
          quantityReturned: qtyReturned,
          quantityDamaged: qtyDamaged,
          quantityLost: qtyLost,
        });

        // Proportional stock return to sources (§3 & §6)
        if (qtyReturned > 0) {
          const sources = await sourceRepo.find({
            where: { exhibitionStockId: stockItem.id },
          });

          if (sources.length > 0) {
            const totalSourceQty = sources.reduce((sum, s) => sum + Number(s.quantityTaken || 0), 0);
            let remainingToReturn = qtyReturned;

            for (let i = 0; i < sources.length; i++) {
              const src = sources[i];
              let srcReturnQty = 0;

              if (i === sources.length - 1) {
                srcReturnQty = remainingToReturn;
              } else {
                srcReturnQty = Math.round((Number(src.quantityTaken || 0) / (totalSourceQty || 1)) * qtyReturned);
                remainingToReturn -= srcReturnQty;
              }

              if (srcReturnQty > 0) {
                if (src.sourceType === StockSourceType.WAREHOUSE) {
                  await incrementCentralStock(queryRunner, stockItem.bookId, srcReturnQty);
                } else if (src.sourceBranchId) {
                  await incrementBranchStock(queryRunner, src.sourceBranchId, stockItem.bookId, srcReturnQty);
                }

                await writeStockMovement(queryRunner, {
                  bookId: stockItem.bookId,
                  branchId: src.sourceBranchId || null,
                  type: 'EXHIBITION_RETURN',
                  quantity: srcReturnQty,
                  performedById: user.userId,
                  referenceType: 'EXHIBITION',
                  referenceId: id,
                  note: `Returned to ${src.sourceType === StockSourceType.WAREHOUSE ? 'Central Warehouse' : 'Branch'} after close`,
                });
              }
            }
          } else {
            // Fallback: return to source branch
            const isWarehouse = exhibition.sourceBranch?.type === BranchType.WAREHOUSE;
            if (isWarehouse) {
              await incrementCentralStock(queryRunner, stockItem.bookId, qtyReturned);
            } else {
              await incrementBranchStock(queryRunner, exhibition.sourceBranchId, stockItem.bookId, qtyReturned);
            }

            await writeStockMovement(queryRunner, {
              bookId: stockItem.bookId,
              branchId: exhibition.sourceBranchId,
              type: 'EXHIBITION_RETURN',
              quantity: qtyReturned,
              performedById: user.userId,
              referenceType: 'EXHIBITION',
              referenceId: id,
              note: `Returned after close`,
            });
          }
        }

        // Log damaged stock
        if (qtyDamaged > 0) {
          await writeStockMovement(queryRunner, {
            bookId: stockItem.bookId,
            branchId: exhibition.sourceBranchId,
            type: 'ADJUSTMENT',
            quantity: -qtyDamaged,
            performedById: user.userId,
            referenceType: 'EXHIBITION',
            referenceId: id,
            reason: 'DAMAGED',
            note: `Damaged at exhibition close`,
          });
        }

        // Log lost stock
        if (qtyLost > 0) {
          await writeStockMovement(queryRunner, {
            bookId: stockItem.bookId,
            branchId: exhibition.sourceBranchId,
            type: 'ADJUSTMENT',
            quantity: -qtyLost,
            performedById: user.userId,
            referenceType: 'EXHIBITION',
            referenceId: id,
            reason: 'LOST',
            note: `Lost at exhibition close`,
          });
        }
      }

      await queryRunner.manager.getRepository(Exhibition).update({ id }, { status: ExhibitionStatus.CLOSED });

      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,?,?,?,DEFAULT)',
        [user.userId, 'EXHIBITION_CLOSED', 'Exhibition', id, JSON.stringify({ status: exhibition.status }), JSON.stringify({ status: 'CLOSED' }), ipAddress],
      );

      await queryRunner.commitTransaction();
      this.notificationsService.triggerRefresh('exhibition_changed');
      this.notificationsService.triggerRefresh('stock_changed');
      return this.findOne(id, user);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getExhibitionHistory(id: string, user: JwtPayload): Promise<any> {
    const exhibition = await this.findOne(id, user);
    const ds = await getDataSource();

    // Find all bills for this exhibition
    const billRepo = ds.getRepository(Bill);
    const bills = await billRepo.find({
      where: { 
        exhibitionId: id,
        status: BillStatus.COMPLETED
      },
      relations: ['items', 'items.book', 'createdBy'],
      order: { createdAt: 'DESC' }
    });

    // Calculate metrics
    let totalRevenue = 0;
    let totalCreditAmount = 0;
    let totalBooksSoldFromBills = 0;

    for (const bill of bills) {
      if (bill.paymentStatus === PaymentStatus.PAID) {
        totalRevenue += Number(bill.totalAmount);
      } else if (bill.paymentStatus === PaymentStatus.UNPAID) {
        totalCreditAmount += Number(bill.totalAmount);
      }

      for (const item of bill.items) {
        totalBooksSoldFromBills += item.quantity;
      }
    }

    // FALLBACK: If no bills are linked, calculate based on reconciled quantities and book prices
    if (bills.length === 0) {
      for (const s of exhibition.stock) {
        const bookPrice = Number(s.book?.price || 0);
        totalRevenue += s.quantitySold * bookPrice;
        totalCreditAmount += s.quantityCredit * bookPrice;
        totalBooksSoldFromBills += s.quantitySold;
      }
    }

    // Calculate stock reconciliation summaries
    let totalTaken = 0;
    let totalSold = 0;
    let totalReturned = 0;
    let totalDamaged = 0;
    let totalLost = 0;
    let totalCreditQty = 0;

    for (const s of exhibition.stock) {
      totalTaken += s.quantityTaken;
      totalSold += s.quantitySold;
      totalReturned += s.quantityReturned;
      totalDamaged += s.quantityDamaged;
      totalLost += s.quantityLost;
      totalCreditQty += s.quantityCredit;
    }

    return {
      exhibition: {
        id: exhibition.id,
        name: exhibition.name,
        location: exhibition.location,
        startDate: exhibition.startDate,
        endDate: exhibition.endDate,
        status: exhibition.status,
        sourceBranchName: exhibition.sourceBranch?.name,
        assignedUserName: exhibition.assignedUser?.name,
      },
      metrics: {
        totalRevenue,
        totalCreditAmount,
        totalBooksSoldFromBills,
        totalTaken,
        totalSold,
        totalReturned,
        totalDamaged,
        totalLost,
        totalCreditQty,
      },
      bills: bills.map(b => ({
        id: b.id,
        billNumber: b.billNumber,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        totalAmount: b.totalAmount,
        paymentStatus: b.paymentStatus,
        paymentMode: b.paymentMode,
        createdAt: b.createdAt,
        createdBy: b.createdBy?.name,
      })),
      stock: exhibition.stock.map(s => ({
        id: s.id,
        bookTitle: s.book?.title,
        isbn: s.book?.isbn,
        quantityTaken: s.quantityTaken,
        quantitySold: s.quantitySold,
        quantityReturned: s.quantityReturned,
        quantityDamaged: s.quantityDamaged,
        quantityLost: s.quantityLost,
        quantityCredit: s.quantityCredit,
      })),
    };
  }

  // ── Phase 2: Staff Assignment Methods ────────────────────────────────────────

  async getAssignments(exhibitionId: string, user: JwtPayload): Promise<ExhibitionAssignment[]> {
    await canAccessExhibition(user, exhibitionId);
    const ds = await getDataSource();
    const repo = ds.getRepository(ExhibitionAssignment);
    return repo.find({
      where: { exhibitionId },
      relations: ['user', 'assignedBy'],
      order: { assignedAt: 'DESC' },
    });
  }

  async assignStaff(
    exhibitionId: string,
    dto: AssignStaffDto,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<ExhibitionAssignment> {
    const access = await canAccessExhibition(user, exhibitionId);

    if (!access.isAdmin && !access.isBranchManager) {
      throw new ForbiddenException(
        'Only Administrators or the Branch Manager of the source branch can assign staff to this exhibition',
      );
    }

    const ds = await getDataSource();
    const assignmentRepo = ds.getRepository(ExhibitionAssignment);
    const userRepo = ds.getRepository(User);

    const targetUser = await userRepo.findOne({ where: { id: dto.userId } });
    if (!targetUser) throw new NotFoundException(`User with ID ${dto.userId} not found`);

    let assignment = await assignmentRepo.findOne({
      where: { exhibitionId, userId: dto.userId },
    });

    if (!assignment) {
      assignment = assignmentRepo.create({
        exhibitionId,
        userId: dto.userId,
        role: dto.role,
        assignedById: user.userId,
      });
    } else {
      assignment.role = dto.role;
      assignment.assignedById = user.userId;
    }

    const saved = await assignmentRepo.save(assignment);

    // Sync legacy assignedUserId
    const exhibitionRepo = ds.getRepository(Exhibition);
    if (!access.exhibition.assignedUserId || dto.role === ExhibitionAssignmentRole.LEAD) {
      await exhibitionRepo.update(exhibitionId, { assignedUserId: dto.userId });
    }

    await ds.getRepository(AuditLog).save({
      userId: user.userId,
      action: 'EXHIBITION_STAFF_ASSIGNED',
      entityType: 'ExhibitionAssignment',
      entityId: saved.id,
      beforeJson: null,
      afterJson: saved,
      ipAddress,
    });

    this.notificationsService.triggerRefresh('exhibition_changed');
    await this.notificationsService.createNotification(
      dto.userId,
      'Exhibition Assigned',
      `You have been assigned as ${dto.role} for exhibition "${access.exhibition.name}".`,
      'EXHIBITION',
    );

    return (await assignmentRepo.findOne({
      where: { id: saved.id },
      relations: ['user', 'assignedBy'],
    })) as ExhibitionAssignment;
  }

  async removeStaff(
    exhibitionId: string,
    userIdToRemove: string,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<void> {
    const access = await canAccessExhibition(user, exhibitionId);

    if (!access.isAdmin && !access.isBranchManager) {
      throw new ForbiddenException(
        'Only Administrators or the Branch Manager of the source branch can remove assigned staff',
      );
    }

    const ds = await getDataSource();
    const assignmentRepo = ds.getRepository(ExhibitionAssignment);
    const assignment = await assignmentRepo.findOne({
      where: { exhibitionId, userId: userIdToRemove },
    });

    if (!assignment) {
      throw new NotFoundException(`User ${userIdToRemove} is not assigned to exhibition ${exhibitionId}`);
    }

    await assignmentRepo.remove(assignment);

    // Sync legacy assignedUserId
    if (access.exhibition.assignedUserId === userIdToRemove) {
      const remaining = await assignmentRepo.findOne({ where: { exhibitionId } });
      await ds.getRepository(Exhibition).update(exhibitionId, {
        assignedUserId: remaining ? remaining.userId : null,
      });
    }

    await ds.getRepository(AuditLog).save({
      userId: user.userId,
      action: 'EXHIBITION_STAFF_REMOVED',
      entityType: 'ExhibitionAssignment',
      entityId: assignment.id,
      beforeJson: assignment,
      afterJson: null,
      ipAddress,
    });

    this.notificationsService.triggerRefresh('exhibition_changed');
    await this.notificationsService.createNotification(
      userIdToRemove,
      'Exhibition Unassigned',
      `You have been unassigned from exhibition "${access.exhibition.name}".`,
      'EXHIBITION',
    );
  }

  // ── STOCK TOP-UP REQUESTS ──────────────────────────────────────────────────

  async getStockRequests(exhibitionId: string, user: JwtPayload): Promise<ExhibitionStockRequest[]> {
    await canAccessExhibition(user, exhibitionId);
    const ds = await getDataSource();
    const repo = ds.getRepository(ExhibitionStockRequest);
    return repo.find({
      where: { exhibitionId },
      relations: ['requestedBy', 'reviewedBy', 'sourceBranch', 'items', 'items.book'],
      order: { createdAt: 'DESC' },
    });
  }

  async createStockRequest(
    exhibitionId: string,
    dto: CreateStockRequestDto,
    user: JwtPayload,
  ): Promise<ExhibitionStockRequest> {
    const access = await canAccessExhibition(user, exhibitionId);
    if (!access.isStaff && !access.isLead && !access.isAdmin && !access.isBranchManager) {
      throw new ForbiddenException('Only assigned exhibition staff or managers can request stock top-ups');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Stock request must contain at least one item');
    }

    const ds = await getDataSource();
    const requestRepo = ds.getRepository(ExhibitionStockRequest);
    const itemRepo = ds.getRepository(ExhibitionStockRequestItem);

    const req = requestRepo.create({
      exhibitionId,
      requestedById: user.userId,
      sourceType: dto.sourceType,
      sourceBranchId: dto.sourceBranchId || null,
      status: ExhibitionStockRequestStatus.PENDING,
    });
    const savedReq = await requestRepo.save(req);

    const itemsToSave = dto.items.map((i) =>
      itemRepo.create({
        requestId: savedReq.id,
        bookId: i.bookId,
        quantityRequested: i.quantityRequested,
      }),
    );
    await itemRepo.save(itemsToSave);

    // Also create companion StockTransfer record so Central Inventory Manager sees it in /dashboard/transfers & /dashboard/central-inventory
    try {
      const transferRepo = ds.getRepository(StockTransfer);
      const transferItemRepo = ds.getRepository(StockTransferItem);
      const branchRepo = ds.getRepository(Branch);

      const branches = await branchRepo.find();
      const warehouse = branches.find((b: any) => b.type === 'WAREHOUSE') || branches[0];

      let fromBranchId = warehouse ? warehouse.id : (dto.sourceBranchId || access.exhibition.sourceBranchId);
      let toBranchId = access.exhibition.sourceBranchId || (dto.sourceBranchId || fromBranchId);

      // Ensure fromBranchId != toBranchId for foreign key constraint
      if (fromBranchId === toBranchId && branches.length > 1) {
        const otherBranch = branches.find((b: any) => b.id !== fromBranchId);
        if (otherBranch) {
          toBranchId = otherBranch.id;
        }
      }

      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const [countResult] = await ds.query(
        `SELECT COUNT(*) as count FROM stock_transfer WHERE transfer_number LIKE ?`,
        [`TR-${todayStr}-%`]
      );
      const count = Number(countResult?.count || 0) + 1;
      const transferNumber = `TR-${todayStr}-${String(count).padStart(4, '0')}`;

      const transfer = transferRepo.create({
        transferNumber,
        fromBranchId,
        toBranchId,
        requestedById: user.userId,
        status: StockTransferStatus.PENDING,
        note: `[EXHIBITION RESTOCK] ${access.exhibition.name}`,
      });
      const savedTransfer = await transferRepo.save(transfer);

      const transferItems = dto.items.map((i) =>
        transferItemRepo.create({
          transferId: savedTransfer.id,
          bookId: i.bookId,
          quantityRequested: i.quantityRequested,
          quantityDispatched: 0,
          quantityReceived: 0,
        })
      );
      await transferItemRepo.save(transferItems);
      this.notificationsService.triggerRefresh('transfers_changed');
    } catch (err) {
      console.error('Failed to create companion StockTransfer record:', err);
    }

    this.notificationsService.triggerRefresh('exhibition_changed');
    return this.getStockRequestById(savedReq.id);
  }

  async getStockRequestById(requestId: string): Promise<ExhibitionStockRequest> {
    const ds = await getDataSource();
    const repo = ds.getRepository(ExhibitionStockRequest);
    const req = await repo.findOne({
      where: { id: requestId },
      relations: ['requestedBy', 'reviewedBy', 'sourceBranch', 'items', 'items.book'],
    });
    if (!req) throw new NotFoundException(`Stock request ${requestId} not found`);
    return req;
  }

  async reviewStockRequest(
    exhibitionId: string,
    requestId: string,
    dto: ReviewStockRequestDto,
    user: JwtPayload,
  ): Promise<ExhibitionStockRequest> {
    const ds = await getDataSource();
    const req = await this.getStockRequestById(requestId);
    if (req.exhibitionId !== exhibitionId) {
      throw new BadRequestException('Request does not belong to this exhibition');
    }

    if (req.status !== ExhibitionStockRequestStatus.PENDING) {
      throw new ConflictException(`Request is already in status ${req.status}`);
    }

    // Permission check: Central Manager for warehouse source, Branch Manager for branch source, or Admin
    const isAdmin = hasRole(user, UserRole.SUPER_ADMIN) || hasRole(user, UserRole.ADMIN);
    const isCentralManager = hasRole(user, UserRole.CENTRAL_INVENTORY_MANAGER);
    const isSourceBranchManager =
      hasRole(user, UserRole.BRANCH_MANAGER) && req.sourceBranchId !== null && user.branchId === req.sourceBranchId;

    if (req.sourceType === StockSourceType.WAREHOUSE && !isCentralManager && !isAdmin) {
      throw new ForbiddenException('Only Central Inventory Manager can review warehouse stock requests');
    }
    if (req.sourceType === StockSourceType.BRANCH && !isSourceBranchManager && !isAdmin) {
      throw new ForbiddenException('Only the governing Branch Manager can review branch stock requests');
    }

    if (dto.action === ReviewAction.REJECT) {
      req.status = ExhibitionStockRequestStatus.REJECTED;
      req.reviewedById = user.userId;
      req.reviewNote = dto.reviewNote || null;
      await ds.getRepository(ExhibitionStockRequest).save(req);
      this.notificationsService.triggerRefresh('exhibition_changed');
      return this.getStockRequestById(requestId);
    }

    // APPROVE flow
    let totalRequested = 0;
    let totalApproved = 0;

    const itemRepo = ds.getRepository(ExhibitionStockRequestItem);
    for (const item of req.items) {
      totalRequested += item.quantityRequested;
      const approvedDto = dto.items?.find((i) => i.bookId === item.bookId);
      const appQty = approvedDto ? approvedDto.quantityApproved : item.quantityRequested;
      item.quantityApproved = Math.max(0, Math.min(appQty, item.quantityRequested));
      totalApproved += item.quantityApproved;
      await itemRepo.save(item);
    }

    req.status =
      totalApproved === totalRequested
        ? ExhibitionStockRequestStatus.APPROVED
        : totalApproved > 0
        ? ExhibitionStockRequestStatus.PARTIALLY_APPROVED
        : ExhibitionStockRequestStatus.REJECTED;

    req.reviewedById = user.userId;
    req.reviewNote = dto.reviewNote || null;
    await ds.getRepository(ExhibitionStockRequest).save(req);

    this.notificationsService.triggerRefresh('exhibition_changed');
    return this.getStockRequestById(requestId);
  }

  async dispatchStockRequest(
    exhibitionId: string,
    requestId: string,
    user: JwtPayload,
  ): Promise<ExhibitionStockRequest> {
    const ds = await getDataSource();
    const req = await this.getStockRequestById(requestId);
    if (req.exhibitionId !== exhibitionId) {
      throw new BadRequestException('Request does not belong to this exhibition');
    }

    if (
      req.status !== ExhibitionStockRequestStatus.APPROVED &&
      req.status !== ExhibitionStockRequestStatus.PARTIALLY_APPROVED
    ) {
      throw new ConflictException(`Cannot dispatch request in status ${req.status}`);
    }

    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of req.items) {
        if (item.quantityApproved > 0) {
          if (req.sourceType === StockSourceType.WAREHOUSE) {
            await decrementCentralStock(queryRunner, item.bookId, item.quantityApproved);
          } else if (req.sourceBranchId) {
            await decrementBranchStock(queryRunner, req.sourceBranchId, item.bookId, item.quantityApproved);
          }

          await writeStockMovement(queryRunner, {
            bookId: item.bookId,
            branchId: req.sourceBranchId || null,
            type: 'EXHIBITION_OUT',
            quantity: -item.quantityApproved,
            performedById: user.userId,
            referenceType: 'EXHIBITION',
            referenceId: exhibitionId,
            note: `Top-Up Dispatch for Request ${requestId}`,
          });
        }
      }

      req.status = ExhibitionStockRequestStatus.DISPATCHED;
      await queryRunner.manager.save(ExhibitionStockRequest, req);

      await queryRunner.commitTransaction();
      this.notificationsService.triggerRefresh('exhibition_changed');
      return this.getStockRequestById(requestId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async receiveStockRequest(
    exhibitionId: string,
    requestId: string,
    user: JwtPayload,
  ): Promise<ExhibitionStockRequest> {
    await canAccessExhibition(user, exhibitionId);
    const ds = await getDataSource();
    const req = await this.getStockRequestById(requestId);

    if (req.exhibitionId !== exhibitionId) {
      throw new BadRequestException('Request does not belong to this exhibition');
    }

    if (req.status !== ExhibitionStockRequestStatus.DISPATCHED) {
      throw new ConflictException(`Cannot receive stock for request in status ${req.status}`);
    }

    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sourceRepo = queryRunner.manager.getRepository(ExhibitionStockSource);

      for (const item of req.items) {
        const receivedQty = item.quantityApproved;
        item.quantityReceived = receivedQty;
        await queryRunner.manager.save(ExhibitionStockRequestItem, item);

        if (receivedQty > 0) {
          await queryRunner.manager.query(
            `INSERT INTO exhibition_stock 
               (id, exhibition_id, book_id, quantity_taken, quantity_top_up, quantity_sold, quantity_credit, quantity_returned, quantity_damaged, quantity_lost, created_at, updated_at)
             VALUES (UUID(), ?, ?, 0, ?, 0, 0, 0, 0, 0, NOW(), NOW())
             ON DUPLICATE KEY UPDATE quantity_top_up = quantity_top_up + ?, updated_at = NOW()`,
            [exhibitionId, item.bookId, receivedQty, receivedQty],
          );

          await writeStockMovement(queryRunner, {
            bookId: item.bookId,
            branchId: null,
            type: 'EXHIBITION_TOP_UP',
            quantity: receivedQty,
            performedById: user.userId,
            referenceType: 'EXHIBITION',
            referenceId: exhibitionId,
            note: `Top-Up Received for Request ${requestId}`,
          });

          const [exStock] = await queryRunner.manager.query(
            `SELECT id FROM exhibition_stock WHERE exhibition_id = ? AND book_id = ? LIMIT 1`,
            [exhibitionId, item.bookId],
          );
          if (exStock) {
            const existingSource = await sourceRepo.findOne({
              where: {
                exhibitionStockId: exStock.id,
                sourceType: req.sourceType,
                sourceBranchId: req.sourceBranchId || undefined,
              },
            });

            if (existingSource) {
              existingSource.quantityTaken += receivedQty;
              await sourceRepo.save(existingSource);
            } else {
              const newSource = sourceRepo.create({
                exhibitionStockId: exStock.id,
                sourceType: req.sourceType,
                sourceBranchId: req.sourceBranchId || null,
                quantityTaken: receivedQty,
              });
              await sourceRepo.save(newSource);
            }
          }
        }
      }

      req.status = ExhibitionStockRequestStatus.RECEIVED;
      await queryRunner.manager.save(ExhibitionStockRequest, req);

      await queryRunner.commitTransaction();
      this.notificationsService.triggerRefresh('exhibition_changed');
      return this.getStockRequestById(requestId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── DAY CLOSE & CASH RECONCILIATION ────────────────────────────────────────

  async getDayCloses(exhibitionId: string, user: JwtPayload): Promise<ExhibitionDayClose[]> {
    await canAccessExhibition(user, exhibitionId);
    const ds = await getDataSource();
    const repo = ds.getRepository(ExhibitionDayClose);
    return repo.find({
      where: { exhibitionId },
      relations: ['closedBy'],
      order: { closeDate: 'DESC' },
    });
  }

  async getTodayCloseSummary(exhibitionId: string, user: JwtPayload) {
    await canAccessExhibition(user, exhibitionId);
    const ds = await getDataSource();

    const todayStr = new Date().toISOString().split('T')[0];

    const dayCloseRepo = ds.getRepository(ExhibitionDayClose);
    const existingClose = await dayCloseRepo.findOne({
      where: { exhibitionId, closeDate: todayStr },
      relations: ['closedBy'],
    });

    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    const billRows = await ds.query(
      `SELECT 
         b.payment_mode as paymentMode,
         SUM(b.total_amount) as totalAmount,
         SUM(bi.quantity) as totalQty,
         bi.is_credit_copy as isCreditCopy
       FROM bill b
       JOIN bill_item bi ON bi.bill_id = b.id
       WHERE b.exhibition_id = ? 
         AND b.created_at BETWEEN ? AND ?
         AND b.status != 'VOIDED'
       GROUP BY b.payment_mode, bi.is_credit_copy`,
      [exhibitionId, startOfDay, endOfDay],
    );

    let cashTotal = 0;
    let upiTotal = 0;
    let quantitySold = 0;
    let quantityCredit = 0;

    for (const r of billRows) {
      const amt = Number(r.totalAmount || 0);
      const qty = Number(r.totalQty || 0);
      if (r.paymentMode === 'CASH') cashTotal += amt;
      if (r.paymentMode === 'UPI') upiTotal += amt;

      if (r.isCreditCopy) {
        quantityCredit += qty;
      } else {
        quantitySold += qty;
      }
    }

    return {
      closeDate: todayStr,
      isClosed: !!existingClose,
      cashTotal,
      upiTotal,
      quantitySold,
      quantityCredit,
      existingClose,
    };
  }

  async performDayClose(
    exhibitionId: string,
    dto: DayCloseDto,
    user: JwtPayload,
  ): Promise<ExhibitionDayClose> {
    const access = await canAccessExhibition(user, exhibitionId);
    if (!access.isStaff && !access.isLead && !access.isAdmin && !access.isBranchManager) {
      throw new ForbiddenException('Only assigned exhibition staff or managers can perform day close');
    }

    const ds = await getDataSource();
    const dayCloseRepo = ds.getRepository(ExhibitionDayClose);

    const closeDate = dto.closeDate || new Date().toISOString().split('T')[0];

    const existing = await dayCloseRepo.findOne({ where: { exhibitionId, closeDate } });
    if (existing) {
      throw new ConflictException(`Day close for ${closeDate} has already been performed`);
    }

    const summary = await this.getTodayCloseSummary(exhibitionId, user);
    const cashTotal = summary.cashTotal;
    const upiTotal = summary.upiTotal;
    const quantitySold = summary.quantitySold;
    const quantityCredit = summary.quantityCredit;
    const countedCash = Number(dto.countedCash || 0);
    const variance = countedCash - cashTotal;

    const dayClose = dayCloseRepo.create({
      exhibitionId,
      closeDate,
      openingStock: 0,
      quantitySold,
      quantityCredit,
      cashTotal,
      upiTotal,
      countedCash,
      variance,
      note: dto.note || null,
      closedById: user.userId,
    });

    const saved = await dayCloseRepo.save(dayClose);

    this.notificationsService.triggerRefresh('exhibition_changed');
    return saved;
  }

  // ── DASHBOARD & METRICS ────────────────────────────────────────────────────

  async getExhibitionDashboard(exhibitionId: string, user: JwtPayload) {
    const access = await canAccessExhibition(user, exhibitionId);
    const ds = await getDataSource();

    const exhibition = access.exhibition;

    // Fetch all non-voided bills for this exhibition
    const billRepo = ds.getRepository(Bill);
    const bills = await billRepo.find({
      where: { exhibitionId, status: BillStatus.COMPLETED },
      relations: ['items', 'items.book'],
      order: { createdAt: 'DESC' },
    });

    // Fetch expenses attached to this exhibition
    const expenseRepo = ds.getRepository(Expense);
    const expenses = await expenseRepo.find({
      where: { exhibitionId },
      order: { expenseDate: 'DESC' },
    });

    // Fetch day closes
    const dayCloseRepo = ds.getRepository(ExhibitionDayClose);
    const dayCloses = await dayCloseRepo.find({
      where: { exhibitionId },
      order: { closeDate: 'DESC' },
    });

    // Fetch open stock requests
    const requestRepo = ds.getRepository(ExhibitionStockRequest);
    const stockRequests = await requestRepo.find({
      where: { exhibitionId },
      relations: ['items', 'items.book', 'sourceBranch'],
      order: { createdAt: 'DESC' },
    });

    // Computations
    let totalRevenue = 0;
    let totalCost = 0; // COGS
    let totalItemsSold = 0;
    let totalCreditCopies = 0;
    let cashRevenue = 0;
    let upiRevenue = 0;

    const bookSalesMap: Record<string, { book: Book; unitsSold: number; revenue: number }> = {};
    const now = new Date();
    const isSameDayIST = (d1: Date, d2: Date) => {
      const s1 = d1.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const s2 = d2.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      return s1 === s2;
    };

    const getISTHour = (d: Date) => {
      const hourStr = d.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
      const h = parseInt(hourStr, 10);
      return isNaN(h) ? d.getHours() : (h % 24);
    };

    const hourlySalesCurve: Array<{ hour: number; revenue: number; billsCount: number }> = Array.from(
      { length: 24 },
      (_, i) => ({ hour: i, revenue: 0, billsCount: 0 }),
    );

    let todayRevenue = 0;
    let todayItemsSold = 0;
    let todayCreditCopies = 0;
    let todayBillsCount = 0;

    for (const bill of bills) {
      const billDate = new Date(bill.createdAt);
      const isToday = isSameDayIST(billDate, now);

      if (isToday) {
        todayBillsCount++;
        const hour = getISTHour(billDate);
        hourlySalesCurve[hour].revenue += Number(bill.totalAmount || 0);
        hourlySalesCurve[hour].billsCount++;
      }

      const amount = Number(bill.totalAmount || 0);
      totalRevenue += amount;
      if (isToday) todayRevenue += amount;

      if (bill.paymentMode === PaymentMode.CASH) {
        cashRevenue += amount;
      } else if (bill.paymentMode === PaymentMode.UPI) {
        upiRevenue += amount;
      }

      for (const item of bill.items) {
        const itemCost = Number(item.unitCost || 0) * item.quantity;
        totalCost += itemCost;

        if (item.isCreditCopy) {
          totalCreditCopies += item.quantity;
          if (isToday) todayCreditCopies += item.quantity;
        } else {
          totalItemsSold += item.quantity;
          if (isToday) todayItemsSold += item.quantity;

          const bookId = item.bookId;
          if (!bookSalesMap[bookId]) {
            bookSalesMap[bookId] = { book: item.book, unitsSold: 0, revenue: 0 };
          }
          bookSalesMap[bookId].unitsSold += item.quantity;
          bookSalesMap[bookId].revenue += Number(item.lineTotal || 0);
        }
      }
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalExpenses;
    const avgBillValue = bills.length > 0 ? totalRevenue / bills.length : 0;

    // Stock & Sell-Through analysis per title
    let lowStockThresholdPct = 70;
    try {
      const settingRow = await ds.query(
        `SELECT setting_value FROM setting WHERE setting_key = 'exhibition_low_stock_percent' LIMIT 1`,
      );
      if (settingRow && settingRow.length > 0) {
        lowStockThresholdPct = parseFloat(settingRow[0].setting_value) || 70;
      }
    } catch (err) {
      // Fallback
    }

    const stockItems = exhibition.stock || [];
    let totalTaken = 0;
    let totalTopUp = 0;
    let totalSold = 0;
    let totalRemaining = 0;

    const sellThroughList = stockItems.map((st) => {
      const taken = st.quantityTaken || 0;
      const topUp = st.quantityTopUp || 0;
      const totalAvailable = taken + topUp;
      const sold = st.quantitySold || 0;
      const credit = st.quantityCredit || 0;
      const returned = st.quantityReturned || 0;
      const damaged = st.quantityDamaged || 0;
      const lost = st.quantityLost || 0;
      const remaining = totalAvailable - sold - credit - returned - damaged - lost;

      totalTaken += taken;
      totalTopUp += topUp;
      totalSold += sold;
      totalRemaining += Math.max(0, remaining);

      const sellThroughPct = totalAvailable > 0 ? (sold / totalAvailable) * 100 : 0;
      const isLowStock = sellThroughPct >= lowStockThresholdPct;

      return {
        bookId: st.bookId,
        book: st.book,
        quantityTaken: taken,
        quantityTopUp: topUp,
        totalAvailable,
        quantitySold: sold,
        quantityCredit: credit,
        quantityRemaining: Math.max(0, remaining),
        sellThroughPct: Math.round(sellThroughPct * 10) / 10,
        isLowStock,
      };
    });

    const overallTotalAvailable = totalTaken + totalTopUp;
    const overallSellThroughPct =
      overallTotalAvailable > 0 ? Math.round((totalSold / overallTotalAvailable) * 1000) / 10 : 0;

    // Top 10 by units & by revenue
    const topByUnits = Object.values(bookSalesMap)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 10);

    const topByRevenue = Object.values(bookSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const lowStockAlerts = sellThroughList.filter((s) => s.isLowStock);

    return {
      exhibition: {
        id: exhibition.id,
        name: exhibition.name,
        location: exhibition.location,
        startDate: exhibition.startDate,
        endDate: exhibition.endDate,
        status: exhibition.status,
        isOverdue: exhibition.isOverdue,
        isStale: exhibition.isStale,
        sourceBranch: exhibition.sourceBranch,
        assignments: exhibition.assignments,
      },
      bills: bills.map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        totalAmount: Number(b.totalAmount || 0),
        paymentMode: b.paymentMode,
        createdAt: b.createdAt,
      })),
      today: {
        revenue: todayRevenue,
        billCount: todayBillsCount,
        itemsSold: todayItemsSold,
        creditCopies: todayCreditCopies,
        hourlySalesCurve,
      },
      eventToDate: {
        totalRevenue,
        totalBills: bills.length,
        avgBillValue: Math.round(avgBillValue * 100) / 100,
        totalItemsSold,
        totalCreditCopies,
        stock: {
          taken: totalTaken,
          topUp: totalTopUp,
          sold: totalSold,
          remaining: totalRemaining,
          overallSellThroughPct,
        },
        cashVsUpi: {
          cash: cashRevenue,
          upi: upiRevenue,
        },
        sellThroughList,
        topByUnits,
        topByRevenue,
        lowStockAlerts,
        openStockRequests: stockRequests.filter((r) => r.status === ExhibitionStockRequestStatus.PENDING),
        dayCloses,
      },
      financials: {
        revenue: totalRevenue,
        cogs: totalCost,
        grossProfit,
        expenses: totalExpenses,
        netProfit,
        expenseDetails: expenses,
      },
      userPermissions: {
        isLead: access.isLead,
        isStaff: access.isStaff,
        isBranchManager: access.isBranchManager,
        isAdmin: access.isAdmin,
        isFinance: access.isFinance,
      },
    };
  }

  // ── CROSS-EXHIBITION COMPARISON ───────────────────────────────────────────

  async compareExhibitions(ids: string[], user: JwtPayload) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('At least one exhibition ID is required for comparison');
    }

    const results = [];
    for (const id of ids) {
      try {
        const dashboard = await this.getExhibitionDashboard(id, user);
        const exh = dashboard.exhibition;
        const start = new Date(exh.startDate);
        const end = new Date(exh.endDate);
        const dayCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));

        results.push({
          id: exh.id,
          name: exh.name,
          location: exh.location,
          status: exh.status,
          sourceBranchName: exh.sourceBranch?.name || 'N/A',
          startDate: exh.startDate,
          endDate: exh.endDate,
          dayCount,
          totalRevenue: dashboard.financials.revenue,
          cogs: dashboard.financials.cogs,
          grossProfit: dashboard.financials.grossProfit,
          expenses: dashboard.financials.expenses,
          netProfit: dashboard.financials.netProfit,
          revenuePerDay: Math.round((dashboard.financials.revenue / dayCount) * 100) / 100,
          totalItemsSold: dashboard.eventToDate.totalItemsSold,
          totalCreditCopies: dashboard.eventToDate.totalCreditCopies,
          sellThroughPct: dashboard.eventToDate.stock.overallSellThroughPct,
          totalBills: dashboard.eventToDate.totalBills,
          avgBillValue: dashboard.eventToDate.avgBillValue,
        });
      } catch (err) {
        // Skip inaccessible or not found
      }
    }

    return results;
  }
}


