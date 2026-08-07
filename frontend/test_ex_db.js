const mysql = require('mysql2/promise');

async function test() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'bms_user',
    password: 'BmsApp@2026',
    database: 'bms_db',
    port: 3306
  });

  const [rows] = await connection.execute("SHOW CREATE TABLE exhibition");
  console.log(rows[0]['Create Table']);
  
  const [rows2] = await connection.execute("SHOW CREATE TABLE exhibition_stock");
  console.log(rows2[0]['Create Table']);

  await connection.end();
}

test();
