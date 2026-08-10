/**
 * Seed script — creates a fully demoable system from scratch.
 *
 * Run with: npm run seed
 * Prerequisites: npm run migration:run must have been executed first.
 *
 * What gets created:
 *   - 1 warehouse + 3 branches
 *   - 9 users covering all 7 roles, password Password@123
 *   - 8 categories, 10 authors, 8 publishers, 4 suppliers
 *   - 60 books with central + branch stock (some below threshold)
 *   - 40 bills over last 30 days (CASH/UPI/UNPAID, 2 voided)
 *   - 2 restock requests (1 pending, 1 fulfilled)
 *   - 1 closed exhibition (with 2 missing copies) + 1 ongoing
 *   - 10 book enquiries across branches
 *   - 20 expenses over last 2 months
 *   - System settings seeded
 */

import 'dotenv/config';
import { getDataSource } from '../../../db/data-source';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// ── Entity imports ────────────────────────────────────────────────────────────
import { Branch, BranchType } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { UserRole as UserRoleEnum } from '../../users/enums/user-role.enum';
import { UserRole as UserRoleEntity } from '../../users/entities/user-role.entity';
import { Author } from '../../catalog/entities/author.entity';
import { Publisher } from '../../catalog/entities/publisher.entity';
import { Category } from '../../catalog/entities/category.entity';
import { Supplier } from '../../catalog/entities/supplier.entity';
import { Book } from '../../catalog/entities/book.entity';
import { CentralStock } from '../../inventory/entities/central-stock.entity';
import { BranchInventory } from '../../inventory/entities/branch-inventory.entity';
import { StockMovement, StockMovementType, MovementReferenceType } from '../../inventory/entities/stock-movement.entity';
import { Bill, PaymentStatus, PaymentMode, BillStatus } from '../../billing/entities/bill.entity';
import { BillItem } from '../../billing/entities/bill-item.entity';
import { RestockRequest, RestockRequestStatus } from '../../restock/entities/restock-request.entity';
import { RestockRequestItem } from '../../restock/entities/restock-request-item.entity';
import { Exhibition, ExhibitionStatus } from '../../exhibitions/entities/exhibition.entity';
import { ExhibitionStock } from '../../exhibitions/entities/exhibition-stock.entity';
import { BookEnquiry, EnquiryStatus } from '../../enquiries/entities/book-enquiry.entity';
import { Expense, ExpenseCategory } from '../../finance/entities/expense.entity';
import { SystemSetting } from '../../settings/entities/system-setting.entity';

