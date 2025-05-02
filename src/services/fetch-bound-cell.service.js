import { logToFile } from '../utils/logger.js';
import { pool } from '../utils/pool.js';

/**
 * 获取单只可转债的bond_cells及相关策略信息
 * @param {string} bond_id
 * @returns {Promise<Array>} 结果数组
 */
export async function fetchBoundCellData(bond_id) {
  let conn;
  try {
    conn = await pool.getConnection();
    const query = `
      SELECT 
        bc.*,
        s.finance_data,
        s.target_price,
        s.profit_strategy,
        s.target_heavy_price,
        s.level,
        s.is_analyzed,
        s.is_state_owned,
        s.is_favorite,
        s.is_blacklisted,
        s.sell_price
      FROM bond_cells bc
      LEFT JOIN bond_strategies s ON bc.bond_id = s.bond_id
      WHERE bc.bond_id = ?
    `;
    const [rows] = await conn.execute(query, [bond_id]);
    return rows;
  } catch (error) {
    console.error('获取bond_cell数据失败:', error);
    logToFile(`获取可转债${bond_id}详情数据失败 fetchBoundCellData: ${error.message}`);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}
