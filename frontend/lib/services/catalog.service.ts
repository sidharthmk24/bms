import 'server-only';
import { getDataSource } from '../db/data-source';
import { Like } from 'typeorm';
import { Book } from '../api-backend/catalog/entities/book.entity';
import { Author } from '../api-backend/catalog/entities/author.entity';
import { Publisher } from '../api-backend/catalog/entities/publisher.entity';
import { Category } from '../api-backend/catalog/entities/category.entity';
import { Supplier } from '../api-backend/catalog/entities/supplier.entity';
import { AuditLog } from '../api-backend/audit/entities/audit-log.entity';
import { NotificationsService } from './notifications.service';
import { ConflictException, NotFoundException, BadRequestException } from '../errors';

// Simple in-memory cache for Next.js monolithic runtime
const cache = new Map<string, { value: any, expiresAt: number }>();
const getCache = <T>(key: string): T | null => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.value as T;
};
const setCache = (key: string, value: any, ttlMs: number = 300000) => {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
};
const delCache = (key: string) => cache.delete(key);

export class CatalogService {
  private notificationsService = new NotificationsService();

  private async getRepos() {
    const ds = await getDataSource();
    return {
      bookRepo: ds.getRepository(Book),
      authorRepo: ds.getRepository(Author),
      publisherRepo: ds.getRepository(Publisher),
      categoryRepo: ds.getRepository(Category),
      supplierRepo: ds.getRepository(Supplier),
      auditRepo: ds.getRepository(AuditLog),
    };
  }

  // ── 1. AUTHOR ─────────────────────────────────────────────────────────
  async findAllAuthors(): Promise<Author[]> {
    const cacheKey = 'catalog:authors:all';
    const cached = getCache<Author[]>(cacheKey);
    if (cached) return cached;

    const { authorRepo } = await this.getRepos();
    const authors = await authorRepo.find({ order: { name: 'ASC' } });
    setCache(cacheKey, authors);
    return authors;
  }

  async createAuthor(dto: any): Promise<Author> {
    const { authorRepo } = await this.getRepos();
    const author = await authorRepo.save(dto);
    delCache('catalog:authors:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return author;
  }

  async updateAuthor(id: string, dto: any): Promise<Author> {
    const { authorRepo } = await this.getRepos();
    const author = await authorRepo.findOne({ where: { id } });
    if (!author) throw new NotFoundException(`Author with ID ${id} not found`);

    Object.assign(author, dto);
    const updated = await authorRepo.save(author);
    delCache('catalog:authors:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return updated;
  }

  async deleteAuthor(id: string): Promise<void> {
    const { authorRepo, bookRepo } = await this.getRepos();
    
    // Block delete if there are active books referencing this author
    const activeBooksCount = await bookRepo.count({ where: { authorId: id, isActive: true } });
    if (activeBooksCount > 0) {
      throw new ConflictException('Cannot delete this author because it is referenced by one or more active books.');
    }

    try {
      const result = await authorRepo.delete(id);
      if (result.affected === 0) throw new NotFoundException(`Author with ID ${id} not found`);
    } catch (err: any) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451 || String(err.message).includes('foreign key')) {
        throw new ConflictException('Cannot delete this author because it is referenced by one or more books.');
      }
      throw err;
    }
    delCache('catalog:authors:all');
    this.notificationsService.triggerRefresh('catalog_changed');
  }

  // ── 2. PUBLISHER ──────────────────────────────────────────────────────
  async findAllPublishers(): Promise<Publisher[]> {
    const cacheKey = 'catalog:publishers:all';
    const cached = getCache<Publisher[]>(cacheKey);
    if (cached) return cached;

    const { publisherRepo } = await this.getRepos();
    const publishers = await publisherRepo.find({ order: { name: 'ASC' } });
    setCache(cacheKey, publishers);
    return publishers;
  }

