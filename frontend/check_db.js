const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'bms_user',
    password: 'BmsApp@2026',
    database: 'bms_db',
    port: 3306
  });

  const [rows] = await connection.execute('SELECT * FROM central_stock ORDER BY updated_at DESC');
  console.log('Central Stock:');
  console.table(rows);
  
  const [po] = await connection.execute('SELECT * FROM purchase_order ORDER BY created_at DESC LIMIT 1');
  console.log('\nLatest PO:');
  console.table(po);
  
  if (po.length > 0) {
    const [poItems] = await connection.execute('SELECT * FROM purchase_order_item WHERE purchase_order_id = ?', [po[0].id]);
    console.log('\nPO Items:');
    console.table(poItems);
  }

  await connection.end();
}

check().catch(console.error);
