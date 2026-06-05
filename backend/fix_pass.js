const mysql = require('mysql2/promise');

async function fix() {
  const conn = await mysql.createConnection({ host: '127.0.0.1', user: 'root', database: 'e_logbook' });
  await conn.query('UPDATE users SET password = ? WHERE username = "admin"', ['$2a$10$wN18eT4o/O4OQdK9u34/nOl.j5.X1w/67jOaE1jVzSg3gK7uYvI5e']);
  console.log('Success updating admin password to "admin"!');
  await conn.end();
}

fix().catch(console.error);