// ── Helpers ───────────────────────────────────────────────────────────────────
const PASSWORD_HASH = bcrypt.hashSync('Password@123', 10);

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Main seed function ────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Connecting to database...');
  const ds = await getDataSource();
  const qr = ds.createQueryRunner();
  await qr.connect();

  try {
    console.log('🧹 Clearing existing database schema...');
    await ds.synchronize(true);
    
    console.log('🌱 Starting seed...\n');

    // ── 1. Branches ──────────────────────────────────────────────────────────
    // const warehouseId = uuidv4();
    const branch1Id = uuidv4();
    const branch2Id = uuidv4();
    const branch3Id = uuidv4();

    await qr.manager.save(Branch, [
      // { id: warehouseId, name: 'Central Warehouse', code: 'WH-01', type: BranchType.WAREHOUSE, address: '12 Industrial Area, Sector 5', city: 'Mumbai', phone: '9900001111', isActive: true },
      { id: branch1Id,   name: 'BMS Downtown',      code: 'BR-01', type: BranchType.STORE,     address: '45 MG Road, Connaught Place', city: 'Delhi', phone: '9900002222', isActive: true },
      { id: branch2Id,   name: 'BMS Westside',       code: 'BR-02', type: BranchType.STORE,     address: '78 FC Road, Shivajinagar',    city: 'Pune',  phone: '9900003333', isActive: true },
      { id: branch3Id,   name: 'BMS Koramangala',    code: 'BR-03', type: BranchType.STORE,     address: '22 80 Feet Rd, Koramangala',  city: 'Bengaluru', phone: '9900004444', isActive: true },
    ]);
    console.log('✅ Branches seeded');

    // ── 2. Users (all 7 roles) ────────────────────────────────────────────────
    const superAdminId = uuidv4();
    const adminId = uuidv4();
    const cimId = uuidv4();          // Central Inventory Manager
    const financeId = uuidv4();
    const branchMgr1Id = uuidv4();
    const branchInv1Id = uuidv4();
    const branchFO1Id = uuidv4();
    const branchMgr2Id = uuidv4();
    const branchFO2Id = uuidv4();

    const users = [
      { id: superAdminId, name: 'Super Admin',        email: 'superadmin@bms.com',   primaryRole: UserRoleEnum.SUPER_ADMIN,               branchId: null,     passwordHash: PASSWORD_HASH, isActive: true, createdById: null },
      { id: adminId,      name: 'Arjun Sharma',        email: 'admin@bms.com',        primaryRole: UserRoleEnum.ADMIN,                     branchId: null,     passwordHash: PASSWORD_HASH, isActive: true, createdById: superAdminId },
      { id: cimId,        name: 'Priya Nair',          email: 'inventory@bms.com',    primaryRole: UserRoleEnum.CENTRAL_INVENTORY_MANAGER, branchId: null,     passwordHash: PASSWORD_HASH, isActive: true, createdById: superAdminId },
      { id: financeId,    name: 'Ravi Gupta',          email: 'finance@bms.com',      primaryRole: UserRoleEnum.FINANCE,                   branchId: null,     passwordHash: PASSWORD_HASH, isActive: true, createdById: superAdminId },
      { id: branchMgr1Id, name: 'Sneha Patil',         email: 'manager.br01@bms.com', primaryRole: UserRoleEnum.BRANCH_MANAGER,           branchId: branch1Id, passwordHash: PASSWORD_HASH, isActive: true, createdById: adminId },
      { id: branchInv1Id, name: 'Deepak Kumar',        email: 'stock.br01@bms.com',   primaryRole: UserRoleEnum.BRANCH_INVENTORY,         branchId: branch1Id, passwordHash: PASSWORD_HASH, isActive: true, createdById: branchMgr1Id },
      { id: branchFO1Id,  name: 'Ananya Singh',        email: 'counter.br01@bms.com', primaryRole: UserRoleEnum.BRANCH_FRONT_OFFICE,      branchId: branch1Id, passwordHash: PASSWORD_HASH, isActive: true, createdById: branchMgr1Id },
      { id: branchMgr2Id, name: 'Vikram Reddy',        email: 'manager.br02@bms.com', primaryRole: UserRoleEnum.BRANCH_MANAGER,           branchId: branch2Id, passwordHash: PASSWORD_HASH, isActive: true, createdById: adminId },
      { id: branchFO2Id,  name: 'Kavya Menon',         email: 'counter.br02@bms.com', primaryRole: UserRoleEnum.BRANCH_FRONT_OFFICE,      branchId: branch2Id, passwordHash: PASSWORD_HASH, isActive: true, createdById: branchMgr2Id },
    ];

    await qr.manager.save(User, users);
    
    // Seed the user_roles table
    const userRoles = users.map(u => ({ id: uuidv4(), userId: u.id, role: u.primaryRole }));
    await qr.manager.save(UserRoleEntity, userRoles);
    console.log('✅ Users & Roles seeded');

    // ── 3. Catalog — Authors, Publishers, Categories, Suppliers ─────────────
    const authors = await qr.manager.save(Author, [
      { id: uuidv4(), name: 'Chetan Bhagat',     bio: 'Bestselling Indian fiction author.' },
      { id: uuidv4(), name: 'Ruskin Bond',        bio: 'Beloved author of Himalayan tales.' },
      { id: uuidv4(), name: 'Amish Tripathi',     bio: 'Mythological fiction writer.' },
      { id: uuidv4(), name: 'Arundhati Roy',      bio: 'Booker Prize winning author.' },
      { id: uuidv4(), name: 'R.K. Narayan',       bio: 'Classic Indian literature master.' },
      { id: uuidv4(), name: 'Sudha Murty',        bio: 'Author and philanthropist.' },
      { id: uuidv4(), name: 'Vikram Seth',        bio: 'Poet and novelist.' },
      { id: uuidv4(), name: 'Jhumpa Lahiri',      bio: 'Pulitzer Prize winning author.' },
      { id: uuidv4(), name: 'Ashwin Sanghi',      bio: 'Thriller and historical fiction author.' },
      { id: uuidv4(), name: 'Preeti Shenoy',      bio: 'Romance and self-help author.' },
    ]);

    const publishers = await qr.manager.save(Publisher, [
      { id: uuidv4(), name: 'Rupa Publications' },
      { id: uuidv4(), name: 'Penguin Random House India' },
      { id: uuidv4(), name: 'HarperCollins India' },
      { id: uuidv4(), name: 'Westland Books' },
      { id: uuidv4(), name: 'Aleph Book Company' },
      { id: uuidv4(), name: 'Hachette India' },
      { id: uuidv4(), name: 'Pan Macmillan India' },
      { id: uuidv4(), name: 'Oxford University Press India' },
    ]);

    const catFiction     = await qr.manager.save(Category, { id: uuidv4(), name: 'Fiction',         parentId: null });
    const catNonFiction  = await qr.manager.save(Category, { id: uuidv4(), name: 'Non-Fiction',     parentId: null });
    const catMythology   = await qr.manager.save(Category, { id: uuidv4(), name: 'Mythology',       parentId: null });
    const catSelfHelp    = await qr.manager.save(Category, { id: uuidv4(), name: 'Self Help',       parentId: null });
    const catChildren    = await qr.manager.save(Category, { id: uuidv4(), name: "Children's",      parentId: null });
    const catBiography   = await qr.manager.save(Category, { id: uuidv4(), name: 'Biography',       parentId: null });
    const catLiterature  = await qr.manager.save(Category, { id: uuidv4(), name: 'Literature',      parentId: null });
    const catSciFi       = await qr.manager.save(Category, { id: uuidv4(), name: 'Science Fiction', parentId: catFiction.id });

    await qr.manager.save(Supplier, [
      { id: uuidv4(), name: 'Books & Beyond Distributors', contactPerson: 'Mohan Lal', phone: '9810001111', email: 'mohan@bbd.com',       address: 'Nehru Place, Delhi' },
      { id: uuidv4(), name: 'National Book Agency',         contactPerson: 'Shefali Shah', phone: '9820002222', email: 'shefali@nba.com', address: 'College Street, Kolkata' },
      { id: uuidv4(), name: 'Madhyam Book Services',        contactPerson: 'Rajesh Desai', phone: '9830003333', email: 'rajesh@mbs.com',   address: 'Dadar, Mumbai' },
      { id: uuidv4(), name: 'South India Book House',       contactPerson: 'Meena Iyer',  phone: '9840004444', email: 'meena@sibh.com',   address: 'Commercial Street, Bengaluru' },
    ]);
    console.log('✅ Catalog entities seeded');

    // ── 4. Books (60 books) ──────────────────────────────────────────────────
    const bookData = [
      // Fiction
      { title: 'Five Point Someone',          isbn: '978-8129135728', price: 250, costPrice: 150, author: authors[0], publisher: publishers[0], category: catFiction },
      { title: '2 States',                    isbn: '978-8129115300', price: 275, costPrice: 160, author: authors[0], publisher: publishers[0], category: catFiction },
      { title: 'Half Girlfriend',             isbn: '978-8129136558', price: 250, costPrice: 145, author: authors[0], publisher: publishers[0], category: catFiction },
      { title: 'Revolution 2020',             isbn: '978-8129119834', price: 250, costPrice: 140, author: authors[0], publisher: publishers[0], category: catFiction },
      { title: 'One Indian Girl',             isbn: '978-8129142146', price: 275, costPrice: 155, author: authors[0], publisher: publishers[1], category: catFiction },
      { title: 'The Blue Umbrella',           isbn: '978-0143064893', price: 175, costPrice: 95,  author: authors[1], publisher: publishers[1], category: catChildren },
      { title: "A Flight of Pigeons",         isbn: '978-0143065043', price: 175, costPrice: 95,  author: authors[1], publisher: publishers[1], category: catFiction },
      { title: 'The Room on the Roof',        isbn: '978-0140121537', price: 200, costPrice: 110, author: authors[1], publisher: publishers[1], category: catFiction },
      { title: 'The Immortals of Meluha',     isbn: '978-9380658742', price: 350, costPrice: 195, author: authors[2], publisher: publishers[2], category: catMythology },
      { title: 'The Secret of the Nagas',     isbn: '978-9380658810', price: 350, costPrice: 195, author: authors[2], publisher: publishers[2], category: catMythology },
      { title: 'The Oath of the Vayuputras', isbn: '978-9380658834', price: 350, costPrice: 195, author: authors[2], publisher: publishers[2], category: catMythology },
      { title: 'Ram - Scion of Ikshvaku',    isbn: '978-9383260942', price: 399, costPrice: 220, author: authors[2], publisher: publishers[3], category: catMythology },
      { title: 'The God of Small Things',    isbn: '978-0006551096', price: 399, costPrice: 220, author: authors[3], publisher: publishers[4], category: catLiterature },
      { title: 'The Ministry of Utmost Happiness', isbn: '978-0241303979', price: 499, costPrice: 280, author: authors[3], publisher: publishers[4], category: catLiterature },
      { title: 'The Guide',                  isbn: '978-0140118803', price: 225, costPrice: 120, author: authors[4], publisher: publishers[1], category: catFiction },
      { title: 'Malgudi Days',               isbn: '978-0143062509', price: 225, costPrice: 120, author: authors[4], publisher: publishers[1], category: catFiction },
      { title: 'The Vendor of Sweets',       isbn: '978-0143067849', price: 225, costPrice: 120, author: authors[4], publisher: publishers[1], category: catFiction },
      { title: 'Swami and Friends',          isbn: '978-0143067832', price: 199, costPrice: 110, author: authors[4], publisher: publishers[1], category: catFiction },
      { title: 'Wise and Otherwise',         isbn: '978-0143062592', price: 250, costPrice: 135, author: authors[5], publisher: publishers[1], category: catNonFiction },
      { title: 'How I Taught My Grandmother to Read', isbn: '978-0143062622', price: 225, costPrice: 120, author: authors[5], publisher: publishers[1], category: catChildren },
      { title: 'Three Thousand Stitches',    isbn: '978-0143441663', price: 275, costPrice: 150, author: authors[5], publisher: publishers[1], category: catBiography },
      { title: 'A Suitable Boy',             isbn: '978-0060975205', price: 799, costPrice: 450, author: authors[6], publisher: publishers[1], category: catLiterature },
      { title: 'A Golden Gate',              isbn: '978-0394553252', price: 450, costPrice: 250, author: authors[6], publisher: publishers[5], category: catLiterature },
      { title: 'The Namesake',               isbn: '978-0618485222', price: 399, costPrice: 220, author: authors[7], publisher: publishers[2], category: catLiterature },
      { title: 'Interpreter of Maladies',    isbn: '978-0618104505', price: 350, costPrice: 195, author: authors[7], publisher: publishers[2], category: catLiterature },
      { title: 'Rozabal Line',               isbn: '978-9380658032', price: 350, costPrice: 190, author: authors[8], publisher: publishers[3], category: catFiction },
      { title: 'Chanakya\'s Chant',          isbn: '978-9380658056', price: 350, costPrice: 190, author: authors[8], publisher: publishers[3], category: catFiction },
      { title: 'The Krishna Key',            isbn: '978-9380658100', price: 350, costPrice: 190, author: authors[8], publisher: publishers[3], category: catMythology },
      { title: 'Life is What You Make It',   isbn: '978-9380349312', price: 250, costPrice: 135, author: authors[9], publisher: publishers[3], category: catSelfHelp },
      { title: 'The One You Cannot Have',    isbn: '978-9350097786', price: 250, costPrice: 135, author: authors[9], publisher: publishers[3], category: catFiction },
      // More books for variety
      { title: 'Wings of Fire',              isbn: '978-8173711466', price: 249, costPrice: 130, author: authors[5], publisher: publishers[7], category: catBiography },
      { title: 'Ignited Minds',              isbn: '978-0143032014', price: 199, costPrice: 105, author: authors[5], publisher: publishers[1], category: catSelfHelp },
      { title: 'The Alchemist',              isbn: '978-0061231204', price: 299, costPrice: 165, author: authors[6], publisher: publishers[1], category: catFiction },
      { title: 'Train to Pakistan',          isbn: '978-0140147445', price: 225, costPrice: 120, author: authors[4], publisher: publishers[1], category: catLiterature },
      { title: 'Delhi',                      isbn: '978-0143033219', price: 399, costPrice: 220, author: authors[4], publisher: publishers[1], category: catLiterature },
      { title: 'I am Malala',                isbn: '978-0316322409', price: 399, costPrice: 220, author: authors[3], publisher: publishers[6], category: catBiography },
      { title: 'The Immortal Life',          isbn: '978-1400052189', price: 450, costPrice: 250, author: authors[7], publisher: publishers[2], category: catNonFiction },
      { title: 'Sapiens',                    isbn: '978-0062316110', price: 599, costPrice: 340, author: authors[8], publisher: publishers[2], category: catNonFiction },
      { title: 'Thinking Fast and Slow',     isbn: '978-0374533557', price: 599, costPrice: 340, author: authors[6], publisher: publishers[5], category: catSelfHelp },
      { title: 'The Power of Habit',         isbn: '978-0812981605', price: 499, costPrice: 280, author: authors[9], publisher: publishers[6], category: catSelfHelp },
      { title: 'Atomic Habits',              isbn: '978-0735211292', price: 499, costPrice: 280, author: authors[0], publisher: publishers[1], category: catSelfHelp },
      { title: 'Rich Dad Poor Dad',          isbn: '978-1612680194', price: 299, costPrice: 165, author: authors[1], publisher: publishers[3], category: catSelfHelp },
      { title: 'The Subtle Art',             isbn: '978-0062457714', price: 399, costPrice: 220, author: authors[2], publisher: publishers[2], category: catSelfHelp },
      { title: 'Man\'s Search for Meaning',  isbn: '978-0807014271', price: 299, costPrice: 165, author: authors[3], publisher: publishers[7], category: catSelfHelp },
      { title: 'Dune',                       isbn: '978-0441013593', price: 499, costPrice: 280, author: authors[4], publisher: publishers[6], category: catSciFi },
      { title: 'Foundation',                 isbn: '978-0553293357', price: 399, costPrice: 220, author: authors[5], publisher: publishers[5], category: catSciFi },
      { title: 'Ender\'s Game',              isbn: '978-0812550702', price: 349, costPrice: 195, author: authors[6], publisher: publishers[4], category: catSciFi },
      { title: 'Neuromancer',                isbn: '978-0441569595', price: 349, costPrice: 195, author: authors[7], publisher: publishers[3], category: catSciFi },
      { title: 'The Martian',                isbn: '978-0804139021', price: 399, costPrice: 220, author: authors[8], publisher: publishers[2], category: catSciFi },
      { title: 'Project Hail Mary',          isbn: '978-0593135204', price: 449, costPrice: 250, author: authors[9], publisher: publishers[1], category: catSciFi },
      { title: 'Harry Potter - Philosopher', isbn: '978-0747532699', price: 350, costPrice: 195, author: authors[0], publisher: publishers[2], category: catChildren },
      { title: 'Harry Potter - Chamber',     isbn: '978-0747538493', price: 350, costPrice: 195, author: authors[0], publisher: publishers[2], category: catChildren },
      { title: 'Harry Potter - Prisoner',    isbn: '978-0747542155', price: 350, costPrice: 195, author: authors[0], publisher: publishers[2], category: catChildren },
      { title: 'The Little Prince',          isbn: '978-0156012195', price: 199, costPrice: 105, author: authors[1], publisher: publishers[7], category: catChildren },
      { title: 'Charlotte\'s Web',           isbn: '978-0061124952', price: 199, costPrice: 105, author: authors[2], publisher: publishers[6], category: catChildren },
      { title: 'Tuesdays with Morrie',       isbn: '978-0767905923', price: 299, costPrice: 165, author: authors[3], publisher: publishers[5], category: catNonFiction },
      { title: 'The Diary of a Young Girl',  isbn: '978-0553296983', price: 299, costPrice: 165, author: authors[4], publisher: publishers[4], category: catBiography },
      { title: 'Steve Jobs',                 isbn: '978-1451648539', price: 599, costPrice: 340, author: authors[5], publisher: publishers[1], category: catBiography },
      { title: 'Elon Musk',                  isbn: '978-1451648546', price: 699, costPrice: 395, author: authors[6], publisher: publishers[1], category: catBiography },
      { title: 'Long Walk to Freedom',       isbn: '978-0316548186', price: 599, costPrice: 340, author: authors[7], publisher: publishers[6], category: catBiography },
    ];

    const books: Book[] = [];
    for (const bd of bookData) {
      const book = await qr.manager.save(Book, {
        id: uuidv4(),
        title: bd.title,
        isbn: bd.isbn,
        barcode: bd.isbn, // barcode defaults to ISBN
        price: bd.price,
        costPrice: bd.costPrice,
        authorId: bd.author.id,
        publisherId: bd.publisher.id,
        categoryId: bd.category.id,
        isActive: true,
      });
      books.push(book);
    }
    console.log(`✅ ${books.length} books seeded`);

    // ── 5. Central Stock ─────────────────────────────────────────────────────
    // Books 0-49: adequate stock. Books 50-59: some below threshold of 20.
    for (let i = 0; i < books.length; i++) {
      const qty = i >= 55 ? randomBetween(0, 15) : randomBetween(30, 120); // below threshold for last 5
      await qr.manager.save(CentralStock, {
        id: uuidv4(),
        bookId: books[i].id,
        quantity: qty,
        reorderThreshold: 20,
      });
    }
    console.log('✅ Central stock seeded');

    // ── 6. Branch Inventory ───────────────────────────────────────────────────
    // Give all 3 branches a subset of books with varying stock levels.
    const branchStockData: { branchId: string; name: string }[] = [
      { branchId: branch1Id, name: 'BR-01' },
      { branchId: branch2Id, name: 'BR-02' },
      { branchId: branch3Id, name: 'BR-03' },
    ];

    for (const bs of branchStockData) {
      for (let i = 0; i < books.length; i++) {
        // Last 10 books for each branch are below threshold (5) — fires low-stock alerts
        const isLow = i >= 50;
        const qty = isLow ? randomBetween(0, 4) : randomBetween(5, 30);
        await qr.manager.save(BranchInventory, {
          id: uuidv4(),
          branchId: bs.branchId,
          bookId: books[i].id,
          quantity: qty,
          reorderThreshold: 5,
        });
      }
    }
    console.log('✅ Branch inventory seeded');

    // ── 7. Bills (40 bills over last 30 days) ─────────────────────────────────
    const paymentModes   = [PaymentMode.CASH, PaymentMode.UPI, null]; // null = UNPAID
    const branch1Books   = books.slice(0, 20);

    let billCount = 0;
    for (let day = 30; day >= 1; day--) {
      const billsOnDay = randomBetween(1, 2);
      for (let b = 0; b < billsOnDay && billCount < 40; b++) {
        const billDate = daysAgo(day);
        const isVoided = billCount < 2; // first 2 bills are voided
        const payMode = paymentModes[randomBetween(0, 2)];
        const payStatus = payMode === null ? PaymentStatus.UNPAID : PaymentStatus.PAID;
        const booksOnBill = randomBetween(1, 3);
        const billItems: { book: Book; qty: number; price: number }[] = [];

        for (let k = 0; k < booksOnBill; k++) {
          const bookIdx = randomBetween(0, branch1Books.length - 1);
          billItems.push({ book: branch1Books[bookIdx], qty: randomBetween(1, 3), price: branch1Books[bookIdx].price });
        }

        const subTotal    = billItems.reduce((s, i) => s + i.qty * i.price, 0);
        const discount    = randomBetween(0, 1) === 1 ? Math.round(subTotal * 0.05) : 0;
        const totalAmount = subTotal - discount;
        const billSeq     = String(billCount + 1).padStart(4, '0');
        const dateStr     = `${billDate.getUTCFullYear()}${String(billDate.getUTCMonth()+1).padStart(2,'0')}${String(billDate.getUTCDate()).padStart(2,'0')}`;

        const bill = await qr.manager.save(Bill, {
          id: uuidv4(),
          billNumber: `BR01-${dateStr}-${billSeq}`,
          branchId: branch1Id,
          exhibitionId: null,
          createdById: branchFO1Id,
          subTotal,
          discount,
          totalAmount,
          totalCost: 0,
          paymentStatus: isVoided ? PaymentStatus.PAID : payStatus,
          paymentMode: isVoided ? PaymentMode.CASH : payMode,
          status: isVoided ? BillStatus.VOIDED : BillStatus.COMPLETED,
          voidedById: isVoided ? branchMgr1Id : null,
          voidReason: isVoided ? 'Customer returned books before leaving store' : null,
          voidedAt: isVoided ? billDate : null,
          customerName: randomBetween(0, 1) === 1 ? 'Walk-in Customer' : null,
          createdAt: billDate,
        });

        for (const item of billItems) {
          await qr.manager.save(BillItem, {
            id: uuidv4(),
            billId: bill.id,
            bookId: item.book.id,
            quantity: item.qty,
            unitPrice: item.price,
            unitCost: item.book.costPrice ?? 0,
            lineTotal: item.qty * item.price,
          });
        }
        billCount++;
      }
    }
    console.log(`✅ ${billCount} bills seeded (2 voided)`);

    // ── 8. Restock Requests ───────────────────────────────────────────────────
    // Request 1: PENDING (branch 2 asking for books)
    const restock1Id = uuidv4();
    await qr.manager.save(RestockRequest, {
      id: restock1Id,
      branchId: branch2Id,
      requestedById: branchMgr2Id,
      status: RestockRequestStatus.PENDING,
    });
    for (let i = 55; i < 60; i++) {
      await qr.manager.save(RestockRequestItem, {
        id: uuidv4(),
        restockRequestId: restock1Id,
        bookId: books[i].id,
        quantityRequested: 20,
        quantityApproved: 0,
        quantityReceived: 0,
      });
    }

    // Request 2: RECEIVED (branch 1 — fulfilled and received)
    const restock2Id = uuidv4();
    await qr.manager.save(RestockRequest, {
      id: restock2Id,
      branchId: branch1Id,
      requestedById: branchInv1Id,
      status: RestockRequestStatus.RECEIVED,
      reviewedById: cimId,
      reviewNote: 'Approved — sufficient central stock available.',
      reviewedAt: daysAgo(10),
    });
    for (let i = 50; i < 55; i++) {
      await qr.manager.save(RestockRequestItem, {
        id: uuidv4(),
        restockRequestId: restock2Id,
        bookId: books[i].id,
        quantityRequested: 15,
        quantityApproved: 15,
        quantityReceived: 14, // 1 book discrepancy per line for realism
      });
    }
    console.log('✅ Restock requests seeded');

    // ── 9. Exhibitions ────────────────────────────────────────────────────────
    // Exhibition 1: CLOSED with 2 missing copies
    const exh1Id = uuidv4();
    await qr.manager.save(Exhibition, {
      id: exh1Id,
      name: 'Delhi Book Fair 2026',
      location: 'Pragati Maidan, New Delhi',
      sourceBranchId: branch1Id,
      startDate: daysAgo(20),
      endDate: daysAgo(15),
      status: ExhibitionStatus.CLOSED,
      requestedById: branchMgr1Id,
      approvedById: adminId,
    });
    for (let i = 0; i < 5; i++) {
      await qr.manager.save(ExhibitionStock, {
        id: uuidv4(),
        exhibitionId: exh1Id,
        bookId: books[i].id,
        quantityTaken: 10,
        quantitySold: 7,
        quantityReturned: 2,
        quantityDamaged: 0,
        quantityLost: i < 2 ? 1 : 0, // 2 books declared lost
      });
    }

    // Exhibition 2: ONGOING
    const exh2Id = uuidv4();
    await qr.manager.save(Exhibition, {
      id: exh2Id,
      name: 'Pune Literature Festival 2026',
      location: 'Symbiosis University, Pune',
      sourceBranchId: branch2Id,
      startDate: daysAgo(3),
      endDate: daysAgo(-7), // ends in 7 days
      status: ExhibitionStatus.ONGOING,
      requestedById: branchMgr2Id,
      approvedById: adminId,
    });
    for (let i = 5; i < 10; i++) {
      await qr.manager.save(ExhibitionStock, {
        id: uuidv4(),
        exhibitionId: exh2Id,
        bookId: books[i].id,
        quantityTaken: 15,
        quantitySold: randomBetween(2, 5),
        quantityReturned: 0,
        quantityDamaged: 0,
        quantityLost: 0,
      });
    }
    console.log('✅ Exhibitions seeded');

    // ── 10. Book Enquiries ────────────────────────────────────────────────────
    const enquiryTitles = [
      'The Psychology of Money',
      'Ikigai',
      'Shoe Dog',
      'The Midnight Library',
      'Where the Crawdads Sing',
    ];

    // Some for books in catalog (out of stock), some for books not in catalog
    for (let i = 0; i < 5; i++) {
      await qr.manager.save(BookEnquiry, {
        id: uuidv4(),
        bookId: books[55 + i]?.id ?? null,
        freeTextTitle: null,
        branchId: [branch1Id, branch2Id, branch3Id][i % 3],
        loggedById: [branchFO1Id, branchFO2Id, branchFO1Id][i % 3],
        customerName: `Customer ${i + 1}`,
        customerPhone: `98${String(randomBetween(10000000, 99999999))}`,
        status: EnquiryStatus.OPEN,
      });
    }
    for (let i = 0; i < 5; i++) {
      await qr.manager.save(BookEnquiry, {
        id: uuidv4(),
        bookId: null,
        freeTextTitle: enquiryTitles[i],
        branchId: [branch1Id, branch2Id, branch3Id][i % 3],
        loggedById: [branchFO1Id, branchFO2Id, branchFO1Id][i % 3],
        customerName: `Walk-in ${i + 1}`,
        status: EnquiryStatus.OPEN,
      });
    }
    console.log('✅ Enquiries seeded');

    // ── 11. Expenses (20 over last 2 months) ──────────────────────────────────
    const expenseCategories = [
      ExpenseCategory.RENT, ExpenseCategory.SALARY,
      ExpenseCategory.UTILITIES, ExpenseCategory.SUPPLIES,
      ExpenseCategory.MAINTENANCE, ExpenseCategory.MARKETING,
      ExpenseCategory.OTHER,
    ];

    for (let i = 0; i < 20; i++) {
      const daysBack = randomBetween(1, 60);
      const cat = expenseCategories[i % expenseCategories.length];
      const branchIdForExpense = i < 5 ? null : [branch1Id, branch2Id, branch3Id][i % 3];
      await qr.manager.save(Expense, {
        id: uuidv4(),
        branchId: branchIdForExpense,
        category: cat,
        amount: randomBetween(2000, 50000),
        description: `${cat.toLowerCase().replace('_', ' ')} expense for ${i < 5 ? 'chain' : `branch ${(i % 3) + 1}`}`,
        expenseDate: daysAgo(daysBack),
        enteredById: financeId,
      });
    }
    console.log('✅ Expenses seeded');

    // ── 12. System Settings ───────────────────────────────────────────────────
    await qr.manager.save(SystemSetting, [
      { key: 'allowed_payment_modes',       value: ['CASH', 'UPI'],  updatedById: superAdminId },
      { key: 'default_low_stock_threshold', value: 5,                updatedById: superAdminId },
      { key: 'currency_symbol',             value: '₹',              updatedById: superAdminId },
      { key: 'bill_number_prefix',          value: 'BR',             updatedById: superAdminId },
    ]);
    console.log('✅ System settings seeded');

    // ── Print login table ─────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(70));
    console.log('  SEEDED LOGINS — password for all: Password@123');
    console.log('═'.repeat(70));
    console.log(`  ${'Role'.padEnd(30)} ${'Email'.padEnd(35)}`);
    console.log('─'.repeat(70));
    const loginTable = [
      { role: 'SUPER_ADMIN',               email: 'superadmin@bms.com' },
      { role: 'ADMIN',                     email: 'admin@bms.com' },
      { role: 'CENTRAL_INVENTORY_MANAGER', email: 'inventory@bms.com' },
      { role: 'FINANCE',                   email: 'finance@bms.com' },
      { role: 'BRANCH_MANAGER (BR-01)',    email: 'manager.br01@bms.com' },
      { role: 'BRANCH_INVENTORY (BR-01)',  email: 'stock.br01@bms.com' },
      { role: 'BRANCH_FRONT_OFFICE (BR-01)', email: 'counter.br01@bms.com' },
      { role: 'BRANCH_MANAGER (BR-02)',    email: 'manager.br02@bms.com' },
      { role: 'BRANCH_FRONT_OFFICE (BR-02)', email: 'counter.br02@bms.com' },
    ];
    for (const u of loginTable) {
      console.log(`  ${u.role.padEnd(30)} ${u.email}`);
    }
    console.log('═'.repeat(70));
    console.log('\n✅ Seed complete!\n');

  } catch (err) {
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    await qr.release();
    // No need to destroy ds here, or we can use the local ds if we captured it.
    // We didn't capture it globally, so we can't easily destroy it here without changing scope.
    // Actually, I can just use process.exit(0) to exit the script.
    process.exit(0);
  }
}

seed().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
