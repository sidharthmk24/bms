import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(process.cwd(), '.env.local') });
config();

import { getDataSource } from './lib/db/data-source';
import { Book } from './lib/api-backend/catalog/entities/book.entity';
import { CentralStock } from './lib/api-backend/inventory/entities/central-stock.entity';
import { StockMovement, StockMovementType, MovementReferenceType } from './lib/api-backend/inventory/entities/stock-movement.entity';
import { User } from './lib/api-backend/users/entities/user.entity';
import { Author } from './lib/api-backend/catalog/entities/author.entity';
import { Category } from './lib/api-backend/catalog/entities/category.entity';
import { Publisher } from './lib/api-backend/catalog/entities/publisher.entity';
import { v4 as uuidv4 } from 'uuid';

// Comprehensive book catalog with diverse categories, authors, and realistic central warehouse stock
const comprehensiveBooks = [
  // ── Technology & Programming ──
  {
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    isbn: '978-0132350884',
    barcode: '9780132350884',
    price: 699.00,
    costPrice: 420.00,
    author: 'Robert C. Martin',
    category: 'Technology',
    publisher: 'Pearson Education',
    quantity: 65,
    threshold: 15,
  },
  {
    title: 'Designing Data-Intensive Applications',
    isbn: '978-1449373320',
    barcode: '9781449373320',
    price: 1199.00,
    costPrice: 750.00,
    author: 'Martin Kleppmann',
    category: 'Technology',
    publisher: "O'Reilly Media",
    quantity: 40,
    threshold: 10,
  },
  {
    title: 'The Pragmatic Programmer: Your Journey To Mastery',
    isbn: '978-0135957059',
    barcode: '9780135957059',
    price: 899.00,
    costPrice: 550.00,
    author: 'Andrew Hunt & David Thomas',
    category: 'Technology',
    publisher: 'Addison-Wesley',
    quantity: 50,
    threshold: 12,
  },
  {
    title: 'System Design Interview – An Insider\'s Guide',
    isbn: '979-8664653403',
    barcode: '9798664653403',
    price: 950.00,
    costPrice: 580.00,
    author: 'Alex Xu',
    category: 'Technology',
    publisher: 'Independently Published',
    quantity: 45,
    threshold: 15,
  },
  {
    title: 'Refactoring: Improving the Design of Existing Code',
    isbn: '978-0134757599',
    barcode: '9780134757599',
    price: 850.00,
    costPrice: 520.00,
    author: 'Martin Fowler',
    category: 'Technology',
    publisher: 'Addison-Wesley',
    quantity: 35,
    threshold: 10,
  },

  // ── Self Help & Personal Development ──
  {
    title: 'Atomic Habits: An Easy & Proven Way to Build Good Habits',
    isbn: '978-0735211292',
    barcode: '9780735211292',
    price: 499.00,
    costPrice: 280.00,
    author: 'James Clear',
    category: 'Self Help',
    publisher: 'Penguin Random House India',
    quantity: 160,
    threshold: 25,
  },
  {
    title: 'The Psychology of Money',
    isbn: '978-9390166268',
    barcode: '9789390166268',
    price: 399.00,
    costPrice: 220.00,
    author: 'Morgan Housel',
    category: 'Self Help',
    publisher: 'Jaico Publishing House',
    quantity: 140,
    threshold: 20,
  },
  {
    title: 'Deep Work: Rules for Focused Success in a Distracted World',
    isbn: '978-1455586691',
    barcode: '9781455586691',
    price: 499.00,
    costPrice: 280.00,
    author: 'Cal Newport',
    category: 'Self Help',
    publisher: 'Grand Central Publishing',
    quantity: 55,
    threshold: 15,
  },
  {
    title: 'Ikigai: The Japanese Secret to a Long and Happy Life',
    isbn: '978-1786330895',
    barcode: '9781786330895',
    price: 450.00,
    costPrice: 240.00,
    author: 'Héctor García & Francesc Miralles',
    category: 'Self Help',
    publisher: 'Penguin Random House India',
    quantity: 120,
    threshold: 25,
  },
  {
    title: 'The Subtle Art of Not Giving a F*ck',
    isbn: '978-0062457714',
    barcode: '9780062457714',
    price: 399.00,
    costPrice: 220.00,
    author: 'Mark Manson',
    category: 'Self Help',
    publisher: 'HarperCollins India',
    quantity: 85,
    threshold: 20,
  },
  {
    title: 'Thinking, Fast and Slow',
    isbn: '978-0374533557',
    barcode: '9780374533557',
    price: 599.00,
    costPrice: 340.00,
    author: 'Daniel Kahneman',
    category: 'Self Help',
    publisher: 'Farrar, Straus and Giroux',
    quantity: 45,
    threshold: 15,
  },
  {
    title: 'Can\'t Hurt Me: Master Your Mind and Defy the Odds',
    isbn: '978-1544512280',
    barcode: '9781544512280',
    price: 550.00,
    costPrice: 310.00,
    author: 'David Goggins',
    category: 'Self Help',
    publisher: 'Lioncrest Publishing',
    quantity: 70,
    threshold: 15,
  },

  // ── Indian Literature & Fiction ──
  {
    title: 'The God of Small Things',
    isbn: '978-0006551096',
    barcode: '9780006551096',
    price: 399.00,
    costPrice: 220.00,
    author: 'Arundhati Roy',
    category: 'Literature',
    publisher: 'Aleph Book Company',
    quantity: 60,
    threshold: 15,
  },
  {
    title: 'A Suitable Boy',
    isbn: '978-0060975205',
    barcode: '9780060975205',
    price: 799.00,
    costPrice: 450.00,
    author: 'Vikram Seth',
    category: 'Literature',
    publisher: 'Penguin Random House India',
    quantity: 50,
    threshold: 12,
  },
  {
    title: 'The Palace of Illusions',
    isbn: '978-1400096206',
    barcode: '9781400096206',
    price: 399.00,
    costPrice: 210.00,
    author: 'Chitra Banerjee Divakaruni',
    category: 'Mythology',
    publisher: 'Pan Macmillan India',
    quantity: 80,
    threshold: 20,
  },
  {
    title: 'The Immortals of Meluha (Shiva Trilogy Book 1)',
    isbn: '978-9380658742',
    barcode: '9789380658742',
    price: 350.00,
    costPrice: 195.00,
    author: 'Amish Tripathi',
    category: 'Mythology',
    publisher: 'Westland Books',
    quantity: 95,
    threshold: 20,
  },
  {
    title: 'The Secret of the Nagas (Shiva Trilogy Book 2)',
    isbn: '978-9380658810',
    barcode: '9789380658810',
    price: 350.00,
    costPrice: 195.00,
    author: 'Amish Tripathi',
    category: 'Mythology',
    publisher: 'Westland Books',
    quantity: 75,
    threshold: 15,
  },
  {
    title: 'The Oath of the Vayuputras (Shiva Trilogy Book 3)',
    isbn: '978-9380658834',
    barcode: '9789380658834',
    price: 350.00,
    costPrice: 195.00,
    author: 'Amish Tripathi',
    category: 'Mythology',
    publisher: 'Westland Books',
    quantity: 70,
    threshold: 15,
  },
  {
    title: 'Malgudi Days',
    isbn: '978-0143062509',
    barcode: '9780143062509',
    price: 225.00,
    costPrice: 120.00,
    author: 'R.K. Narayan',
    category: 'Fiction',
    publisher: 'Penguin Random House India',
    quantity: 65,
    threshold: 15,
  },
  {
    title: 'Swami and Friends',
    isbn: '978-0143067832',
    barcode: '9780143067832',
    price: 199.00,
    costPrice: 110.00,
    author: 'R.K. Narayan',
    category: 'Fiction',
    publisher: 'Penguin Random House India',
    quantity: 85,
    threshold: 20,
  },
  {
    title: 'The Blue Umbrella',
    isbn: '978-0143064893',
    barcode: '9780143064893',
    price: 175.00,
    costPrice: 95.00,
    author: 'Ruskin Bond',
    category: "Children's",
    publisher: 'Penguin Random House India',
    quantity: 90,
    threshold: 20,
  },
  {
    title: 'The Room on the Roof',
    isbn: '978-0140121537',
    barcode: '9780140121537',
    price: 200.00,
    costPrice: 110.00,
    author: 'Ruskin Bond',
    category: 'Fiction',
    publisher: 'Penguin Random House India',
    quantity: 55,
    threshold: 15,
  },
  {
    title: 'Wise and Otherwise',
    isbn: '978-0143062592',
    barcode: '9780143062592',
    price: 250.00,
    costPrice: 135.00,
    author: 'Sudha Murty',
    category: 'Literature',
    publisher: 'Penguin Random House India',
    quantity: 80,
    threshold: 20,
  },
  {
    title: 'Three Thousand Stitches',
    isbn: '978-0143441663',
    barcode: '9780143441663',
    price: 275.00,
    costPrice: 150.00,
    author: 'Sudha Murty',
    category: 'Biography',
    publisher: 'Penguin Random House India',
    quantity: 70,
    threshold: 15,
  },
  {
    title: 'Train to Pakistan',
    isbn: '978-0140147445',
    barcode: '9780140147445',
    price: 225.00,
    costPrice: 120.00,
    author: 'Khushwant Singh',
    category: 'Literature',
    publisher: 'Penguin Random House India',
    quantity: 45,
    threshold: 12,
  },

  // ── Global Classic & Modern Fiction ──
  {
    title: 'To Kill a Mockingbird',
    isbn: '978-0060935467',
    barcode: '9780060935467',
    price: 399.00,
    costPrice: 210.00,
    author: 'Harper Lee',
    category: 'Literature',
    publisher: 'HarperCollins India',
    quantity: 85,
    threshold: 20,
  },
  {
    title: '1984',
    isbn: '978-0451524935',
    barcode: '9780451524935',
    price: 299.00,
    costPrice: 160.00,
    author: 'George Orwell',
    category: 'Literature',
    publisher: 'Penguin Random House India',
    quantity: 110,
    threshold: 25,
  },
  {
    title: 'Animal Farm',
    isbn: '978-0451526342',
    barcode: '9780451526342',
    price: 199.00,
    costPrice: 99.00,
    author: 'George Orwell',
    category: 'Literature',
    publisher: 'Penguin Random House India',
    quantity: 75,
    threshold: 15,
  },
  {
    title: 'The Great Gatsby',
    isbn: '978-0743273565',
    barcode: '9780743273565',
    price: 250.00,
    costPrice: 130.00,
    author: 'F. Scott Fitzgerald',
    category: 'Literature',
    publisher: 'Scribner',
    quantity: 60,
    threshold: 15,
  },
  {
    title: 'Pride and Prejudice',
    isbn: '978-0141439518',
    barcode: '9780141439518',
    price: 220.00,
    costPrice: 115.00,
    author: 'Jane Austen',
    category: 'Literature',
    publisher: 'Penguin Classics',
    quantity: 65,
    threshold: 15,
  },
  {
    title: 'The Alchemist',
    isbn: '978-0061231204',
    barcode: '9780061231204',
    price: 299.00,
    costPrice: 165.00,
    author: 'Paulo Coelho',
    category: 'Fiction',
    publisher: 'HarperCollins India',
    quantity: 150,
    threshold: 25,
  },

  // ── Sci-Fi & Fantasy ──
  {
    title: 'Dune (Dune Chronicles Book 1)',
    isbn: '978-0441013593',
    barcode: '9780441013593',
    price: 499.00,
    costPrice: 280.00,
    author: 'Frank Herbert',
    category: 'Science Fiction',
    publisher: 'Ace Books',
    quantity: 130,
    threshold: 25,
  },
  {
    title: 'Project Hail Mary',
    isbn: '978-0593135204',
    barcode: '9780593135204',
    price: 449.00,
    costPrice: 250.00,
    author: 'Andy Weir',
    category: 'Science Fiction',
    publisher: 'Ballantine Books',
    quantity: 90,
    threshold: 20,
  },
  {
    title: 'The Martian',
    isbn: '978-0804139021',
    barcode: '9780804139021',
    price: 399.00,
    costPrice: 220.00,
    author: 'Andy Weir',
    category: 'Science Fiction',
    publisher: 'Crown Publishing',
    quantity: 60,
    threshold: 15,
  },
  {
    title: 'Harry Potter and the Sorcerer’s Stone',
    isbn: '978-0590353427',
    barcode: '9780590353427',
    price: 499.00,
    costPrice: 280.00,
    author: 'J.K. Rowling',
    category: 'Fiction',
    publisher: 'Bloomsbury',
    quantity: 95,
    threshold: 20,
  },
  {
    title: 'Harry Potter and the Chamber of Secrets',
    isbn: '978-0439064873',
    barcode: '9780439064873',
    price: 499.00,
    costPrice: 280.00,
    author: 'J.K. Rowling',
    category: 'Fiction',
    publisher: 'Bloomsbury',
    quantity: 80,
    threshold: 20,
  },
  {
    title: 'Harry Potter and the Prisoner of Azkaban',
    isbn: '978-0439136365',
    barcode: '9780439136365',
    price: 520.00,
    costPrice: 295.00,
    author: 'J.K. Rowling',
    category: 'Fiction',
    publisher: 'Bloomsbury',
    quantity: 75,
    threshold: 20,
  },

  // ── Low Stock Warehouse Test Cases (Demonstrating restock alerts) ──
  {
    title: 'Klara and the Sun',
    isbn: '978-0593318171',
    barcode: '9780593318171',
    price: 599.00,
    costPrice: 340.00,
    author: 'Kazuo Ishiguro',
    category: 'Science Fiction',
    publisher: 'Faber & Faber',
    quantity: 6, // Low stock on purpose (<= threshold)
    threshold: 15,
  },
  {
    title: 'Neuromancer (Sprawl Trilogy Book 1)',
    isbn: '978-0441569595',
    barcode: '9780441569595',
    price: 349.00,
    costPrice: 195.00,
    author: 'William Gibson',
    category: 'Science Fiction',
    publisher: 'Ace Books',
    quantity: 4, // Low stock on purpose (<= threshold)
    threshold: 15,
  },
  {
    title: 'Ender\'s Game',
    isbn: '978-0812550702',
    barcode: '9780812550702',
    price: 349.00,
    costPrice: 195.00,
    author: 'Orson Scott Card',
    category: 'Science Fiction',
    publisher: 'Tor Books',
    quantity: 7, // Low stock on purpose (<= threshold)
    threshold: 15,
  },

  // ── Biography, History & Non-Fiction ──
  {
    title: 'Sapiens: A Brief History of Humankind',
    isbn: '978-0062316110',
    barcode: '9780062316110',
    price: 599.00,
    costPrice: 330.00,
    author: 'Yuval Noah Harari',
    category: 'Non-Fiction',
    publisher: 'HarperCollins India',
    quantity: 110,
    threshold: 25,
  },
  {
    title: 'Wings of Fire: An Autobiography',
    isbn: '978-8173711466',
    barcode: '9788173711466',
    price: 249.00,
    costPrice: 135.00,
    author: 'A.P.J. Abdul Kalam',
    category: 'Biography',
    publisher: 'Universities Press',
    quantity: 130,
    threshold: 25,
  },
  {
    title: 'Steve Jobs',
    isbn: '978-1451648539',
    barcode: '9781451648539',
    price: 599.00,
    costPrice: 340.00,
    author: 'Walter Isaacson',
    category: 'Biography',
    publisher: 'Simon & Schuster',
    quantity: 45,
    threshold: 15,
  },
  {
    title: 'Man\'s Search for Meaning',
    isbn: '978-0807014271',
    barcode: '9780807014271',
    price: 299.00,
    costPrice: 165.00,
    author: 'Viktor E. Frankl',
    category: 'Self Help',
    publisher: 'Beacon Press',
    quantity: 85,
    threshold: 20,
  },
  {
    title: 'The Little Prince',
    isbn: '978-0156012195',
    barcode: '9780156012195',
    price: 199.00,
    costPrice: 105.00,
    author: 'Antoine de Saint-Exupéry',
    category: "Children's",
    publisher: 'Mariner Books',
    quantity: 90,
    threshold: 20,
  },
];

