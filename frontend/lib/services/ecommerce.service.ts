import 'server-only';
import { getDataSource } from '../db/data-source';
import { Book } from '../api-backend/catalog/entities/book.entity';
import { CentralStock } from '../api-backend/inventory/entities/central-stock.entity';
import { Bill, PaymentStatus, PaymentMode } from '../api-backend/billing/entities/bill.entity';
import { BillItem } from '../api-backend/billing/entities/bill-item.entity';
import { Branch } from '../api-backend/branches/entities/branch.entity';
import { BadRequestException, NotFoundException, ConflictException } from '../errors';
import { generateBillNumber } from '../api-backend/common/helpers/bill-number.helper';
import { decrementCentralStock, writeStockMovement } from './stock.helper';


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EcomOrderItem {
  isbn13: string;
  bms_id?: string;
  title?: string;
  quantity: number;
  unit_price: number;
}

export interface EcomOrderPayload {
  web_order_id: string;
  order_timestamp?: string;
  payment: {
    gateway: string;
    gateway_transaction_id: string;
    status: 'PAID';
    amount_paid: number;
  };
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  shipping_address?: {
    recipient_name?: string;
    phone?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  items: EcomOrderItem[];
  financials?: {
    items_subtotal: number;
    shipping_charge?: number;
    discount_applied?: number;
    grand_total: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map a Book entity to the catalog response shape the website expects.
 * We expose isbn as isbn13 since that is the agreed primary key.
 */
function toBookCatalogItem(book: Book, stock: CentralStock | null) {
  return {
    bms_id: book.id,
    isbn13: book.isbn,
    title: book.title,
    author_name: book.author?.name ?? null,
    author_id: book.authorId,
    category: book.category?.name ?? null,
    language: 'Malayalam', // all Kairali titles are Malayalam — extend if multilingual
    mrp: book.price,
    sale_price: book.price,
    stock_quantity: stock?.quantity ?? 0,
    is_active: book.isActive,
    description: book.description ?? null,
    cover_image_url: book.coverImageUrl ?? null,
    publisher_name: book.publisher?.name ?? null,
    updated_at: book.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class EcommerceService {
  private async getRepos() {
    const ds = await getDataSource();
    return {
      ds,
      bookRepo: ds.getRepository(Book),
      centralStockRepo: ds.getRepository(CentralStock),
      billRepo: ds.getRepository(Bill),
      billItemRepo: ds.getRepository(BillItem),
      branchRepo: ds.getRepository(Branch),
    };
  }

  // ── 1. CATALOG SYNC ─────────────────────────────────────────────────────────
  /**
   * GET /api/v1/ecommerce/catalog
   *
   * Returns a paginated list of active books with their current central-stock
   * quantities and prices.
   *
   * Query params:
   *   page           - default 1
   *   limit          - default 100
   *   updated_since  - ISO timestamp, e.g. 2026-09-24T00:00:00Z (incremental sync)
   */
  async getCatalog(query: {
    page?: string;
    limit?: string;
    updated_since?: string;
  }) {
    const { bookRepo, centralStockRepo } = await this.getRepos();

    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(500, Math.max(1, parseInt(query.limit ?? '100', 10)));
    const skip = (page - 1) * limit;

    const qb = bookRepo
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.author', 'author')
      .leftJoinAndSelect('book.publisher', 'publisher')
      .leftJoinAndSelect('book.category', 'category')
      .where('book.isActive = :isActive', { isActive: true });

    if (query.updated_since) {
      const since = new Date(query.updated_since);
      if (isNaN(since.getTime())) {
        throw new BadRequestException('Invalid updated_since timestamp. Use ISO 8601 format.');
      }
      qb.andWhere('book.updatedAt >= :since', { since });
    }

    qb.orderBy('book.updatedAt', 'DESC').skip(skip).take(limit);

    const [books, total] = await qb.getManyAndCount();

    if (books.length === 0) {
      return { total, page, limit, books: [] };
    }

    // Fetch central stock for all books in one query
    const bookIds = books.map((b) => b.id);
    const stocks = await centralStockRepo
      .createQueryBuilder('cs')
      .where('cs.bookId IN (:...bookIds)', { bookIds })
      .getMany();

    const stockMap = new Map<string, CentralStock>();
    stocks.forEach((s) => stockMap.set(s.bookId, s));

    return {
      total,
      page,
      limit,
      books: books.map((book) => toBookCatalogItem(book, stockMap.get(book.id) ?? null)),
    };
  }

  // ── 2. LIVE INVENTORY CHECK ─────────────────────────────────────────────────
  /**
   * POST /api/v1/ecommerce/inventory/check
   *
   * Body: { "isbns": ["9788126412345", ...] }
   *
   * Returns current stock_quantity and sale_price for each ISBN so the website
   * can block checkout if any item went out-of-stock since last catalog sync.
   */
  async checkInventory(isbns: string[]) {
    if (!Array.isArray(isbns) || isbns.length === 0) {
      throw new BadRequestException('isbns must be a non-empty array of ISBN strings');
    }
    if (isbns.length > 100) {
      throw new BadRequestException('Maximum 100 ISBNs per request');
    }

    const { bookRepo, centralStockRepo } = await this.getRepos();

    const books = await bookRepo
      .createQueryBuilder('book')
      .where('book.isbn IN (:...isbns)', { isbns })
      .andWhere('book.isActive = true')
      .getMany();

    const bookMap = new Map<string, Book>();
    books.forEach((b) => bookMap.set(b.isbn, b));

    const stocks =
      books.length > 0
        ? await centralStockRepo
            .createQueryBuilder('cs')
            .where('cs.bookId IN (:...ids)', { ids: books.map((b) => b.id) })
            .getMany()
        : [];

    const stockByBookId = new Map<string, number>();
    stocks.forEach((s) => stockByBookId.set(s.bookId, s.quantity));

    return {
      inventory: isbns.map((isbn) => {
        const book = bookMap.get(isbn);
        if (!book) {
          return { isbn13: isbn, stock_quantity: 0, sale_price: null, found: false };
        }
        return {
          isbn13: isbn,
          bms_id: book.id,
          stock_quantity: stockByBookId.get(book.id) ?? 0,
          sale_price: book.price,
          found: true,
        };
      }),
    };
  }

  // ── 3. RECEIVE ONLINE ORDER ─────────────────────────────────────────────────
  /**
   * POST /api/v1/ecommerce/orders
   *
   * Called by the website immediately after a successful PayU payment.
   * Creates a Bill + BillItems in BMS, deducts from central stock, and
   * returns the BMS order ID + invoice number to the website.
   *
   * Stock is deducted from CENTRAL (warehouse) stock since online orders are
   * fulfilled from the warehouse, not a branch.
   */
  async createOnlineOrder(payload: EcomOrderPayload) {
    // Validate required fields
    if (!payload.web_order_id?.trim()) throw new BadRequestException('web_order_id is required');
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const { ds, bookRepo, centralStockRepo, billRepo, branchRepo } = await this.getRepos();

    // Guard: duplicate order
    const duplicate = await billRepo.findOne({
      where: { customerName: `[ONLINE] ${payload.web_order_id}` } as any,
    });
    if (duplicate) {
      throw new ConflictException(
        `Order ${payload.web_order_id} has already been recorded (BMS invoice: ${duplicate.billNumber})`,
      );
    }

    // Resolve the "Online Store" branch — must be pre-created in BMS
    const ecomBranchId = process.env.ECOMMERCE_BRANCH_ID;
    if (!ecomBranchId) {
      throw new BadRequestException(
        'ECOMMERCE_BRANCH_ID is not set. Please create an "Online Store" branch in BMS and add its ID to the environment.',
      );
    }

    const branch = await branchRepo.findOne({ where: { id: ecomBranchId } });
    if (!branch) {
      throw new NotFoundException(`Online Store branch (${ecomBranchId}) not found in BMS`);
    }

    // Resolve all books by ISBN
    const isbns = payload.items.map((i) => i.isbn13.trim());
    const books = await bookRepo
      .createQueryBuilder('book')
      .where('book.isbn IN (:...isbns)', { isbns })
      .andWhere('book.isActive = true')
      .getMany();

    const bookByIsbn = new Map<string, Book>();
    books.forEach((b) => bookByIsbn.set(b.isbn, b));

    // Validate all ISBNs exist
    const missingIsbns = isbns.filter((isbn) => !bookByIsbn.has(isbn));
    if (missingIsbns.length > 0) {
      throw new NotFoundException(`Books not found in BMS for ISBNs: ${missingIsbns.join(', ')}`);
    }

    // Validate stock availability
    const bookIds = books.map((b) => b.id);
    const stockRows = await centralStockRepo
      .createQueryBuilder('cs')
      .where('cs.bookId IN (:...bookIds)', { bookIds })
      .getMany();

    const stockByBookId = new Map<string, number>();
    stockRows.forEach((s) => stockByBookId.set(s.bookId, s.quantity));

    const stockErrors: string[] = [];
    for (const item of payload.items) {
      const book = bookByIsbn.get(item.isbn13.trim())!;
      const available = stockByBookId.get(book.id) ?? 0;
      if (available < item.quantity) {
        stockErrors.push(
          `"${book.title}" (ISBN: ${item.isbn13}): requested ${item.quantity}, available ${available}`,
        );
      }
    }
    if (stockErrors.length > 0) {
      throw new BadRequestException(`Insufficient stock:\n${stockErrors.join('\n')}`);
    }

    // ── Transactional: create Bill + BillItems + deduct stock ──────────────
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { v4: uuidv4 } = await import('uuid');

      // Compute totals
      let subTotal = 0;
      for (const item of payload.items) {
        subTotal += item.unit_price * item.quantity;
      }
      const discount = payload.financials?.discount_applied ?? 0;
      const totalAmount = payload.financials?.grand_total ?? subTotal - discount;

      // Generate bill number for the online-store branch
      const billNumber = await generateBillNumber(ds, branch.code, queryRunner.manager);

      // System user ID for online orders — store as a fixed sentinel or from env
      const systemUserId = process.env.ECOMMERCE_SYSTEM_USER_ID ?? '00000000-0000-0000-0000-000000000000';

      // Create the Bill
      const billId = uuidv4();
      await queryRunner.manager.query(
        `INSERT INTO bill (id, bill_number, branch_id, created_by_id, sub_total, discount, total_amount, total_cost, payment_status, payment_mode, status, customer_name, customer_phone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'PAID', 'UPI', 'COMPLETED', ?, ?, NOW(), NOW())`,
        [
          billId,
          billNumber,
          ecomBranchId,
          systemUserId,
          subTotal,
          discount,
          totalAmount,
          // customerName stores the web_order_id so warehouse staff see it instantly
          `[ONLINE] ${payload.web_order_id} — ${payload.customer.name}`,
          payload.customer.phone ?? null,
        ],
      );

      // Create BillItems + deduct central stock
      for (const item of payload.items) {
        const book = bookByIsbn.get(item.isbn13.trim())!;
        const lineTotal = item.unit_price * item.quantity;

        await queryRunner.manager.query(
          `INSERT INTO bill_item (id, bill_id, book_id, quantity, unit_price, unit_cost, line_total, created_at)
           VALUES (?, ?, ?, ?, ?, 0, ?, NOW())`,
          [uuidv4(), billId, book.id, item.quantity, item.unit_price, lineTotal],
        );

        // Deduct from central stock
        await decrementCentralStock(queryRunner, book.id, item.quantity);

        // Write stock movement for audit trail
        await writeStockMovement(queryRunner, {
          bookId: book.id,
          branchId: null,
          type: 'SALE',
          quantity: -item.quantity,
          performedById: systemUserId,
          note: `Online order ${payload.web_order_id}`,
        });
      }

      // Audit log
      await queryRunner.manager.query(
        `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, before_json, after_json, ip_address, created_at)
         VALUES (UUID(), ?, 'ONLINE_ORDER_CREATED', 'Bill', ?, NULL, ?, 'ecommerce-webhook', NOW())`,
        [
          systemUserId,
          billId,
          JSON.stringify({ web_order_id: payload.web_order_id, billNumber, totalAmount }),
        ],
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        bms_order_id: billId,
        invoice_number: billNumber,
        message: 'Order accepted for processing',
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── 4. GET ONLINE ORDERS (Dispatch Queue) ──────────────────────────────────
  /**
   * GET /api/v1/ecommerce/orders
   *
   * Returns all online orders created by the website, identified by the
   * "[ONLINE]" prefix in customerName. Warehouse staff see these as their
   * dispatch queue.
   *
   * Query params:
   *   page    - default 1
   *   limit   - default 20
   *   status  - "pending" | "dispatched" | "all" (default: "pending")
   */
  async getOnlineOrders(query: { page?: string; limit?: string; status?: string }) {
    const { billRepo } = await this.getRepos();

    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const qb = billRepo
      .createQueryBuilder('bill')
      .leftJoinAndSelect('bill.items', 'items')
      .leftJoinAndSelect('items.book', 'book')
      .leftJoinAndSelect('book.author', 'author')
      .where('bill.customerName LIKE :prefix', { prefix: '[ONLINE]%' });

    // Filter by dispatch status stored in voidReason field as a workaround
    // (voidReason = 'DISPATCHED:<courier>:<tracking>' when dispatched)
    if (query.status === 'dispatched') {
      qb.andWhere('bill.voidReason LIKE :dispatched', { dispatched: 'DISPATCHED:%' });
    } else if (query.status !== 'all') {
      // default: pending (not yet dispatched)
      qb.andWhere(
        '(bill.voidReason IS NULL OR bill.voidReason NOT LIKE :dispatched)',
        { dispatched: 'DISPATCHED:%' },
      );
    }

    qb.orderBy('bill.createdAt', 'DESC').skip(skip).take(limit);

    const [bills, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      orders: bills.map((bill) => {
        // Parse dispatch info from voidReason sentinel
        let dispatchInfo: Record<string, string | null> = {
          courier: null,
          tracking_number: null,
          tracking_url: null,
          dispatched_at: null,
        };
        if (bill.voidReason?.startsWith('DISPATCHED:')) {
          const parts = bill.voidReason.split(':');
          dispatchInfo = {
            courier: parts[1] ?? null,
            tracking_number: parts[2] ?? null,
            tracking_url: parts[3] ? decodeURIComponent(parts[3]) : null,
            dispatched_at: parts[4] ?? null,
          };
        }

        // Extract web_order_id from customerName "[ONLINE] KB-xxx — Customer Name"
        const nameField = bill.customerName ?? '';
        const webOrderId = nameField.replace('[ONLINE] ', '').split(' — ')[0].trim();

        return {
          bms_order_id: bill.id,
          web_order_id: webOrderId,
          invoice_number: bill.billNumber,
          payment_status: bill.paymentStatus,
          total_amount: bill.totalAmount,
          customer_name: nameField.split(' — ')[1]?.trim() ?? null,
          customer_phone: bill.customerPhone,
          created_at: bill.createdAt,
          is_dispatched: bill.voidReason?.startsWith('DISPATCHED:') ?? false,
          dispatch_info: dispatchInfo,
          items: bill.items?.map((item) => ({
            bms_id: item.book?.id,
            isbn13: item.book?.isbn,
            title: item.book?.title,
            author: item.book?.author?.name ?? null,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            line_total: item.lineTotal,
          })),
        };
      }),
    };
  }

  // ── 5. MARK ORDER DISPATCHED ────────────────────────────────────────────────
  /**
   * POST /api/v1/ecommerce/orders/[id]/dispatch
   *
   * Called by BMS warehouse staff after handing the package to the courier.
   * Stores dispatch info and fires the website's order-status webhook.
   *
   * Body:
   *   courier_name    - "India Post / Speed Post"
   *   tracking_number - "EK987654321IN"
   *   tracking_url    - optional full tracking URL
   */
  async markDispatched(
    bmsOrderId: string,
    body: { courier_name: string; tracking_number: string; tracking_url?: string },
  ) {
    if (!body.courier_name?.trim()) throw new BadRequestException('courier_name is required');
    if (!body.tracking_number?.trim()) throw new BadRequestException('tracking_number is required');

    const { billRepo } = await this.getRepos();

    const bill = await billRepo.findOne({ where: { id: bmsOrderId } });
    if (!bill) throw new NotFoundException(`BMS order ${bmsOrderId} not found`);
    if (!bill.customerName?.startsWith('[ONLINE]')) {
      throw new BadRequestException('This order is not an online order — cannot dispatch');
    }
    if (bill.voidReason?.startsWith('DISPATCHED:')) {
      throw new ConflictException('This order has already been marked as dispatched');
    }

    const dispatchedAt = new Date().toISOString();
    const encodedUrl = encodeURIComponent(body.tracking_url ?? '');

    // Store dispatch info in voidReason field as a sentinel (non-destructive for billing integrity)
    bill.voidReason = `DISPATCHED:${body.courier_name}:${body.tracking_number}:${encodedUrl}:${dispatchedAt}`;
    await billRepo.save(bill);

    // Extract web_order_id from customerName
    const nameField = bill.customerName ?? '';
    const webOrderId = nameField.replace('[ONLINE] ', '').split(' — ')[0].trim();

    // Fire webhook to the Kairali website
    const webhookResult = await this.fireDispatchWebhook({
      web_order_id: webOrderId,
      bms_order_id: bill.id,
      invoice_number: bill.billNumber,
      status: 'SHIPPED',
      courier_name: body.courier_name,
      tracking_number: body.tracking_number,
      tracking_url: body.tracking_url ?? null,
      dispatched_at: dispatchedAt,
    });

    return {
      success: true,
      bms_order_id: bill.id,
      web_order_id: webOrderId,
      invoice_number: bill.billNumber,
      dispatched_at: dispatchedAt,
      webhook_delivered: webhookResult.ok,
      webhook_status: webhookResult.status,
    };
  }

  // ── WEBHOOK FIRE ────────────────────────────────────────────────────────────
  private async fireDispatchWebhook(payload: Record<string, any>) {
    const webhookUrl = process.env.ECOMMERCE_WEBHOOK_URL;
    const secret = process.env.ECOMMERCE_WEBHOOK_SECRET;

    if (!webhookUrl) {
      console.warn('[EcommerceService] ECOMMERCE_WEBHOOK_URL not set — skipping webhook');
      return { ok: false, status: 0 };
    }

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bms-secret': secret ?? '',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      return { ok: res.ok, status: res.status };
    } catch (err) {
      console.error('[EcommerceService] Webhook delivery failed:', err);
      return { ok: false, status: 0 };
    }
  }
}
