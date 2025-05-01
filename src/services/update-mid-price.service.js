import { pool } from '../utils/pool.js';
import { logToFile } from '../utils/logger.js';

/**
 * 获取可转债指数数据
 * @param {number} limit - 返回记录数量限制
 * @returns {Promise<Array>} 可转债指数数据数组
 */
export async function updateMedianPrice(medianPrice) {
  let conn;
  try {
    const query = `
    UPDATE bound_index 
    SET median_price = ? 
    WHERE id = 1
  `;

    conn = await pool.getConnection();
    // 直接将 limit 值添加到查询字符串中
    await conn.execute(query, [medianPrice]);
    return true;
  } catch (error) {
    const errorMessage = `updateMedianPrice失败: ${error.message}`;
    console.error(errorMessage);
    logToFile(errorMessage);
    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}
