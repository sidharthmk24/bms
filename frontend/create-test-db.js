const mysql = require('mysql2/promise');

async function createDb() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
  });

  await connection.query('CREATE DATABASE IF NOT EXISTS bms_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
  console.log('Database bms_test created or already exists.');
  await connection.end();
}

createDb().catch(console.error);
