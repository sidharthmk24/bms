import { hasRole } from '../common/helpers/role.helper';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { BookEnquiry, EnquiryStatus } from './entities/book-enquiry.entity';
import { NewTitleRequest, NewTitleRequestStatus } from './entities/new-title-request.entity';
import { CreateEnquiryDto, UpdateEnquiryStatusDto } from './dto/enquiry.dto';
import { CreateNewTitleRequestDto, ReviewNewTitleRequestDto } from './dto/new-title-request.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EnquiriesService {
  constructor(
    @InjectRepository(BookEnquiry)
    private readonly enquiryRepo: Repository<BookEnquiry>,
    @InjectRepository(NewTitleRequest)
    private readonly newTitleRepo: Repository<NewTitleRequest>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Create enquiry ────────────────────────────────────────────────────────────
  async createEnquiry(
    dto: CreateEnquiryDto,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<BookEnquiry> {
    if (!user.branchId) {
      throw new ForbiddenException('Enquiries must be logged from a branch context');
    }

    // Business rule: exactly one of bookId or freeTextTitle must be provided
    if (!dto.bookId && !dto.freeTextTitle) {
      throw new BadRequestException('Either bookId or freeTextTitle must be provided');
    }
    if (dto.bookId && dto.freeTextTitle) {
      throw new BadRequestException('Provide either bookId or freeTextTitle — not both');
    }

    const enquiry = this.enquiryRepo.create({
      bookId: dto.bookId ?? null,
      freeTextTitle: dto.freeTextTitle ?? null,
      branchId: user.branchId,
      loggedById: user.userId,
      customerName: dto.customerName ?? null,
      customerPhone: dto.customerPhone ?? null,
      status: EnquiryStatus.OPEN,
    });

    const saved = await this.enquiryRepo.save(enquiry);
    this.notificationsService.triggerRefresh('enquiry_changed');
    return saved;
  }

  // ── List enquiries ────────────────────────────────────────────────────────────
  async findAllEnquiries(user: JwtPayload): Promise<BookEnquiry[]> {
    const qb = this.enquiryRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.book', 'book')
      .leftJoinAndSelect('e.branch', 'branch')
      .leftJoinAndSelect('e.loggedBy', 'loggedBy')
      .orderBy('e.createdAt', 'DESC');

    if (
      hasRole(user, UserRole.BRANCH_MANAGER) ||
      hasRole(user, UserRole.BRANCH_INVENTORY) ||
      hasRole(user, UserRole.BRANCH_FRONT_OFFICE)
    ) {
      qb.where('e.branch_id = :branchId', { branchId: user.branchId });
    }

    return qb.getMany();
  }

  // ── Update enquiry status ─────────────────────────────────────────────────────
  async updateEnquiryStatus(
    id: string,
    dto: UpdateEnquiryStatusDto,
    user: JwtPayload,
  ): Promise<BookEnquiry> {
    const enquiry = await this.enquiryRepo.findOne({
      where: { id },
      relations: ['branch'],
    });
    if (!enquiry) throw new NotFoundException(`Enquiry ${id} not found`);

    // Branch-scoped boundary
    if (
      (hasRole(user, UserRole.BRANCH_MANAGER) ||
        hasRole(user, UserRole.BRANCH_INVENTORY) ||
        hasRole(user, UserRole.BRANCH_FRONT_OFFICE)) &&
      enquiry.branchId !== user.branchId
    ) {
      throw new ForbiddenException('Access restricted to your branch enquiries');
    }

    enquiry.status = dto.status;
    const updated = await this.enquiryRepo.save(enquiry);
    this.notificationsService.triggerRefresh('enquiry_changed');
    return updated;
  }

  // ── Demand summary — grouped by book across all branches ─────────────────────
  async getDemandSummary(): Promise<any[]> {
    // For known books: group by bookId, count distinct branches and total enquiries
    const knownBooks = await this.dataSource.manager.query(`
      SELECT
        be.book_id AS bookId,
        b.title AS title,
        b.isbn AS isbn,
        COUNT(be.id) AS totalEnquiries,
        COUNT(DISTINCT be.branch_id) AS branchCount,
        MAX(be.created_at) AS lastEnquiredAt
      FROM book_enquiry be
      JOIN \`book\` b ON b.id = be.book_id
      WHERE be.book_id IS NOT NULL
        AND be.status NOT IN ('FULFILLED','CLOSED')
      GROUP BY be.book_id, b.title, b.isbn
      ORDER BY totalEnquiries DESC
    `);

    // For unknown titles: group by freeTextTitle
    const unknownTitles = await this.dataSource.manager.query(`
      SELECT
        NULL AS bookId,
        be.free_text_title AS title,
        NULL AS isbn,
        COUNT(be.id) AS totalEnquiries,
        COUNT(DISTINCT be.branch_id) AS branchCount,
        MAX(be.created_at) AS lastEnquiredAt
      FROM book_enquiry be
      WHERE be.free_text_title IS NOT NULL
        AND be.book_id IS NULL
        AND be.status NOT IN ('FULFILLED','CLOSED')
      GROUP BY be.free_text_title
      ORDER BY totalEnquiries DESC
    `);

    return [
      ...knownBooks.map((r: any) => ({ ...r, type: 'IN_CATALOG' })),
      ...unknownTitles.map((r: any) => ({ ...r, type: 'NOT_IN_CATALOG' })),
    ].sort((a, b) => b.totalEnquiries - a.totalEnquiries);
  }

  // ── New Title Requests ────────────────────────────────────────────────────────
  async createNewTitleRequest(
    dto: CreateNewTitleRequestDto,
    user: JwtPayload,
  ): Promise<NewTitleRequest> {
    // If same freeTextTitle already exists (PENDING), increment count instead
    const existing = await this.newTitleRepo.findOne({
      where: {
        freeTextTitle: dto.freeTextTitle,
        status: NewTitleRequestStatus.PENDING,
      },
    });

    if (existing) {
      existing.enquiryCount += 1;
      const updated = await this.newTitleRepo.save(existing);
      this.notificationsService.triggerRefresh('new_title_changed');
      return updated;
    }

    const request = this.newTitleRepo.create({
      freeTextTitle: dto.freeTextTitle,
      author: dto.author ?? null,
      isbn: dto.isbn ?? null,
      requestedById: user.userId,
      enquiryCount: 1,
      status: NewTitleRequestStatus.PENDING,
      reviewedById: null,
      createdBookId: null,
    });

    const saved = await this.newTitleRepo.save(request);
    this.notificationsService.triggerRefresh('new_title_changed');
    return saved;
  }

  async findAllNewTitleRequests(): Promise<NewTitleRequest[]> {
    return this.newTitleRepo.find({
      relations: ['requestedBy', 'reviewedBy', 'createdBook'],
      order: { enquiryCount: 'DESC', createdAt: 'DESC' },
    });
  }

  async reviewNewTitleRequest(
    id: string,
    dto: ReviewNewTitleRequestDto,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<NewTitleRequest> {
    const request = await this.newTitleRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException(`NewTitleRequest ${id} not found`);

    if (request.status !== NewTitleRequestStatus.PENDING) {
      throw new ConflictException(`Cannot review a request in status ${request.status}`);
    }

    if (dto.status === NewTitleRequestStatus.APPROVED && dto.createdBookId) {
      request.createdBookId = dto.createdBookId;
    }

    request.status = dto.status;
    request.reviewedById = user.userId;

    const updated = await this.newTitleRepo.save(request);

    await this.dataSource.manager.query(
      'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,NULL,?,?,DEFAULT)',
      [
        user.userId,
        dto.status === NewTitleRequestStatus.APPROVED ? 'NEW_TITLE_APPROVED' : 'NEW_TITLE_REJECTED',
        'NewTitleRequest',
        id,
        JSON.stringify({ status: dto.status }),
        ipAddress,
      ],
    );

    this.notificationsService.triggerRefresh('new_title_changed');
    return updated;
  }
}
