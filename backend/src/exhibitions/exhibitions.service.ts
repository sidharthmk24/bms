import { hasRole } from '../common/helpers/role.helper';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Exhibition, ExhibitionStatus } from './entities/exhibition.entity';
import { ExhibitionStock } from './entities/exhibition-stock.entity';
import { CreateExhibitionDto } from './dto/create-exhibition.dto';
import { ReviewExhibitionDto } from './dto/review-exhibition.dto';
import { CloseExhibitionDto } from './dto/close-exhibition.dto';

import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import {
  decrementBranchStock,
  incrementBranchStock,
  writeStockMovement,
} from '../common/helpers/stock.helper';

@Injectable()
export class ExhibitionsService {
  constructor(
    @InjectRepository(Exhibition)
    private readonly exhibitionRepo: Repository<Exhibition>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Create exhibition request ─────────────────────────────────────────────────
  async createExhibition(
    dto: CreateExhibitionDto,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<Exhibition> {
    if (!user.branchId) {
      throw new ForbiddenException('Exhibitions must be requested from a branch context');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const exhibition = this.exhibitionRepo.create({
        name: dto.name,
        location: dto.location,
        sourceBranchId: user.branchId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        requestedById: user.userId,
        status: ExhibitionStatus.REQUESTED,
        approvedById: null,
        assignedUserId: dto.assignedUserId || null,
      });

      const savedExhibition = await queryRunner.manager.save(Exhibition, exhibition);

      // Create stock entries (no quantity movement yet — that happens on dispatch)
      const stockItems = dto.items.map((item) =>
        queryRunner.manager.create(ExhibitionStock, {
          exhibitionId: savedExhibition.id,
          bookId: item.bookId,
          quantityTaken: item.quantityTaken,
          quantitySold: 0,
          quantityReturned: 0,
          quantityDamaged: 0,
          quantityLost: 0,
        }),
      );
      await queryRunner.manager.save(ExhibitionStock, stockItems);

      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,NULL,?,?,DEFAULT)',
        [user.userId, 'EXHIBITION_REQUESTED', 'Exhibition', savedExhibition.id, JSON.stringify(savedExhibition), ipAddress],
      );

      await queryRunner.commitTransaction();
      this.notificationsService.triggerRefresh('exhibition_changed');
      return this.findOne(savedExhibition.id, user);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── List exhibitions ─────────────────────────────────────────────────────────
  async findAll(user: JwtPayload): Promise<Exhibition[]> {
    const qb = this.exhibitionRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.sourceBranch', 'branch')
      .leftJoinAndSelect('e.requestedBy', 'reqBy')
      .leftJoinAndSelect('e.stock', 'stock')
      .leftJoinAndSelect('stock.book', 'book')
      .leftJoinAndSelect('e.assignedUser', 'assignedUser')
      .orderBy('e.createdAt', 'DESC');

    // Branch-scoped roles only see their own branch's exhibitions
    if (
      hasRole(user, UserRole.BRANCH_MANAGER) ||
      hasRole(user, UserRole.BRANCH_INVENTORY) ||
      hasRole(user, UserRole.BRANCH_FRONT_OFFICE)
    ) {
      qb.where('e.source_branch_id = :branchId', { branchId: user.branchId });
    }

    return qb.getMany();
  }

  // ── Find one ──────────────────────────────────────────────────────────────────
  async findOne(id: string, user: JwtPayload): Promise<Exhibition> {
    const exhibition = await this.exhibitionRepo.findOne({
      where: { id },
      relations: ['sourceBranch', 'requestedBy', 'approvedBy', 'assignedUser', 'stock', 'stock.book'],
    });

    if (!exhibition) throw new NotFoundException(`Exhibition ${id} not found`);

    // Branch-scoped boundary
    if (
      hasRole(user, UserRole.BRANCH_MANAGER) ||
      hasRole(user, UserRole.BRANCH_INVENTORY) ||
      hasRole(user, UserRole.BRANCH_FRONT_OFFICE)
    ) {
      if (exhibition.sourceBranchId !== user.branchId) {
        throw new ForbiddenException('Access restricted to your branch exhibitions');
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
    const exhibition = await this.findOne(id, user);

    if (exhibition.status !== ExhibitionStatus.REQUESTED) {
      throw new ConflictException(`Cannot approve exhibition in status ${exhibition.status}`);
    }

    await this.exhibitionRepo.update(id, {
      status: ExhibitionStatus.APPROVED,
      approvedById: user.userId,
    });

    await this.dataSource.manager.query(
      'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,?,?,?,DEFAULT)',
      [user.userId, 'EXHIBITION_APPROVED', 'Exhibition', id, JSON.stringify({ status: 'REQUESTED' }), JSON.stringify({ status: 'APPROVED', note: dto.note }), ipAddress],
    );

    this.notificationsService.triggerRefresh('exhibition_changed');
    return this.findOne(id, user);
  }

  // ── Reject exhibition ─────────────────────────────────────────────────────────
  async rejectExhibition(
    id: string,
    dto: ReviewExhibitionDto,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<Exhibition> {
    const exhibition = await this.findOne(id, user);

    if (exhibition.status !== ExhibitionStatus.REQUESTED) {
      throw new ConflictException(`Cannot reject exhibition in status ${exhibition.status}`);
    }

    await this.exhibitionRepo.update(id, { 
      status: ExhibitionStatus.REJECTED,
      rejectionReason: dto.note || null,
    });

    await this.dataSource.manager.query(
      'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,?,?,?,DEFAULT)',
      [user.userId, 'EXHIBITION_REJECTED', 'Exhibition', id, JSON.stringify({ status: 'REQUESTED' }), JSON.stringify({ status: 'REJECTED', note: dto.note }), ipAddress],
    );

    this.notificationsService.triggerRefresh('exhibition_changed');
    return this.findOne(id, user);
  }

  // ── Dispatch — decrement branch stock, mark ONGOING ───────────────────────────
  async dispatchExhibition(
    id: string,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<Exhibition> {
    const exhibition = await this.findOne(id, user);

    if (exhibition.status !== ExhibitionStatus.APPROVED) {
      throw new ConflictException(`Cannot dispatch exhibition in status ${exhibition.status}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
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

      await queryRunner.manager.update(Exhibition, { id }, { status: ExhibitionStatus.ONGOING });

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
    const exhibition = await this.findOne(id, user);

    if (exhibition.status !== ExhibitionStatus.ONGOING) {
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
        closeItem.quantityLost;

      if (total !== stockItem.quantityTaken) {
        throw new BadRequestException(
          `Reconciliation failed for book ${stockItem.bookId}: ` +
          `taken=${stockItem.quantityTaken} but sold(${closeItem.quantitySold}) + ` +
          `returned(${closeItem.quantityReturned}) + damaged(${closeItem.quantityDamaged}) + ` +
          `lost(${closeItem.quantityLost}) = ${total}`,
        );
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const closeItem of dto.items) {
        const stockItem = exhibition.stock.find((s) => s.id === closeItem.stockId)!;

        // Update exhibition stock with reconciliation data
        await queryRunner.manager.update(ExhibitionStock, { id: closeItem.stockId }, {
          quantitySold: closeItem.quantitySold,
          quantityReturned: closeItem.quantityReturned,
          quantityDamaged: closeItem.quantityDamaged,
          quantityLost: closeItem.quantityLost,
        });

        // Return unsold + returned books back to branch inventory
        const qtyToReturn = closeItem.quantityReturned;
        if (qtyToReturn > 0) {
          await incrementBranchStock(
            queryRunner,
            exhibition.sourceBranchId,
            stockItem.bookId,
            qtyToReturn,
          );

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

      await queryRunner.manager.update(Exhibition, { id }, { status: ExhibitionStatus.CLOSED });

      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,?,?,?,DEFAULT)',
        [user.userId, 'EXHIBITION_CLOSED', 'Exhibition', id, null, JSON.stringify({ note: dto.note }), ipAddress],
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
}
