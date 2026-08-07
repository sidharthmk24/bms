const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'bms_user',
    password: 'BmsApp@2026',
    database: 'bms_db',
    port: 3306
  });

  const [users] = await connection.execute('SELECT id, email, name, is_active FROM user');
  console.log('Users:');
  console.table(users);
  
  await connection.end();
}

check().catch(console.error);
