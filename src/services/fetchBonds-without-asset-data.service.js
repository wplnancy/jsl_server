import { pool } from '../utils/pool.js';
import { logToFile } from '../utils/logger.js';
import dayjs from 'dayjs';

/**
 * 获取没有资产数据的可转债列表
 * @returns {Promise<Array>} 可转债列表
 */
export async function fetchBondsWithoutAssetData() {
  let conn;
  try {
    // maturity_dt
    conn = await pool.getConnection();
    const query = `SELECT 
      s.*,
      s.maturity_dt,
      bs.is_favorite,
      bs.is_blacklisted,
      bc.asset_data as asset_data,
      bc.debt_data as debt_data,
      bc.cash_flow_data as cash_flow_data
    FROM bond_cells bc
    LEFT JOIN summary s ON bc.bond_id = s.bond_id 
    LEFT JOIN bond_strategies bs ON bc.bond_id = bs.bond_id
    WHERE (bc.asset_data IS NULL OR bc.debt_data IS NULL OR bc.cash_flow_data IS NULL)
    `;

    const [rows] = await conn.execute(query);

    // 获取当前日期
    const today = dayjs().format('YYYY-MM-DD');

    // 过滤数据
    const filteredRows = rows.filter((row) => {
      // 过滤掉 btype 为 'E' 的数据
      if (row.btype === 'E') {
        return false;
      }

      // 过滤掉已到期的数据
      if (row.maturity_dt && dayjs(row.maturity_dt).format('YYYY-MM-DD') < today) {
        return false;
      }

      return true;
    });

    return filteredRows;
  } catch (error) {
    const errorMessage = `fetchBondsWithoutAssetData函数执行时报错: ${error.message}`;
    console.error(errorMessage);
    logToFile(errorMessage);
    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}