  async createPublisher(dto: any): Promise<Publisher> {
    const { publisherRepo } = await this.getRepos();
    const publisher = await publisherRepo.save(dto);
    delCache('catalog:publishers:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return publisher;
  }

  async updatePublisher(id: string, dto: any): Promise<Publisher> {
    const { publisherRepo } = await this.getRepos();
    const publisher = await publisherRepo.findOne({ where: { id } });
    if (!publisher) throw new NotFoundException(`Publisher with ID ${id} not found`);

    Object.assign(publisher, dto);
    const updated = await publisherRepo.save(publisher);
    delCache('catalog:publishers:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return updated;
  }

  async deletePublisher(id: string): Promise<void> {
    const { publisherRepo, bookRepo } = await this.getRepos();

    // Block delete if there are active books referencing this publisher
    const activeBooksCount = await bookRepo.count({ where: { publisherId: id, isActive: true } });
    if (activeBooksCount > 0) {
      throw new ConflictException('Cannot delete this publisher because it is referenced by one or more active books.');
    }

    try {
      const result = await publisherRepo.delete(id);
      if (result.affected === 0) throw new NotFoundException(`Publisher with ID ${id} not found`);
    } catch (err: any) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451 || String(err.message).includes('foreign key')) {
        throw new ConflictException('Cannot delete this publisher because it is referenced by one or more books.');
      }
      throw err;
    }
    delCache('catalog:publishers:all');
    this.notificationsService.triggerRefresh('catalog_changed');
  }

  // ── 3. CATEGORY ───────────────────────────────────────────────────────
  async findAllCategories(): Promise<Category[]> {
    const cacheKey = 'catalog:categories:all';
    const cached = getCache<Category[]>(cacheKey);
    if (cached) return cached;

    const { categoryRepo } = await this.getRepos();
    const categories = await categoryRepo.find({
      relations: ['parent'],
      order: { name: 'ASC' },
    });
    setCache(cacheKey, categories);
    return categories;
  }

  async createCategory(dto: any): Promise<Category> {
    const { categoryRepo } = await this.getRepos();
    const category = categoryRepo.create(dto as object);
    const saved = await categoryRepo.save(category);
    delCache('catalog:categories:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return saved;
  }

  async updateCategory(id: string, dto: any): Promise<Category> {
    const { categoryRepo } = await this.getRepos();
    const category = await categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException(`Category with ID ${id} not found`);

    Object.assign(category, dto);
    const updated = await categoryRepo.save(category);
    delCache('catalog:categories:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    const { categoryRepo, bookRepo } = await this.getRepos();

    // Block delete if there are active books referencing this category
    const activeBooksCount = await bookRepo.count({ where: { categoryId: id, isActive: true } });
    if (activeBooksCount > 0) {
      throw new ConflictException('Cannot delete this category because it is referenced by one or more active books.');
    }

    try {
      const result = await categoryRepo.delete(id);
      if (result.affected === 0) throw new NotFoundException(`Category with ID ${id} not found`);
    } catch (err: any) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451 || String(err.message).includes('foreign key')) {
        throw new ConflictException('Cannot delete this category because it is referenced by one or more books.');
      }
      throw err;
    }
    delCache('catalog:categories:all');
    this.notificationsService.triggerRefresh('catalog_changed');
  }

  // ── 4. SUPPLIER ───────────────────────────────────────────────────────
  async findAllSuppliers(): Promise<Supplier[]> {
    const { supplierRepo } = await this.getRepos();

    // Ensure Kairali Books in-house supplier exists
    const existingKairali = await supplierRepo.findOne({
      where: { name: 'Kairali Books' },
    });
    if (!existingKairali) {
      await supplierRepo.save({
        name: 'Kairali Books',
        contactPerson: 'Kairali Publications In-House Press',
        phone: '0495-2720000',
        email: 'publishing@kairalibooks.com',
        address: 'Kozhikode, Kerala',
      });
      delCache('catalog:suppliers:all');
    }

    const cacheKey = 'catalog:suppliers:all';
    const cached = getCache<Supplier[]>(cacheKey);
    if (cached) return cached;

    const suppliers = await supplierRepo.find({ order: { name: 'ASC' } });
    setCache(cacheKey, suppliers);
    return suppliers;
  }

  async createSupplier(dto: any): Promise<Supplier> {
    const { supplierRepo } = await this.getRepos();
    const supplier = await supplierRepo.save(dto);
    delCache('catalog:suppliers:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return supplier;
  }

  async updateSupplier(id: string, dto: any): Promise<Supplier> {
    const { supplierRepo } = await this.getRepos();
    const supplier = await supplierRepo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException(`Supplier with ID ${id} not found`);

    Object.assign(supplier, dto);
    const updated = await supplierRepo.save(supplier);
    delCache('catalog:suppliers:all');
    this.notificationsService.triggerRefresh('catalog_changed');
    return updated;
  }

  async deleteSupplier(id: string): Promise<void> {
    const { supplierRepo } = await this.getRepos();
    try {
      const result = await supplierRepo.delete(id);
      if (result.affected === 0) throw new NotFoundException(`Supplier with ID ${id} not found`);
    } catch (err: any) {
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451 || String(err.message).includes('foreign key')) {
        throw new ConflictException('Cannot delete this supplier because it is referenced by one or more products or purchase orders.');
      }
      throw err;
    }
    delCache('catalog:suppliers:all');
    this.notificationsService.triggerRefresh('catalog_changed');
  }

