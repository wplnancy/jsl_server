import { pool } from '../utils/pool.js';
import dayjs from 'dayjs';
import { logToFile } from '../utils/logger.js';

/**
 * 获取可转债摘要数据
 * @param {number} limit - 返回记录数量限制
 * @param {Object} filters - 过滤条件
 * @returns {Promise<Array>} 可转债摘要数据数组
 */
export async function fetchUpdateListData(limit = 100, filters = {}) {
  let conn;
  try {
    conn = await pool.getConnection();

    // 构建基础查询，添加 bond_cells 表连接
    let query = `
      SELECT 
        s.*,
        bs.target_price,
        bs.target_heavy_price,
        bs.is_state_owned,
        bs.profit_strategy,
        bs.finance_data,
        bs.is_blacklisted,
        bs.is_favorite,
        bs.sell_price,
        bs.level,
        bc.adj_logs,
        bc.update_time,
        bc.lt_bps,
        bc.cash_flow_data
      FROM summary s
      LEFT JOIN bond_strategies bs ON s.bond_id = bs.bond_id
      LEFT JOIN bond_cells bc ON s.bond_id = bc.bond_id
    `;

    // 添加过滤条件
    const whereConditions = [];
    const queryParams = [];

    if (filters.is_blacklisted !== undefined) {
      whereConditions.push('bs.is_blacklisted = ?');
      queryParams.push(Number(filters.is_blacklisted));
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // 直接将 limit 值添加到查询字符串中
    const safeLimit = Math.max(1, Math.min(1000, parseInt(limit) || 100));
    query += ` LIMIT ${safeLimit}`;
    const [rows] =
      whereConditions.length > 0
        ? await conn.execute(query, queryParams)
        : await conn.execute(query);

    // 获取当前日期
    const today = dayjs().format('YYYY-MM-DD');
    const validRows = [];
    // 处理每一行数据
    for (const row of rows) {
      // 处理日期格式 maturity_dt到期时间
      if (row.maturity_dt) {
        row.maturity_dt = dayjs(row.maturity_dt).format('YYYY-MM-DD');
        // 过滤掉已到期的可转债 三板的 eb可交债
        if (
          row.maturity_dt < today ||
          row.market_cd === 'sb' ||
          row.btype === 'E' ||
          dayjs(row.update_time).format('YYYY-MM-DD') === today
        ) {
          continue;
        }
      }

      if (
        parseFloat(row.price) < 140 &&
        parseFloat(row.price) > 94 &&
        // parseInt(row.is_favorite) !== 1 &&
        // (row?.lt_bps === null || row?.lt_bps === '') &&
        row.is_blacklisted !== 1 &&
        !(
          row?.redeem_status === '已公告强赎' ||
          row?.redeem_status?.match(/强赎\s(\d{4}-\d{2}-\d{2})最后交易/)
        )
      ) {
        validRows.push(row);
      }
    }
    console.log('validRows', validRows.length);
    return validRows;
  } catch (error) {
    const errorMessage = `获取可转债摘要数据失败: ${error.message}`;
    console.error(errorMessage);
    logToFile(errorMessage);
    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}
