import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

// ── Entity imports ────────────────────────────────────────────────────────────
import { Book } from './entities/book.entity';
import { Author } from './entities/author.entity';
import { Publisher } from './entities/publisher.entity';
import { Category } from './entities/category.entity';
import { Supplier } from './entities/supplier.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

// ── DTO imports ───────────────────────────────────────────────────────────────
import { CreateAuthorDto, UpdateAuthorDto } from './dto/author.dto';
import { CreatePublisherDto, UpdatePublisherDto } from './dto/publisher.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';
import { GetBooksQueryDto } from './dto/get-books-query.dto';

// ── SSE Notification import ──────────────────────────────────────────────────
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
    @InjectRepository(Publisher)
    private readonly publisherRepository: Repository<Publisher>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── 1. AUTHOR CRUD ─────────────────────────────────────────────────────────

  async findAllAuthors(): Promise<Author[]> {
    const cacheKey = 'catalog:authors:all';
    const cached = await this.cacheManager.get<Author[]>(cacheKey);
    if (cached) return cached;

    const authors = await this.authorRepository.find({ order: { name: 'ASC' } });
    await this.cacheManager.set(cacheKey, authors, 300000); // 5 mins
    return authors;
  }

  async createAuthor(dto: CreateAuthorDto): Promise<Author> {
    const author = await this.authorRepository.save(dto);
    await this.cacheManager.del('catalog:authors:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return author;
  }

  async updateAuthor(id: string, dto: UpdateAuthorDto): Promise<Author> {
    const author = await this.authorRepository.findOne({ where: { id } });
    if (!author) throw new NotFoundException(`Author with ID ${id} not found`);

    Object.assign(author, dto);
    const updated = await this.authorRepository.save(author);
    await this.cacheManager.del('catalog:authors:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return updated;
  }

  async deleteAuthor(id: string): Promise<void> {
    const result = await this.authorRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Author with ID ${id} not found`);
    await this.cacheManager.del('catalog:authors:all');
    this.notificationsService.triggerRefresh('catalog_changed');
  }

  // ── 2. PUBLISHER CRUD ──────────────────────────────────────────────────────

  async findAllPublishers(): Promise<Publisher[]> {
    const cacheKey = 'catalog:publishers:all';
    const cached = await this.cacheManager.get<Publisher[]>(cacheKey);
    if (cached) return cached;

    const publishers = await this.publisherRepository.find({ order: { name: 'ASC' } });
    await this.cacheManager.set(cacheKey, publishers, 300000);
    return publishers;
  }

  async createPublisher(dto: CreatePublisherDto): Promise<Publisher> {
    const publisher = await this.publisherRepository.save(dto);
    await this.cacheManager.del('catalog:publishers:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return publisher;
  }

  async updatePublisher(id: string, dto: UpdatePublisherDto): Promise<Publisher> {
    const publisher = await this.publisherRepository.findOne({ where: { id } });
    if (!publisher) throw new NotFoundException(`Publisher with ID ${id} not found`);

    Object.assign(publisher, dto);
    const updated = await this.publisherRepository.save(publisher);
    await this.cacheManager.del('catalog:publishers:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return updated;
  }

  async deletePublisher(id: string): Promise<void> {
    const result = await this.publisherRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Publisher with ID ${id} not found`);
    await this.cacheManager.del('catalog:publishers:all');
    this.notificationsService.triggerRefresh('catalog_changed');
  }

  // ── 3. CATEGORY CRUD ───────────────────────────────────────────────────────

  async findAllCategories(): Promise<Category[]> {
    const cacheKey = 'catalog:categories:all';
    const cached = await this.cacheManager.get<Category[]>(cacheKey);
    if (cached) return cached;

    const categories = await this.categoryRepository.find({
      relations: ['parent'],
      order: { name: 'ASC' },
    });
    await this.cacheManager.set(cacheKey, categories, 300000);
    return categories;
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create(dto);
    const saved = await this.categoryRepository.save(category);
    await this.cacheManager.del('catalog:categories:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return saved;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException(`Category with ID ${id} not found`);

    Object.assign(category, dto);
    const updated = await this.categoryRepository.save(category);
    await this.cacheManager.del('catalog:categories:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    const result = await this.categoryRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Category with ID ${id} not found`);
    await this.cacheManager.del('catalog:categories:all');
    this.notificationsService.triggerRefresh('catalog_changed');
  }

  // ── 4. SUPPLIER CRUD ───────────────────────────────────────────────────────

  async findAllSuppliers(): Promise<Supplier[]> {
    const cacheKey = 'catalog:suppliers:all';
    const cached = await this.cacheManager.get<Supplier[]>(cacheKey);
    if (cached) return cached;

    const suppliers = await this.supplierRepository.find({ order: { name: 'ASC' } });
    await this.cacheManager.set(cacheKey, suppliers, 300000);
    return suppliers;
  }

  async createSupplier(dto: CreateSupplierDto): Promise<Supplier> {
    const supplier = await this.supplierRepository.save(dto);
    await this.cacheManager.del('catalog:suppliers:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return supplier;
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException(`Supplier with ID ${id} not found`);

    Object.assign(supplier, dto);
    const updated = await this.supplierRepository.save(supplier);
    await this.cacheManager.del('catalog:suppliers:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return updated;
  }

  async deleteSupplier(id: string): Promise<void> {
    const result = await this.supplierRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Supplier with ID ${id} not found`);
    await this.cacheManager.del('catalog:suppliers:all');
    this.notificationsService.triggerRefresh('catalog_changed');
  }

  // ── 5. BOOK CRUD ───────────────────────────────────────────────────────────

  async findAllBooks(query: GetBooksQueryDto) {
    const { search, categoryId, authorId, publisherId, page = 1, limit = 10, sortBy = 'title', order = 'ASC' } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    const allowedSortFields = ['title', 'price', 'createdAt'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'title';

    if (search) {
      // Find matching by title, isbn, or barcode
      where.title = Like(`%${search}%`);
      // Since or condition matches might be required, we can structure it if TypeORM supports arrays of where.
      // But standard TypeORM where: [ {title: ...}, {isbn: ...} ] behaves as OR.
      return this.bookRepository.findAndCount({
        where: [
          { ...where, title: Like(`%${search}%`) },
          { ...where, isbn: Like(`%${search}%`) },
          { ...where, barcode: Like(`%${search}%`) },
        ],
        relations: ['author', 'publisher', 'category'],
        order: { [validSortBy]: order },
        skip,
        take: limit,
      }).then(([books, total]) => ({
        books,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }));
    }

    if (categoryId) where.categoryId = categoryId;
    if (authorId) where.authorId = authorId;
    if (publisherId) where.publisherId = publisherId;

    const [books, total] = await this.bookRepository.findAndCount({
      where,
      relations: ['author', 'publisher', 'category'],
      order: { [validSortBy]: order },
      skip,
      take: limit,
    });

    return {
      books,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBookById(id: string): Promise<Book> {
    const cacheKey = `catalog:book:id:${id}`;
    const cached = await this.cacheManager.get<Book>(cacheKey);
    if (cached) return cached;

    const book = await this.bookRepository.findOne({
      where: { id, isActive: true },
      relations: ['author', 'publisher', 'category'],
    });

    if (!book) throw new NotFoundException(`Book with ID ${id} not found`);

    await this.cacheManager.set(cacheKey, book, 300000); // 5 mins
    return book;
  }

  async findBookByBarcode(barcode: string): Promise<Book> {
    const cacheKey = `catalog:book:barcode:${barcode}`;
    const cached = await this.cacheManager.get<Book>(cacheKey);
    if (cached) return cached;

    const book = await this.bookRepository.findOne({
      where: { barcode, isActive: true },
      relations: ['author', 'publisher', 'category'],
    });

    if (!book) throw new NotFoundException(`Book with barcode ${barcode} not found`);

    await this.cacheManager.set(cacheKey, book, 300000);
    return book;
  }

  async createBook(dto: CreateBookDto, userId: string, ipAddress: string): Promise<Book> {
    // 1. Validate ISBN and Barcode unique
    const finalBarcode = dto.barcode || dto.isbn;
    const existingIsbn = await this.bookRepository.findOne({ where: { isbn: dto.isbn } });
    if (existingIsbn) throw new ConflictException(`ISBN ${dto.isbn} is already registered`);

    const existingBarcode = await this.bookRepository.findOne({ where: { barcode: finalBarcode } });
    if (existingBarcode) throw new ConflictException(`Barcode ${finalBarcode} is already registered`);

    // 2. Validate FK relations exist
    const author = await this.authorRepository.findOne({ where: { id: dto.authorId } });
    if (!author) throw new BadRequestException('Author not found');

    const publisher = await this.publisherRepository.findOne({ where: { id: dto.publisherId } });
    if (!publisher) throw new BadRequestException('Publisher not found');

    const category = await this.categoryRepository.findOne({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Category not found');

    // 3. Save Book
    const book = this.bookRepository.create({
      ...dto,
      barcode: finalBarcode,
      isActive: true,
    });
    const saved = await this.bookRepository.save(book);

    // 4. Audit Log
    await this.auditLogRepository.save({
      userId,
      action: 'BOOK_CREATED',
      entityType: 'Book',
      entityId: saved.id,
      beforeJson: null,
      afterJson: saved,
      ipAddress,
    });

    // 5. SSE Sync trigger
    this.notificationsService.triggerRefresh('catalog_changed');

    return saved;
  }

  async updateBook(id: string, dto: UpdateBookDto, userId: string, ipAddress: string): Promise<Book> {
    const book = await this.bookRepository.findOne({ where: { id, isActive: true } });
    if (!book) throw new NotFoundException(`Book with ID ${id} not found`);

    const beforeState = { ...book };
    const oldBarcode = book.barcode;

    // Check ISBN unique
    if (dto.isbn && dto.isbn !== book.isbn) {
      const existing = await this.bookRepository.findOne({ where: { isbn: dto.isbn } });
      if (existing) throw new ConflictException(`ISBN ${dto.isbn} is already registered`);
    }

    // Check Barcode unique
    const finalBarcode = dto.barcode || (dto.isbn ? dto.isbn : book.barcode);
    if (finalBarcode !== book.barcode) {
      const existing = await this.bookRepository.findOne({ where: { barcode: finalBarcode } });
      if (existing) throw new ConflictException(`Barcode ${finalBarcode} is already registered`);
    }

    // Apply updates
    Object.assign(book, {
      ...dto,
      barcode: finalBarcode,
    });

    const updated = await this.bookRepository.save(book);

    // Invalidate individual caches
    await this.cacheManager.del(`catalog:book:id:${id}`);
    await this.cacheManager.del(`catalog:book:barcode:${oldBarcode}`);
    if (finalBarcode !== oldBarcode) {
      await this.cacheManager.del(`catalog:book:barcode:${finalBarcode}`);
    }

    // Audit Log
    await this.auditLogRepository.save({
      userId,
      action: 'BOOK_UPDATED',
      entityType: 'Book',
      entityId: id,
      beforeJson: beforeState,
      afterJson: updated,
      ipAddress,
    });

    // SSE Sync
    this.notificationsService.triggerRefresh('catalog_changed');

    return updated;
  }

  async deleteBook(id: string, userId: string, ipAddress: string): Promise<void> {
    const book = await this.bookRepository.findOne({ where: { id, isActive: true } });
    if (!book) throw new NotFoundException(`Book with ID ${id} not found`);

    book.isActive = false;
    await this.bookRepository.save(book);

    // Invalidate caches
    await this.cacheManager.del(`catalog:book:id:${id}`);
    await this.cacheManager.del(`catalog:book:barcode:${book.barcode}`);

    // Audit Log
    await this.auditLogRepository.save({
      userId,
      action: 'BOOK_DEACTIVATED',
      entityType: 'Book',
      entityId: id,
      beforeJson: { title: book.title, isbn: book.isbn, isActive: true },
      afterJson: { title: book.title, isbn: book.isbn, isActive: false },
      ipAddress,
    });

    // SSE Sync
    this.notificationsService.triggerRefresh('catalog_changed');
  }
}
