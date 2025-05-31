import { pool } from '../utils/pool.js';
import dayjs from 'dayjs';
import { logToFile } from '../utils/logger.js';
const update_time_date = '2025-05-30';
const second_time_date = dayjs(update_time_date).subtract(1, 'day').format('YYYY-MM-DD');
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
        bc.info,
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
    const safeLimit = Math.max(1, Math.min(2000, parseInt(limit) || 3000));
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
      try {
        if (row.maturity_dt) {
          row.maturity_dt = dayjs(row.maturity_dt).format('YYYY-MM-DD');
          // 过滤掉已到期的可转债 三板的 eb可交债
          if (
            row?.maturity_dt < today ||
            row?.market_cd === 'sb' ||
            row?.btype === 'E' ||
            parseFloat(row?.price) > 180 ||
            row?.redeem_status === '已公告强赎' ||
            parseInt(row?.is_blacklisted) === 1 ||
            row?.redeem_status?.match(/强赎\s(\d{4}-\d{2}-\d{2})最后交易/)
          ) {
            continue;
          }
        }
      } catch (e) {
        console.error('maturity_dt 格式错误', row.bond_nm, row.maturity_dt);
      }
      let requireUpdate = false;
      let adjust_condition = row.adjust_condition;
      let redeem_status = row.redeem_status;
      const pattern = /^\d+\/\d+\s*\|\s*\d+$/;
      const isValid1 = pattern.test(adjust_condition);
      const matches1 = adjust_condition.match(/(\d+)\/(\d+)/);
      if (isValid1 && matches1) {
        const firstNum = parseInt(matches1[1]); // "5"
        const secondNum = parseInt(matches1[2]); // "15"
        if (secondNum - 2 === firstNum) {
          // console.log('isValid', isValid1, matches1, adjust_condition, row.bond_nm);
          requireUpdate = true;
        }
      }
      const isValid2 = pattern.test(redeem_status);
      const matches2 = redeem_status.match(/(\d+)\/(\d+)/);
      if (isValid2 && matches2) {
        const firstNum = parseInt(matches2[1]); // "5"
        const secondNum = parseInt(matches2[2]); // "15"
        if (secondNum - 2 === firstNum) {
          // console.log('isValid', isValid2, matches2, redeem_status, row.bond_nm);
          requireUpdate = true;
        }
      }
      let lastItem = row?.info?.rows?.[0];
      let secondItem = row?.info?.rows?.[1];
      if (requireUpdate) {
        console.log('requireUpdate', row.bond_nm);
      }
      if (
        requireUpdate
        // row?.info &&
        // row?.info?.rows &&
        // lastItem &&
        // secondItem &&
        // requireUpdate &&
        // lastItem.id === row.bond_id &&
        // secondItem.id === row.bond_id
        // &&
        // (lastItem?.cell?.last_chg_dt !== update_time_date ||
        //   secondItem?.cell?.last_chg_dt !== second_time_date)
      ) {
        validRows.push({ ...row, info: {} });
      }
    }
    // 按价格从小到大排序
    validRows.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
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
