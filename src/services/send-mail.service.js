import { pool } from '../utils/pool.js';
import { logToFile } from '../utils/logger.js';

/**
 * 获取可转债摘要数据
 * @param {number} limit - 返回记录数量限制
 * @param {Object} filters - 过滤条件
 * @returns {Promise<Array>} 可转债摘要数据数组
 */
export async function fetchMailData() {
  let conn;
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      conn = await pool.getConnection();

      // 构建基础查询，添加 bond_cells 表连接
      let query = `
        SELECT 
          s.bond_nm,
          s.bond_id,
          s.increase_rt,
          s.price,
          s.market_cd,
          s.redeem_status,
          s.btype,
          s.maturity_dt,
          bs.target_price,
          bs.target_heavy_price,
          bs.is_favorite,
          bs.profit_strategy,
          bs.sell_price,
          bs.is_blacklisted,
          bs.level
        FROM summary s
        LEFT JOIN bond_strategies bs ON s.bond_id = bs.bond_id
        WHERE (
          (bs.target_price IS NOT NULL AND s.price <= bs.target_price) OR
          (bs.target_heavy_price IS NOT NULL AND s.price <= bs.target_heavy_price) OR
          (bs.sell_price IS NOT NULL AND s.price >= bs.sell_price) OR
          (bs.target_price IS NOT NULL AND (s.increase_rt >= 3 OR s.increase_rt <= -2))
        )
        AND (
          bs.target_price IS NOT NULL OR 
          bs.target_heavy_price IS NOT NULL OR 
          bs.sell_price IS NOT NULL
        )
        AND s.market_cd != 'sb'
        AND s.btype != 'E'
        AND s.maturity_dt > CURDATE()
      `;

      const [rows] = await conn.execute(query);
      const validRows = [];

      // 处理每一行数据
      for (const row of rows) {
        // 处理日期格式 maturity_dt到期时间
        if (
          row?.redeem_status === '已公告强赎' ||
          row?.redeem_status?.match(/强赎\s(\d{4}-\d{2}-\d{2})最后交易/) ||
          row?.is_favorite !== '1' ||
          row?.is_blacklisted === 1
        ) {
          continue;
        }
        validRows.push(row);
      }
      console.log(validRows.map((item) => item.bond_nm));
      return validRows;
    } catch (error) {
      retryCount++;
      const errorMessage = `查询fetchMailData数据失败 (尝试 ${retryCount}/${maxRetries}): ${error.message}`;
      console.error(errorMessage);
      logToFile(errorMessage);

      if (retryCount === maxRetries) {
        throw error;
      }

      // 等待一段时间后重试
      await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
    } finally {
      if (conn) {
        try {
          conn.release();
        } catch (releaseError) {
          console.error('释放连接失败:', releaseError);
        }
      }
    }
  }
}
