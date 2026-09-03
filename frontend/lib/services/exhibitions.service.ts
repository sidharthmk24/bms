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
import { CreditCopy } from '../api-backend/credit-copies/entities/credit-copy.entity';
import { Bill, BillStatus, PaymentStatus } from '../api-backend/billing/entities/bill.entity';
import { User } from '../api-backend/users/entities/user.entity';
import { Notification } from '../api-backend/notifications/entities/notification.entity';
import { CreateExhibitionDto } from '../api-backend/exhibitions/dto/create-exhibition.dto';
import { UpdateExhibitionDto } from '../api-backend/exhibitions/dto/update-exhibition.dto';
import { ReviewExhibitionDto } from '../api-backend/exhibitions/dto/review-exhibition.dto';
import { CloseExhibitionDto } from '../api-backend/exhibitions/dto/close-exhibition.dto';

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
        const newStatus = isOngoing ? ExhibitionStatus.OVERDUE : ExhibitionStatus.EXPIRED;

        // 1. Update status
        await exhibitionRepo.update(exhibition.id, {
          status: newStatus,
        });

        // 2. Notify users
        for (const user of notifyList) {
          const isAssigned = user.id === exhibition.assignedUserId;
          const isAdmin = user.roles.some(ur => [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(ur.role as UserRole));
          
          if (!isAssigned && !isAdmin) continue;

          const existingNotif = await notifRepo.createQueryBuilder('n')
            .where('n.userId = :userId', { userId: user.id })
            .andWhere('n.title = :title', { title: 'Exhibition Overdue Alert' })
            .andWhere('n.message LIKE :msg', { msg: `%${exhibition.id}%` })
            .getOne();

          if (!existingNotif) {
            let message = '';
            if (isAssigned) {
              message = isOngoing
                ? `The exhibition "${exhibition.name}" (ID: ${exhibition.id}) you are assigned to has passed its scheduled end date (${exhibition.endDate}) but is not yet closed. Please reconcile and close the event.`
                : `The exhibition "${exhibition.name}" (ID: ${exhibition.id}) you are assigned to was scheduled to start on ${exhibition.startDate} but was never dispatched. It is now marked as expired.`;
            } else {
              message = isOngoing
                ? `The exhibition "${exhibition.name}" (ID: ${exhibition.id}) assigned to ${exhibition.assignedUser?.name || 'Unassigned'} has passed its scheduled end date but remains unclosed.`
                : `The exhibition "${exhibition.name}" (ID: ${exhibition.id}) assigned to ${exhibition.assignedUser?.name || 'Unassigned'} was scheduled to start on ${exhibition.startDate} but was never dispatched and has expired.`;
            }

            await this.notificationsService.createNotification(
              user.id,
              'Exhibition Overdue Alert',
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
      const initialStatus = isAdmin ? ExhibitionStatus.ONGOING : ExhibitionStatus.REQUESTED;

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

      // Create stock entries and IMMEDIATELY decrement branch/warehouse stock
      const stockItems = [];
      for (const item of dto.items) {
        if (!item.quantityTaken || item.quantityTaken <= 0) {
          throw new BadRequestException('Quantity taken must be greater than 0');
        }

        let branchQty = 0;
        let centralQty = 0;

        if (isWarehouse) {
          // Warehouse is the direct source
          centralQty = item.quantityTaken;
          await decrementCentralStock(queryRunner, item.bookId, centralQty);

          await writeStockMovement(queryRunner, {
            bookId: item.bookId,
            branchId,
            type: 'EXHIBITION_OUT',
            quantity: -centralQty,
            performedById: user.userId,
            referenceType: 'EXHIBITION',
            referenceId: savedExhibition.id,
            note: `Dispatched from Central Warehouse for exhibition: ${dto.name}`,
          });
        } else {
          // Check branch shelf stock
          const [branchInv] = await queryRunner.manager.query(
            'SELECT quantity FROM branch_inventory WHERE branch_id = ? AND book_id = ?',
            [branchId, item.bookId]
          );
          const branchAvailable = branchInv ? Number(branchInv.quantity) : 0;

          // Determine branch vs central split
          if (item.quantityFromBranch !== undefined && item.quantityFromCentral !== undefined) {
            branchQty = Number(item.quantityFromBranch);
            centralQty = Number(item.quantityFromCentral);
          } else if (item.quantityFromBranch !== undefined) {
            branchQty = Number(item.quantityFromBranch);
            centralQty = item.quantityTaken - branchQty;
          } else {
            // Automatic split: take available from branch shelf, deficit from central warehouse
            branchQty = Math.min(branchAvailable, item.quantityTaken);
            centralQty = item.quantityTaken - branchQty;
          }

          if (branchQty < 0 || centralQty < 0 || (branchQty + centralQty !== item.quantityTaken)) {
            throw new BadRequestException(`Invalid stock split for book. Total must equal ${item.quantityTaken}`);
          }

          if (branchQty > branchAvailable) {
            throw new BadRequestException(`Branch only has ${branchAvailable} copies available (attempted to take ${branchQty})`);
          }

          if (centralQty > 0) {
            const [centralInv] = await queryRunner.manager.query(
              'SELECT quantity FROM central_stock WHERE book_id = ?',
              [item.bookId]
            );
            const centralAvailable = centralInv ? Number(centralInv.quantity) : 0;
            if (centralQty > centralAvailable) {
              throw new BadRequestException(
                `Insufficient stock: Branch has ${branchAvailable}, Central Warehouse has ${centralAvailable}, but requested total is ${item.quantityTaken}`
              );
            }
          }

          // Decrement branch stock
          if (branchQty > 0) {
            await decrementBranchStock(queryRunner, branchId, item.bookId, branchQty);
            await writeStockMovement(queryRunner, {
              bookId: item.bookId,
              branchId,
              type: 'EXHIBITION_OUT',
              quantity: -branchQty,
              performedById: user.userId,
              referenceType: 'EXHIBITION',
              referenceId: savedExhibition.id,
              note: `Dispatched from branch shelf for exhibition: ${dto.name}`,
            });
          }

          // Decrement central warehouse stock for remainder
          if (centralQty > 0) {
            await decrementCentralStock(queryRunner, item.bookId, centralQty);
            await writeStockMovement(queryRunner, {
              bookId: item.bookId,
              branchId: null,
              type: 'EXHIBITION_OUT',
              quantity: -centralQty,
              performedById: user.userId,
              referenceType: 'EXHIBITION',
              referenceId: savedExhibition.id,
              note: `Dispatched from Central Warehouse for exhibition: ${dto.name}`,
            });
          }
        }

        const stockItem = queryRunner.manager.getRepository(ExhibitionStock).create({
          exhibitionId: savedExhibition.id,
          bookId: item.bookId,
          quantityTaken: item.quantityTaken,
          quantityFromBranch: branchQty,
          quantityFromCentral: centralQty,
          quantitySold: 0,
          quantityReturned: 0,
          quantityDamaged: 0,
          quantityLost: 0,
        });
        stockItems.push(stockItem);
      }
      await queryRunner.manager.getRepository(ExhibitionStock).save(stockItems);

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
    const isCreator = exhibition.requestedById === user.userId;
    const isAssigned = exhibition.assignedUserId === user.userId;
    const isBranchManager = hasRole(user, UserRole.BRANCH_MANAGER) && user.branchId === exhibition.sourceBranchId;

    if (!isAdmin && !isCreator && !isAssigned && !isBranchManager) {
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

        const currentStocks = await queryRunner.manager.find(ExhibitionStock, {
          where: { exhibitionId: id },
        });

        const currentStockMap = new Map(currentStocks.map(s => [s.bookId, s]));
        const newStockMap = new Map(dto.items.map(i => [i.bookId, i]));

        // 1. Removed books: return all remaining copies to shelf/warehouse
        for (const existing of currentStocks) {
          if (!newStockMap.has(existing.bookId)) {
            if (existing.quantitySold > 0) {
              throw new BadRequestException(
                `Cannot remove book with already recorded sales (${existing.quantitySold} copies sold)`
              );
            }

            const branchQty = Number(existing.quantityFromBranch || 0);
            const centralQty = Number(existing.quantityFromCentral || 0);

            if (branchQty > 0) {
              await incrementBranchStock(queryRunner, exhibition.sourceBranchId, existing.bookId, branchQty);
              await writeStockMovement(queryRunner, {
                bookId: existing.bookId,
                branchId: exhibition.sourceBranchId,
                type: 'EXHIBITION_RETURN',
                quantity: branchQty,
                performedById: user.userId,
                referenceType: 'EXHIBITION',
                referenceId: id,
                note: `Book removed from exhibition: returned to branch shelf`,
              });
            }

            if (centralQty > 0 || (isWarehouse && existing.quantityTaken > 0)) {
              const cQty = isWarehouse ? existing.quantityTaken : centralQty;
              await incrementCentralStock(queryRunner, existing.bookId, cQty);
              await writeStockMovement(queryRunner, {
                bookId: existing.bookId,
                branchId: null,
                type: 'EXHIBITION_RETURN',
                quantity: cQty,
                performedById: user.userId,
                referenceType: 'EXHIBITION',
                referenceId: id,
                note: `Book removed from exhibition: returned to central warehouse`,
              });
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

          if (!existing) {
            // New book added to exhibition
            let branchQty = 0;
            let centralQty = 0;

            if (isWarehouse) {
              centralQty = item.quantityTaken;
              const [cInv] = await queryRunner.manager.query(
                'SELECT quantity FROM central_stock WHERE book_id = ?',
                [item.bookId]
              );
              const cAvail = cInv ? Number(cInv.quantity) : 0;
              if (centralQty > cAvail) {
                throw new BadRequestException(
                  `Insufficient warehouse stock: available ${cAvail}, requested ${centralQty}`
                );
              }
              await decrementCentralStock(queryRunner, item.bookId, centralQty);
              await writeStockMovement(queryRunner, {
                bookId: item.bookId,
                branchId: exhibition.sourceBranchId,
                type: 'EXHIBITION_OUT',
                quantity: -centralQty,
                performedById: user.userId,
                referenceType: 'EXHIBITION',
                referenceId: id,
                note: `Additional book added to exhibition from warehouse`,
              });
            } else {
              const [bInv] = await queryRunner.manager.query(
                'SELECT quantity FROM branch_inventory WHERE branch_id = ? AND book_id = ?',
                [exhibition.sourceBranchId, item.bookId]
              );
              const bAvail = bInv ? Number(bInv.quantity) : 0;

              if (item.quantityFromBranch !== undefined && item.quantityFromCentral !== undefined) {
                branchQty = Number(item.quantityFromBranch);
                centralQty = Number(item.quantityFromCentral);
              } else if (item.quantityFromBranch !== undefined) {
                branchQty = Number(item.quantityFromBranch);
                centralQty = item.quantityTaken - branchQty;
              } else {
                branchQty = Math.min(bAvail, item.quantityTaken);
                centralQty = item.quantityTaken - branchQty;
              }

              if (branchQty < 0 || centralQty < 0 || branchQty + centralQty !== item.quantityTaken) {
                throw new BadRequestException(
                  `Invalid split for book. Branch + Central must equal ${item.quantityTaken}`
                );
              }
              if (branchQty > bAvail) {
                throw new BadRequestException(
                  `Branch shelf only has ${bAvail} available (attempted ${branchQty})`
                );
              }
              if (centralQty > 0) {
                const [cInv] = await queryRunner.manager.query(
                  'SELECT quantity FROM central_stock WHERE book_id = ?',
                  [item.bookId]
                );
                const cAvail = cInv ? Number(cInv.quantity) : 0;
                if (centralQty > cAvail) {
                  throw new BadRequestException(
                    `Insufficient warehouse stock: available ${cAvail}, requested ${centralQty}`
                  );
                }
              }

              if (branchQty > 0) {
                await decrementBranchStock(queryRunner, exhibition.sourceBranchId, item.bookId, branchQty);
                await writeStockMovement(queryRunner, {
                  bookId: item.bookId,
                  branchId: exhibition.sourceBranchId,
                  type: 'EXHIBITION_OUT',
                  quantity: -branchQty,
                  performedById: user.userId,
                  referenceType: 'EXHIBITION',
                  referenceId: id,
                  note: `New book added to exhibition from branch shelf`,
                });
              }

              if (centralQty > 0) {
                await decrementCentralStock(queryRunner, item.bookId, centralQty);
                await writeStockMovement(queryRunner, {
                  bookId: item.bookId,
                  branchId: null,
                  type: 'EXHIBITION_OUT',
                  quantity: -centralQty,
                  performedById: user.userId,
                  referenceType: 'EXHIBITION',
                  referenceId: id,
                  note: `New book added to exhibition from central warehouse`,
                });
              }
            }

            const newStockEntry = queryRunner.manager.create(ExhibitionStock, {
              exhibitionId: id,
              bookId: item.bookId,
              quantityTaken: item.quantityTaken,
              quantityFromBranch: branchQty,
              quantityFromCentral: centralQty,
              quantitySold: 0,
              quantityReturned: 0,
              quantityDamaged: 0,
              quantityLost: 0,
              quantityCredit: 0,
            });
            await queryRunner.manager.save(newStockEntry);
          } else {
            // Existing book quantity adjustment
            if (item.quantityTaken < (existing.quantitySold || 0)) {
              throw new BadRequestException(
                `Quantity cannot be less than already sold quantity (${existing.quantitySold} copies sold)`
              );
            }

            let targetBranchQty = Number(existing.quantityFromBranch || 0);
            let targetCentralQty = Number(existing.quantityFromCentral || 0);

            if (isWarehouse) {
              targetBranchQty = 0;
              targetCentralQty = item.quantityTaken;
            } else if (item.quantityFromBranch !== undefined && item.quantityFromCentral !== undefined) {
              targetBranchQty = Number(item.quantityFromBranch);
              targetCentralQty = Number(item.quantityFromCentral);
              if (targetBranchQty + targetCentralQty !== item.quantityTaken) {
                throw new BadRequestException(
                  `Branch + Central split must equal total quantity ${item.quantityTaken}`
                );
              }
            } else {
              // Automatically adjust split proportionally/reasonably
              const deltaTotal = item.quantityTaken - existing.quantityTaken;
              if (deltaTotal > 0) {
                // Taking more stock
                const [bInv] = await queryRunner.manager.query(
                  'SELECT quantity FROM branch_inventory WHERE branch_id = ? AND book_id = ?',
                  [exhibition.sourceBranchId, item.bookId]
                );
                const bAvail = bInv ? Number(bInv.quantity) : 0;
                const addFromBranch = Math.min(bAvail, deltaTotal);
                const addFromCentral = deltaTotal - addFromBranch;

                targetBranchQty = (existing.quantityFromBranch || 0) + addFromBranch;
                targetCentralQty = (existing.quantityFromCentral || 0) + addFromCentral;
              } else if (deltaTotal < 0) {
                // Returning excess stock
                let reduceRemaining = Math.abs(deltaTotal);
                // Return central warehouse portion first if any
                const reduceCentral = Math.min(existing.quantityFromCentral || 0, reduceRemaining);
                targetCentralQty = (existing.quantityFromCentral || 0) - reduceCentral;
                reduceRemaining -= reduceCentral;

                // Return branch shelf portion
                const reduceBranch = Math.min(existing.quantityFromBranch || 0, reduceRemaining);
                targetBranchQty = (existing.quantityFromBranch || 0) - reduceBranch;
              }
            }

            const branchDelta = targetBranchQty - (existing.quantityFromBranch || 0);
            const centralDelta = targetCentralQty - (existing.quantityFromCentral || 0);

            if (branchDelta !== 0 || centralDelta !== 0 || item.quantityTaken !== existing.quantityTaken) {
              // Adjust Branch
              if (branchDelta > 0) {
                const [bInv] = await queryRunner.manager.query(
                  'SELECT quantity FROM branch_inventory WHERE branch_id = ? AND book_id = ?',
                  [exhibition.sourceBranchId, item.bookId]
                );
                const bAvail = bInv ? Number(bInv.quantity) : 0;
                if (branchDelta > bAvail) {
                  throw new BadRequestException(
                    `Branch shelf only has ${bAvail} copies available (needed ${branchDelta})`
                  );
                }
                await decrementBranchStock(queryRunner, exhibition.sourceBranchId, item.bookId, branchDelta);
                await writeStockMovement(queryRunner, {
                  bookId: item.bookId,
                  branchId: exhibition.sourceBranchId,
                  type: 'EXHIBITION_OUT',
                  quantity: -branchDelta,
                  performedById: user.userId,
                  referenceType: 'EXHIBITION',
                  referenceId: id,
                  note: `Increased stock for exhibition from branch shelf`,
                });
              } else if (branchDelta < 0) {
                const retQty = Math.abs(branchDelta);
                await incrementBranchStock(queryRunner, exhibition.sourceBranchId, item.bookId, retQty);
                await writeStockMovement(queryRunner, {
                  bookId: item.bookId,
                  branchId: exhibition.sourceBranchId,
                  type: 'EXHIBITION_RETURN',
                  quantity: retQty,
                  performedById: user.userId,
                  referenceType: 'EXHIBITION',
                  referenceId: id,
                  note: `Reduced stock from exhibition: returned to branch shelf`,
                });
              }

              // Adjust Central
              if (centralDelta > 0) {
                const [cInv] = await queryRunner.manager.query(
                  'SELECT quantity FROM central_stock WHERE book_id = ?',
                  [item.bookId]
                );
                const cAvail = cInv ? Number(cInv.quantity) : 0;
                if (centralDelta > cAvail) {
                  throw new BadRequestException(
                    `Warehouse only has ${cAvail} copies available (needed ${centralDelta})`
                  );
                }
                await decrementCentralStock(queryRunner, item.bookId, centralDelta);
                await writeStockMovement(queryRunner, {
                  bookId: item.bookId,
                  branchId: null,
                  type: 'EXHIBITION_OUT',
                  quantity: -centralDelta,
                  performedById: user.userId,
                  referenceType: 'EXHIBITION',
                  referenceId: id,
                  note: `Increased stock for exhibition from central warehouse`,
                });
              } else if (centralDelta < 0) {
                const retQty = Math.abs(centralDelta);
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
              }

              await queryRunner.manager.update(ExhibitionStock, { id: existing.id }, {
                quantityTaken: item.quantityTaken,
                quantityFromBranch: targetBranchQty,
                quantityFromCentral: targetCentralQty,
              });
            }
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

    // Super admins and admins see everything. Branch roles only see their own branch's OR ones they are assigned to.
    if (!hasRole(user, UserRole.SUPER_ADMIN) && !hasRole(user, UserRole.ADMIN)) {
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
    if (!hasRole(user, UserRole.SUPER_ADMIN) && !hasRole(user, UserRole.ADMIN)) {
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

    if (exhibition.status !== ExhibitionStatus.REQUESTED && exhibition.status !== ExhibitionStatus.EXPIRED) {
      throw new ConflictException(`Cannot approve exhibition in status ${exhibition.status}`);
    }

    // Since stock was already deducted upon request, approving moves it directly to ONGOING
    await exhibitionRepo.update(id, {
      status: ExhibitionStatus.ONGOING,
      approvedById: user.userId,
    });

    await dataSource.manager.query(
      'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,?,?,?,DEFAULT)',
      [user.userId, 'EXHIBITION_APPROVED', 'Exhibition', id, JSON.stringify({ status: exhibition.status }), JSON.stringify({ status: 'ONGOING', note: dto.note }), ipAddress],
    );

    this.notificationsService.triggerRefresh('exhibition_changed');
    this.notificationsService.triggerRefresh('stock_changed');
    this.notificationsService.triggerRefresh('inventory_changed');
    
    await this.notificationsService.notifyRoles(
      [UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY],
      exhibition.sourceBranchId,
      'Exhibition Approved',
      `Your exhibition request "${exhibition.name}" has been approved and is now active!`,
      'EXHIBITION'
    );

    return this.findOne(id, user);
  }

  // ── Reject exhibition (restores checked-out stock) ─────────────────────────────
  async rejectExhibition(
    id: string,
    dto: ReviewExhibitionDto,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<Exhibition> {
    const { dataSource } = await this.getRepos();
    const exhibition = await this.findOne(id, user);

    if (exhibition.status !== ExhibitionStatus.REQUESTED && exhibition.status !== ExhibitionStatus.EXPIRED) {
      throw new ConflictException(`Cannot reject exhibition in status ${exhibition.status}`);
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const isWarehouse = exhibition.sourceBranch?.type === BranchType.WAREHOUSE;

      // Restore checked-out stock back to branch and/or central inventory
      if (exhibition.stock && exhibition.stock.length > 0) {
        for (const stockItem of exhibition.stock) {
          const branchQty = Number(stockItem.quantityFromBranch || 0);
          const centralQty = Number(stockItem.quantityFromCentral || 0);

          if (branchQty > 0 || centralQty > 0) {
            if (branchQty > 0) {
              await incrementBranchStock(queryRunner, exhibition.sourceBranchId, stockItem.bookId, branchQty);
              await writeStockMovement(queryRunner, {
                bookId: stockItem.bookId,
                branchId: exhibition.sourceBranchId,
                type: 'EXHIBITION_RETURN',
                quantity: branchQty,
                performedById: user.userId,
                referenceType: 'EXHIBITION',
                referenceId: id,
                note: `Exhibition rejected: branch shelf stock restored`,
              });
            }
            if (centralQty > 0) {
              await incrementCentralStock(queryRunner, stockItem.bookId, centralQty);
              await writeStockMovement(queryRunner, {
                bookId: stockItem.bookId,
                branchId: null,
                type: 'EXHIBITION_RETURN',
                quantity: centralQty,
                performedById: user.userId,
                referenceType: 'EXHIBITION',
                referenceId: id,
                note: `Exhibition rejected: central warehouse stock restored`,
              });
            }
          } else {
            // Legacy fallback if split fields are unset
            if (isWarehouse) {
              await incrementCentralStock(queryRunner, stockItem.bookId, stockItem.quantityTaken);
            } else {
              await incrementBranchStock(queryRunner, exhibition.sourceBranchId, stockItem.bookId, stockItem.quantityTaken);
            }

            await writeStockMovement(queryRunner, {
              bookId: stockItem.bookId,
              branchId: isWarehouse ? null : exhibition.sourceBranchId,
              type: 'EXHIBITION_RETURN',
              quantity: stockItem.quantityTaken,
              performedById: user.userId,
              referenceType: 'EXHIBITION',
              referenceId: id,
              note: `Exhibition rejected: stock restored`,
            });
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
        `Your exhibition request "${exhibition.name}" has been rejected and books restored to inventory. Note: ${dto.note || 'No reason given'}`,
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

  // ── Dispatch — decrement branch stock, mark ONGOING ───────────────────────────
  async dispatchExhibition(
    id: string,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<Exhibition> {
    const { dataSource } = await this.getRepos();
    const exhibition = await this.findOne(id, user);

    if (exhibition.status !== ExhibitionStatus.APPROVED && exhibition.status !== ExhibitionStatus.EXPIRED) {
      throw new ConflictException(`Cannot dispatch exhibition in status ${exhibition.status}`);
    }

    // Role-based verification for dispatching
    if (exhibition.sourceBranch?.type === BranchType.WAREHOUSE) {
      const isCentralManager = hasRole(user, UserRole.CENTRAL_INVENTORY_MANAGER) ||
                               hasRole(user, UserRole.SUPER_ADMIN) ||
                               hasRole(user, UserRole.ADMIN);
      if (!isCentralManager) {
        throw new ForbiddenException('Only the Central Warehouse Manager or an Administrator can dispatch from the Central Warehouse');
      }
    } else {
      const isStoreStaffOrAdmin = !hasRole(user, UserRole.CENTRAL_INVENTORY_MANAGER) ||
                                  hasRole(user, UserRole.SUPER_ADMIN) ||
                                  hasRole(user, UserRole.ADMIN);
      if (!isStoreStaffOrAdmin) {
        throw new ForbiddenException('Central Warehouse Manager cannot dispatch from store branches');
      }
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Atomically decrement branch stock for each book
      for (const stockItem of exhibition.stock) {
        await decrementBranchStock(
          queryRunner,
          exhibition.sourceBranchId,
          stockItem.bookId,
          stockItem.quantityTaken,
        );

        await writeStockMovement(queryRunner, {
          bookId: stockItem.bookId,
          branchId: exhibition.sourceBranchId,
          type: 'EXHIBITION_OUT',
          quantity: -stockItem.quantityTaken,
          performedById: user.userId,
          referenceType: 'EXHIBITION',
          referenceId: id,
        });
      }

      await queryRunner.manager.getRepository(Exhibition).update({ id }, { status: ExhibitionStatus.ONGOING });

      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,?,?,?,DEFAULT)',
        [user.userId, 'EXHIBITION_DISPATCHED', 'Exhibition', id, null, null, ipAddress],
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

    // Validate reconciliation invariant: for each item
    // quantityTaken = quantitySold + quantityReturned + quantityDamaged + quantityLost
    for (const closeItem of dto.items) {
      const stockItem = exhibition.stock.find((s) => s.id === closeItem.stockId);
      if (!stockItem) {
        throw new NotFoundException(`Stock line ${closeItem.stockId} not found in exhibition`);
      }

      const total =
        closeItem.quantitySold +
        closeItem.quantityReturned +
        closeItem.quantityDamaged +
        closeItem.quantityLost +
        closeItem.quantityCredit;

      if (total !== stockItem.quantityTaken) {
        throw new BadRequestException(
          `Reconciliation failed for book ${stockItem.bookId}: ` +
          `taken=${stockItem.quantityTaken} but sold(${closeItem.quantitySold}) + ` +
          `returned(${closeItem.quantityReturned}) + damaged(${closeItem.quantityDamaged}) + ` +
          `lost(${closeItem.quantityLost}) + credit(${closeItem.quantityCredit}) = ${total}`,
        );
      }
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const closeItem of dto.items) {
        const stockItem = exhibition.stock.find((s) => s.id === closeItem.stockId)!;

        // Update exhibition stock with reconciliation data
        await queryRunner.manager.getRepository(ExhibitionStock).update({ id: closeItem.stockId }, {
          quantitySold: closeItem.quantitySold,
          quantityReturned: closeItem.quantityReturned,
          quantityDamaged: closeItem.quantityDamaged,
          quantityLost: closeItem.quantityLost,
          quantityCredit: closeItem.quantityCredit,
        });

        // Record credit copies if any
        if (closeItem.quantityCredit > 0) {
          const creditCopy = queryRunner.manager.getRepository(CreditCopy).create({
            bookId: stockItem.bookId,
            branchId: exhibition.sourceBranchId,
            quantity: closeItem.quantityCredit,
            recipientName: `Exhibition: ${exhibition.name}`,
            note: dto.note || 'Issued during exhibition closure',
            issuedById: user.userId,
          });
          await queryRunner.manager.getRepository(CreditCopy).save(creditCopy);

          await writeStockMovement(queryRunner, {
            bookId: stockItem.bookId,
            branchId: exhibition.sourceBranchId,
            type: 'CREDIT_OUT',
            quantity: -closeItem.quantityCredit,
            performedById: user.userId,
            referenceType: 'EXHIBITION',
            referenceId: exhibition.id,
            note: 'Credit copy from exhibition',
          });
        }

        // Return unsold + returned books back to branch/central inventory
        const qtyToReturn = closeItem.quantityReturned;
        if (qtyToReturn > 0) {
          const isWarehouse = exhibition.sourceBranch?.type === BranchType.WAREHOUSE;
          if (isWarehouse) {
            await incrementCentralStock(
              queryRunner,
              stockItem.bookId,
              qtyToReturn,
            );
          } else {
            await incrementBranchStock(
              queryRunner,
              exhibition.sourceBranchId,
              stockItem.bookId,
              qtyToReturn,
            );
          }

          await writeStockMovement(queryRunner, {
            bookId: stockItem.bookId,
            branchId: exhibition.sourceBranchId,
            type: 'EXHIBITION_RETURN',
            quantity: qtyToReturn,
            performedById: user.userId,
            referenceType: 'EXHIBITION',
            referenceId: id,
            note: `Returned after close`,
          });
        }

        // Log damaged stock as a separate movement for visibility
        if (closeItem.quantityDamaged > 0) {
          await writeStockMovement(queryRunner, {
            bookId: stockItem.bookId,
            branchId: exhibition.sourceBranchId,
            type: 'ADJUSTMENT',
            quantity: -closeItem.quantityDamaged,
            performedById: user.userId,
            referenceType: 'EXHIBITION',
            referenceId: id,
            reason: 'DAMAGED',
            note: `Damaged at exhibition close`,
          });
        }

        // Log lost stock similarly
        if (closeItem.quantityLost > 0) {
          await writeStockMovement(queryRunner, {
            bookId: stockItem.bookId,
            branchId: exhibition.sourceBranchId,
            type: 'ADJUSTMENT',
            quantity: -closeItem.quantityLost,
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
        [user.userId, 'EXHIBITION_CLOSED', 'Exhibition', id, null, JSON.stringify({ note: dto.note }), ipAddress],
      );

      await queryRunner.commitTransaction();
      this.notificationsService.triggerRefresh('exhibition_changed');
      this.notificationsService.triggerRefresh('stock_changed');
      this.notificationsService.triggerRefresh('inventory_changed');

      await this.notificationsService.notifyRoles(
        [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE],
        null,
        'Exhibition Closed',
        `The exhibition "${exhibition.name}" has been closed and reconciled.`,
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
}
