import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '968716asD',
  database: 'kzz_datax',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
