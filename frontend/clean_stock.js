const mysql = require('mysql2/promise');

async function cleanCentralStock() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'bms_user',
    password: 'BmsApp@2026',
    database: 'bms_db',
    port: 3306
  });

  const [result] = await connection.execute('DELETE FROM central_stock');
  console.log('Deleted rows:', result.affectedRows);

  await connection.end();
}

cleanCentralStock().catch(console.error);
