import { pool } from '../utils/pool.js';
import { logToFile } from '../utils/logger.js';

/**
 * 获取可转债指数数据
 * @param {number} limit - 返回记录数量限制
 * @returns {Promise<Array>} 可转债指数数据数组
 */
export async function fetchMidPrice() {
  let conn;
  try {
    conn = await pool.getConnection();
    // 直接将 limit 值添加到查询字符串中
    const query = `SELECT * FROM bound_index`;
    const [rows] = await conn.execute(query);
    return rows;
  } catch (error) {
    const errorMessage = `获取可转债指数数据失败 fetchMidPrice: ${error.message}`;
    console.error(errorMessage);
    logToFile(errorMessage);
    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}