async function seedCentralStock() {
  console.log('🚀 Starting Central Stock Warehouse seeding...');
  const ds = await getDataSource();

  const bookRepo = ds.getRepository(Book);
  const centralStockRepo = ds.getRepository(CentralStock);
  const stockMovementRepo = ds.getRepository(StockMovement);
  const userRepo = ds.getRepository(User);
  const authorRepo = ds.getRepository(Author);
  const categoryRepo = ds.getRepository(Category);
  const publisherRepo = ds.getRepository(Publisher);

  // Find admin or central inventory user for audit records
  const adminUser = (await userRepo.findOne({
    where: [{ primaryRole: 'CENTRAL_INVENTORY_MANAGER' as any }, { primaryRole: 'SUPER_ADMIN' as any }],
  })) || (await userRepo.findOne({ where: {} }));

  const adminId = adminUser ? adminUser.id : uuidv4();

  // 1. Seed any missing helper entities & books in catalog
  console.log('📦 Checking and seeding comprehensive book catalog & warehouse stock...');
  for (const item of comprehensiveBooks) {
    let book = await bookRepo.findOne({ where: [{ isbn: item.isbn }, { barcode: item.barcode }] });

    if (!book) {
      // Find or create Author
      let author = await authorRepo.findOne({ where: { name: item.author } });
      if (!author) {
        author = authorRepo.create({ id: uuidv4(), name: item.author });
        await authorRepo.save(author);
      }

      // Find or create Category
      let category = await categoryRepo.findOne({ where: { name: item.category } });
      if (!category) {
        category = categoryRepo.create({ id: uuidv4(), name: item.category });
        await categoryRepo.save(category);
      }

      // Find or create Publisher
      let publisher = await publisherRepo.findOne({ where: { name: item.publisher } });
      if (!publisher) {
        publisher = publisherRepo.create({ id: uuidv4(), name: item.publisher });
        await publisherRepo.save(publisher);
      }

      book = bookRepo.create({
        id: uuidv4(),
        title: item.title,
        isbn: item.isbn,
        barcode: item.barcode,
        price: item.price,
        costPrice: item.costPrice,
        authorId: author.id,
        categoryId: category.id,
        publisherId: publisher.id,
        isActive: true,
      });
      await bookRepo.save(book);
      console.log(`  + Added master book: "${book.title}"`);
    }

    // Upsert Central Stock
    let cs = await centralStockRepo.findOne({ where: { bookId: book.id } });
    if (!cs) {
      cs = centralStockRepo.create({
        id: uuidv4(),
        bookId: book.id,
        quantity: item.quantity,
        reorderThreshold: item.threshold,
      });
      await centralStockRepo.save(cs);

      // Write initial stock movement
      const movement = stockMovementRepo.create({
        id: uuidv4(),
        type: StockMovementType.RESTOCK_IN,
        quantity: item.quantity,
        bookId: book.id,
        branchId: null, // null indicates central warehouse
        referenceType: MovementReferenceType.MANUAL,
        performedById: adminId,
        note: 'Initial central warehouse stock intake',
      });
      await stockMovementRepo.save(movement);
      console.log(`  + Seeded central stock for "${book.title}": ${item.quantity} units (Threshold: ${item.threshold})`);
    }
  }

  // 2. Ensure ALL existing books in the catalog have central warehouse stock
  console.log('\n📚 Ensuring all existing catalog books have central stock...');
  const allBooks = await bookRepo.find();
  console.log(`Found ${allBooks.length} total books in master catalog.`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const book of allBooks) {
    let cs = await centralStockRepo.findOne({ where: { bookId: book.id } });

    if (!cs) {
      // Determine realistic warehouse stock quantity & threshold based on book properties
      let initialQty = 30 + Math.floor(Math.random() * 70); // 30 - 100 units
      let threshold = 15 + Math.floor(Math.random() * 10);  // 15 - 24 threshold

      // Introduce a few low-stock items purposefully for realism
      if (book.title.toLowerCase().includes('harry') || book.title.toLowerCase().includes('flight')) {
        initialQty = 8;
        threshold = 20;
      } else if (book.title.toLowerCase().includes('dune') || book.title.toLowerCase().includes('sapiens')) {
        initialQty = 145;
        threshold = 25;
      }

      cs = centralStockRepo.create({
        id: uuidv4(),
        bookId: book.id,
        quantity: initialQty,
        reorderThreshold: threshold,
      });
      await centralStockRepo.save(cs);

      // Stock movement audit
      const movement = stockMovementRepo.create({
        id: uuidv4(),
        type: StockMovementType.RESTOCK_IN,
        quantity: initialQty,
        bookId: book.id,
        branchId: null,
        referenceType: MovementReferenceType.MANUAL,
        performedById: adminId,
        note: 'Central warehouse stock initialization',
      });
      await stockMovementRepo.save(movement);

      createdCount++;
    } else if (cs.quantity === 0 || cs.quantity === null) {
      // Replenish zero or null quantity to a healthy amount
      cs.quantity = 40 + Math.floor(Math.random() * 40);
      if (!cs.reorderThreshold) cs.reorderThreshold = 20;
      await centralStockRepo.save(cs);
      updatedCount++;
    }
  }

  console.log(`\n🎉 Seeding completed successfully!`);
  console.log(`  - Newly created central stock rows: ${createdCount}`);
  console.log(`  - Updated central stock rows: ${updatedCount}`);

  // Summary counts
  const totalCentralStockRows = await centralStockRepo.count();
  const lowStockRows = await centralStockRepo
    .createQueryBuilder('cs')
    .where('cs.quantity <= cs.reorderThreshold')
    .getCount();

  console.log(`\n📊 Warehouse Stock Summary:`);
  console.log(`  - Total titles in Warehouse: ${totalCentralStockRows}`);
  console.log(`  - Titles flagged Low Stock / Restock Needed: ${lowStockRows}`);

  process.exit(0);
}

seedCentralStock().catch((err) => {
  console.error('❌ Error seeding central stock:', err);
  process.exit(1);
});
