import { pool } from '../utils/pool.js';
import dayjs from 'dayjs';
import { parseAdjustData } from '../utils/parser.js';
import { parseCashFlowData } from '../utils/cash-flow-parser.js';
import { logToFile } from '../utils/logger.js';
/**
 * 获取可转债摘要数据
 * @param {number} limit - 返回记录数量限制
 * @param {Object} filters - 过滤条件
 * @returns {Promise<Array>} 可转债摘要数据数组
 */
export async function fetchSummaryData(limit = 100, filters = {}) {
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
        bs.sell_price,
        bs.level,
        IFNULL(bs.is_analyzed, 0) as is_analyzed,
        IFNULL(bs.is_favorite, 0) as is_favorite,
        bc.adj_logs,
        bc.update_time,
        bc.cash_flow_data,
        bc.lt_bps
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
    // console.log(whereConditions, queryParams, query);
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
        if (row.maturity_dt < today || row.market_cd === 'sb' || row.btype === 'E') {
          continue;
        }
      }

      // 确保is_analyzed为数字类型，并设置默认值
      row.is_analyzed = row.is_analyzed ? 1 : 0;

      // 确保target_price和level有默认值
      row.target_price = row.target_price || null;
      row.level = row.level || '';

      // 处理下修记录
      if (row.adj_logs) {
        // 解析下修记录
        row.adj_records = parseAdjustData(row.adj_logs, row.bond_id);
      } else {
        row.adj_records = [];
      }

      // 处理现金流数据
      if (row.cash_flow_data) {
        const profitData = parseCashFlowData(row.cash_flow_data, row.bond_id);
        if (profitData) {
          //  net_profits 最近3年的净利润数组
          row.net_profits = profitData.profits;
          //  net_profits 最近3年的净利润总和
          row.total_profit = profitData.total;
          //  profit_bond_gap 剩余规模- 最近3年净利润总和的值 curr_iss_amt 剩余规模
          row.profit_bond_gap = Number((row.curr_iss_amt - profitData.total).toFixed(2));
        }
      }

      delete row.adj_logs;
      delete row.cash_flow_data;

      // 将有效的数据添加到结果数组
      validRows.push(row);
    }
    let favList = validRows.filter((item) => parseInt(item.is_favorite) === 1);
    let notFavList = validRows.filter((item) => parseInt(item.is_favorite) !== 1);

    return [...favList, ...notFavList];
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