  // ── 5. BOOK ───────────────────────────────────────────────────────────
  async findAllBooks(query: any) {
    const { bookRepo } = await this.getRepos();
    const { search, categoryId, authorId, publisherId, page = 1, limit = 10, sortBy = 'title', order = 'ASC' } = query;
    
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const allowedSortFields = ['title', 'price', 'createdAt'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'title';
    const validOrder = (order as string || '').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const qb = bookRepo.createQueryBuilder('book')
      .leftJoinAndSelect('book.author', 'author')
      .leftJoinAndSelect('book.publisher', 'publisher')
      .leftJoinAndSelect('book.category', 'category')
      .where('book.isActive = :isActive', { isActive: true });

    if (categoryId) qb.andWhere('book.categoryId = :categoryId', { categoryId });
    if (authorId) qb.andWhere('book.authorId = :authorId', { authorId });
    if (publisherId) qb.andWhere('book.publisherId = :publisherId', { publisherId });

    if (search && String(search).trim()) {
      const rawSearch = String(search).trim().toLowerCase();
      const keywords = rawSearch.split(/\s+/).filter(Boolean);

      keywords.forEach((kw, idx) => {
        const pKw = `kw_${idx}`;
        const pClean = `kw_clean_${idx}`;
        const cleanKw = kw.replace(/[-_\s]/g, '');

        if (cleanKw && cleanKw !== kw) {
          qb.andWhere(
            `(LOWER(book.title) LIKE :${pKw} OR ` +
            `LOWER(book.isbn) LIKE :${pKw} OR ` +
            `REPLACE(LOWER(book.isbn), '-', '') LIKE :${pClean} OR ` +
            `LOWER(book.barcode) LIKE :${pKw} OR ` +
            `LOWER(author.name) LIKE :${pKw} OR ` +
            `LOWER(category.name) LIKE :${pKw} OR ` +
            `LOWER(publisher.name) LIKE :${pKw})`,
            { [pKw]: `%${kw}%`, [pClean]: `%${cleanKw}%` }
          );
        } else {
          qb.andWhere(
            `(LOWER(book.title) LIKE :${pKw} OR ` +
            `LOWER(book.isbn) LIKE :${pKw} OR ` +
            `LOWER(book.barcode) LIKE :${pKw} OR ` +
            `LOWER(author.name) LIKE :${pKw} OR ` +
            `LOWER(category.name) LIKE :${pKw} OR ` +
            `LOWER(publisher.name) LIKE :${pKw})`,
            { [pKw]: `%${kw}%` }
          );
        }
      });
    }

    qb.orderBy(`book.${validSortBy}`, validOrder)
      .skip(skip)
      .take(limitNum);

    const [books, total] = await qb.getManyAndCount();

    return {
      books,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async findBookById(id: string): Promise<Book> {
    const cacheKey = `catalog:book:id:${id}`;
    const cached = getCache<Book>(cacheKey);
    if (cached) return cached;

    const { bookRepo } = await this.getRepos();
    const book = await bookRepo.findOne({
      where: { id },
      relations: ['author', 'publisher', 'category'],
    });

    if (!book) throw new NotFoundException(`Book with ID ${id} not found`);

    setCache(cacheKey, book);
    return book;
  }

  async findBookByBarcode(barcode: string): Promise<Book> {
    const code = barcode.trim();
    const cacheKey = `catalog:book:barcode:${code}`;
    const cached = getCache<Book>(cacheKey);
    if (cached) return cached;

    const { bookRepo } = await this.getRepos();
    const book = await bookRepo.findOne({
      where: [
        { barcode: code, isActive: true },
        { isbn: code, isActive: true },
      ],
      relations: ['author', 'publisher', 'category'],
    });

    if (!book) throw new NotFoundException(`Book with barcode/ISBN ${barcode} not found`);

    setCache(cacheKey, book);
    return book;
  }

  async findBookByIsbn(isbn: string): Promise<Book> {
    const code = isbn.trim();
    const cacheKey = `catalog:book:isbn:${code}`;
    const cached = getCache<Book>(cacheKey);
    if (cached) return cached;

    const { bookRepo } = await this.getRepos();
    const book = await bookRepo.findOne({
      where: [
        { isbn: code, isActive: true },
        { barcode: code, isActive: true },
      ],
      relations: ['author', 'publisher', 'category'],
    });

    if (!book) throw new NotFoundException(`Book with ISBN/barcode ${isbn} not found`);

    setCache(cacheKey, book);
    return book;
  }

  async createBook(dto: any, userId: string, ipAddress: string): Promise<Book> {
    const { bookRepo, authorRepo, publisherRepo, categoryRepo, auditRepo } = await this.getRepos();

    const finalBarcode = dto.barcode || dto.isbn;
    const existingIsbn = await bookRepo.findOne({ where: { isbn: dto.isbn } });
    if (existingIsbn) throw new ConflictException(`ISBN ${dto.isbn} is already registered`);

    const existingBarcode = await bookRepo.findOne({ where: { barcode: finalBarcode } });
    if (existingBarcode) throw new ConflictException(`Barcode ${finalBarcode} is already registered`);

    const author = await authorRepo.findOne({ where: { id: dto.authorId } });
    if (!author) throw new BadRequestException('Author not found');

    const publisher = await publisherRepo.findOne({ where: { id: dto.publisherId } });
    if (!publisher) throw new BadRequestException('Publisher not found');

    const category = await categoryRepo.findOne({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Category not found');

    const book = bookRepo.create({
      ...dto,
      barcode: finalBarcode,
      isActive: true,
    } as object);
    const saved = await bookRepo.save(book);

    await auditRepo.save({
      userId,
      action: 'BOOK_CREATED',
      entityType: 'Book',
      entityId: saved.id,
      beforeJson: null,
      afterJson: saved,
      ipAddress,
    });

    this.notificationsService.triggerRefresh('catalog_changed');

    return saved;
  }

  async updateBook(id: string, dto: any, userId: string, ipAddress: string): Promise<Book> {
    const { bookRepo, auditRepo } = await this.getRepos();
    const book = await bookRepo.findOne({ where: { id, isActive: true } });
    if (!book) throw new NotFoundException(`Book with ID ${id} not found`);

    const beforeState = { ...book };
    const oldBarcode = book.barcode;

    if (dto.isbn && dto.isbn !== book.isbn) {
      const existing = await bookRepo.findOne({ where: { isbn: dto.isbn } });
      if (existing) throw new ConflictException(`ISBN ${dto.isbn} is already registered`);
    }

    const finalBarcode = dto.barcode || (dto.isbn ? dto.isbn : book.barcode);
    if (finalBarcode !== book.barcode) {
      const existing = await bookRepo.findOne({ where: { barcode: finalBarcode } });
      if (existing) throw new ConflictException(`Barcode ${finalBarcode} is already registered`);
    }

    Object.assign(book, {
      ...dto,
      barcode: finalBarcode,
    });

    const updated = await bookRepo.save(book);

    delCache(`catalog:book:id:${id}`);
    delCache(`catalog:book:barcode:${oldBarcode}`);
    if (finalBarcode !== oldBarcode) {
      delCache(`catalog:book:barcode:${finalBarcode}`);
    }

    await auditRepo.save({
      userId,
      action: 'BOOK_UPDATED',
      entityType: 'Book',
      entityId: id,
      beforeJson: beforeState,
      afterJson: updated,
      ipAddress,
    });

    this.notificationsService.triggerRefresh('catalog_changed');

    return updated;
  }

  async deleteBook(id: string, userId: string, ipAddress: string): Promise<void> {
    const { bookRepo, auditRepo } = await this.getRepos();
    const book = await bookRepo.findOne({ where: { id, isActive: true } });
    if (!book) throw new NotFoundException(`Book with ID ${id} not found`);

    book.isActive = false;
    await bookRepo.save(book);

    delCache(`catalog:book:id:${id}`);
    delCache(`catalog:book:barcode:${book.barcode}`);

    await auditRepo.save({
      userId,
      action: 'BOOK_DEACTIVATED',
      entityType: 'Book',
      entityId: id,
      beforeJson: { title: book.title, isbn: book.isbn, isActive: true },
      afterJson: { title: book.title, isbn: book.isbn, isActive: false },
      ipAddress,
    });

    this.notificationsService.triggerRefresh('catalog_changed');
  }
}
