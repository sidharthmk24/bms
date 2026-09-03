const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

async function runTest() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'test',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    ssl: process.env.DB_HOST?.includes('tidbcloud') ? { rejectUnauthorized: true } : undefined,
  });

  try {
    console.log('=== MULTI-SOURCE EXHIBITION LIFECYCLE TEST ===');

    // 1. Log in as Admin
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@bms.com', password: 'Password@123' }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.accessToken;
    if (!token) throw new Error('Failed to log in: ' + JSON.stringify(loginData));
    console.log('✓ Successfully logged in as ADMIN');

    // 2. Find a book with stock in both a Store Branch and Central Warehouse
    const [rows] = await conn.execute(`
      SELECT b.id as branch_id, b.name as branch_name, bi.book_id, bi.quantity as branch_qty, cs.quantity as central_qty, bk.title
      FROM branch_inventory bi
      JOIN branch b ON bi.branch_id = b.id
      JOIN central_stock cs ON bi.book_id = cs.book_id
      JOIN book bk ON bi.book_id = bk.id
      WHERE b.type = 'STORE' AND bi.quantity >= 3 AND cs.quantity >= 5
      LIMIT 1
    `);

    if (rows.length === 0) {
      throw new Error('No book found with stock in both store branch and central warehouse');
    }

    const item = rows[0];
    const initialBranchQty = Number(item.branch_qty);
    const initialCentralQty = Number(item.central_qty);
    console.log(`Target Branch: ${item.branch_name} (${item.branch_id})`);
    console.log(`Target Book: "${item.title}" (${item.book_id})`);
    console.log(`Initial Stock -> Branch: ${initialBranchQty} | Central Warehouse: ${initialCentralQty}`);

    // We want to request MORE than branch has:
    // e.g. take all branchQty + 3 from central warehouse
    const takeFromBranch = initialBranchQty;
    const takeFromCentral = 3;
    const totalToTake = takeFromBranch + takeFromCentral;
    console.log(`Requesting Total: ${totalToTake} (${takeFromBranch} from branch + ${takeFromCentral} from central warehouse)`);

    // 3. Create Exhibition
    const createRes = await fetch('http://localhost:3000/api/v1/exhibitions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Multi-Source Expo 2026',
        location: 'City Exhibition Center',
        sourceBranchId: item.branch_id,
        startDate: '2026-09-10',
        endDate: '2026-09-12',
        items: [
          {
            bookId: item.book_id,
            quantityTaken: totalToTake,
            quantityFromBranch: takeFromBranch,
            quantityFromCentral: takeFromCentral,
          },
        ],
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok || !createData.success) {
      throw new Error(`Exhibition creation failed: ${JSON.stringify(createData)}`);
    }

    const exId = createData.data.id;
    console.log(`✓ Exhibition created: ${exId} (Status: ${createData.data.status})`);

    // 4. Verify Immediate Deductions
    const [bInvAfterCreate] = await conn.execute(
      'SELECT quantity FROM branch_inventory WHERE branch_id = ? AND book_id = ?',
      [item.branch_id, item.book_id]
    );
    const [cInvAfterCreate] = await conn.execute(
      'SELECT quantity FROM central_stock WHERE book_id = ?',
      [item.book_id]
    );

    const bQtyAfterCreate = Number(bInvAfterCreate[0].quantity);
    const cQtyAfterCreate = Number(cInvAfterCreate[0].quantity);
    console.log(`Stock after creation -> Branch: ${bQtyAfterCreate} (Expected: ${initialBranchQty - takeFromBranch}) | Warehouse: ${cQtyAfterCreate} (Expected: ${initialCentralQty - takeFromCentral})`);

    if (bQtyAfterCreate !== initialBranchQty - takeFromBranch) {
      throw new Error(`Branch stock mismatch! Got ${bQtyAfterCreate}, expected ${initialBranchQty - takeFromBranch}`);
    }
    if (cQtyAfterCreate !== initialCentralQty - takeFromCentral) {
      throw new Error(`Warehouse stock mismatch! Got ${cQtyAfterCreate}, expected ${initialCentralQty - takeFromCentral}`);
    }
    console.log('✓ PASS: Immediate stock deduction verified on BOTH branch and central warehouse!');

    // 5. Verify EXHIBITION_OUT stock movements
    const [movementsOut] = await conn.execute(
      "SELECT branch_id, quantity FROM stock_movement WHERE reference_id = ? AND type = 'EXHIBITION_OUT'",
      [exId]
    );
    console.log(`Found ${movementsOut.length} EXHIBITION_OUT movements:`, movementsOut);
    if (movementsOut.length !== 2) {
      throw new Error(`Expected 2 EXHIBITION_OUT movements (1 branch, 1 warehouse), got ${movementsOut.length}`);
    }
    console.log('✓ PASS: Dual EXHIBITION_OUT ledger entries verified!');

    // 6. Test Close & Reconcile (Approach A: all unsold returned go to hosting branch)
    // Suppose we sold (totalToTake - 2), and returning 2 unsold copies
    const soldQty = totalToTake - 2;
    const returnQty = 2;
    console.log(`Reconciling: Sold: ${soldQty}, Returning unsold: ${returnQty}`);

    const [stockRow] = await conn.execute(
      'SELECT id FROM exhibition_stock WHERE exhibition_id = ? AND book_id = ?',
      [exId, item.book_id]
    );
    const stockId = stockRow[0].id;

    const closeRes = await fetch(`http://localhost:3000/api/v1/exhibitions/${exId}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: [
          {
            stockId,
            quantitySold: soldQty,
            quantityReturned: returnQty,
            quantityDamaged: 0,
            quantityLost: 0,
            quantityCredit: 0,
          },
        ],
        note: 'Multi-source close test',
      }),
    });

    const closeData = await closeRes.json();
    if (!closeRes.ok || !closeData.success) {
      throw new Error(`Exhibition close failed: ${JSON.stringify(closeData)}`);
    }
    console.log(`✓ Exhibition closed successfully (Status: ${closeData.data.status})`);

    // 7. Verify Unsold Returned Copies went to Hosting Branch
    const [bInvAfterClose] = await conn.execute(
      'SELECT quantity FROM branch_inventory WHERE branch_id = ? AND book_id = ?',
      [item.branch_id, item.book_id]
    );
    const [cInvAfterClose] = await conn.execute(
      'SELECT quantity FROM central_stock WHERE book_id = ?',
      [item.book_id]
    );

    const bQtyAfterClose = Number(bInvAfterClose[0].quantity);
    const cQtyAfterClose = Number(cInvAfterClose[0].quantity);
    console.log(`Stock after close -> Branch: ${bQtyAfterClose} (Expected: ${bQtyAfterCreate + returnQty}) | Warehouse: ${cQtyAfterClose} (Expected: ${cQtyAfterCreate})`);

    if (bQtyAfterClose !== bQtyAfterCreate + returnQty) {
      throw new Error(`Branch did not receive returned unsold books! Got ${bQtyAfterClose}, expected ${bQtyAfterCreate + returnQty}`);
    }
    if (cQtyAfterClose !== cQtyAfterCreate) {
      throw new Error(`Warehouse stock changed on close unexpectedly! Got ${cQtyAfterClose}, expected ${cQtyAfterCreate}`);
    }
    console.log('✓ PASS: Approach A verified: all unsold copies returned to hosting branch shelf!');

    // Clean up test records
    await conn.execute('DELETE FROM exhibition_stock WHERE exhibition_id = ?', [exId]);
    await conn.execute('DELETE FROM stock_movement WHERE reference_id = ?', [exId]);
    await conn.execute('DELETE FROM exhibition WHERE id = ?', [exId]);

    // Restore stock counts back to initial values
    await conn.execute('UPDATE branch_inventory SET quantity = ? WHERE branch_id = ? AND book_id = ?', [initialBranchQty, item.branch_id, item.book_id]);
    await conn.execute('UPDATE central_stock SET quantity = ? WHERE book_id = ?', [initialCentralQty, item.book_id]);
    console.log('✓ Cleaned up test records and restored initial stock counts');

    console.log('\n==================================================');
    console.log('ALL MULTI-SOURCE ALLOCATION TESTS PASSED 100%!');
    console.log('==================================================');
  } finally {
    await conn.end();
  }
}

runTest().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
