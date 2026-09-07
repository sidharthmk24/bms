require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bms_db',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    ssl: process.env.DB_HOST?.includes('tidbcloud') ? { rejectUnauthorized: true } : undefined,
  });

  const [tables] = await connection.execute('SHOW TABLES');
  const tblKey = Object.keys(tables[0])[0];
  const summary = [];
  for (const t of tables) {
    const tableName = t[tblKey];
    const [cnt] = await connection.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    summary.push({ table: tableName, count: cnt[0].count });
  }
  console.log('=== TABLE ROW COUNTS ===');
  console.table(summary);

  const [users] = await connection.execute('SELECT id, email, name, primary_role, is_active, branch_id FROM user');
  console.log('\n=== USERS ===');
  console.table(users);

  const [roles] = await connection.execute('SELECT * FROM user_roles');
  console.log('\n=== USER ROLES ===');
  console.table(roles);

  const [branches] = await connection.execute('SELECT id, code, name, type, is_active FROM branch');
  console.log('\n=== BRANCHES ===');
  console.table(branches);

  const [settings] = await connection.execute('SELECT `key`, `value`, `updated_by_id` FROM system_setting');
  console.log('\n=== SYSTEM SETTINGS ===');
  console.table(settings);

  const [books] = await connection.execute(`
    SELECT b.title, b.price, a.name as author, c.name as category, p.name as publisher
    FROM book b
    JOIN author a ON b.author_id = a.id
    JOIN category c ON b.category_id = c.id
    JOIN publisher p ON b.publisher_id = p.id
    WHERE b.title LIKE '%(%'
    LIMIT 15
  `);
  console.log('\n=== SAMPLE MALAYALAM BOOKS ===');
  console.table(books);

  await connection.end();
}

run().catch(console.error);
