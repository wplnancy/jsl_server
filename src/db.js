import mysql from 'mysql2/promise';
import { dbConfig } from './config/db.config.js';

export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
