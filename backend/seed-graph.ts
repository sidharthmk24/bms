import * as mysql from 'mysql2/promise';

async function seed() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'bms_user',
    password: 'BmsApp@2026',
    database: 'bms_db',
  });

  console.log('Connected to the database. Seeding data for the last 30 days...');

  // Get branches
  const [branches]: any = await connection.execute('SELECT id FROM branch');
  if (branches.length === 0) {
    console.log('No branches found. Please create a branch first.');
    await connection.end();
    return;
  }

  // Get a user to act as billed_by
  const [users]: any = await connection.execute('SELECT id FROM user LIMIT 1');
  const userId = users[0]?.id;

  for (const branch of branches) {
    console.log(`Seeding data for branch ${branch.id}...`);
    
    // For each of the last 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:MM:SS
      const justDateStr = d.toISOString().split('T')[0];

      // Random revenue between 500 and 2000
      const numBills = Math.floor(Math.random() * 5) + 1;
      let dailyRevenue = 0;
      for (let b = 0; b < numBills; b++) {
        const billId = require('crypto').randomUUID();
        const amount = Math.floor(Math.random() * 300) + 50;
        dailyRevenue += amount;
        
        // Example bill_number: BR-20260803-0-xyz123
        const randomSuffix = Math.random().toString(36).substring(7);
        const billNumber = `BR-${justDateStr.replace(/-/g, '')}-${b}-${randomSuffix}`;

        await connection.execute(`
          INSERT INTO bill (id, bill_number, branch_id, status, sub_total, discount, total_amount, payment_status, payment_mode, created_at, updated_at, created_by_id)
          VALUES (?, ?, ?, 'COMPLETED', ?, 0, ?, 'PAID', 'CASH', ?, ?, ?)
        `, [billId, billNumber, branch.id, amount, amount, dateStr, dateStr, userId]);
      }

      // Random expense between 300 and 1500 (sometimes causing loss)
      const expenseId = require('crypto').randomUUID();
      // Increase expense chance to occasionally be higher than revenue to simulate a loss
      const expenseAmount = dailyRevenue + (Math.random() > 0.6 ? (Math.random() * 500) : -(Math.random() * 500));
      const finalExpense = Math.max(100, Math.round(expenseAmount));
      
      await connection.execute(`
        INSERT INTO expense (id, branch_id, category, amount, description, expense_date, created_at, updated_at, entered_by_id)
        VALUES (?, ?, 'OTHER', ?, 'Daily operations', ?, ?, ?, ?)
      `, [expenseId, branch.id, finalExpense, justDateStr, dateStr, dateStr, userId]);
    }
  }

  console.log('Seeding completed successfully!');
  await connection.end();
}

seed().catch(console.error);
