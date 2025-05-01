import mysql from 'mysql2/promise';
import { dbConfig } from '../config/db.config.js';
import { logToFile } from '../utils/logger.js';
import dayjs from 'dayjs';

/**
 * 批量更新或插入指数历史数据
 * @param {Array<{price_dt: string, mid_price: number}>} dataArray - 指数历史数据数组
 * @returns {Promise<boolean>} 更新是否成功
 */
export async function updateIndexHistory(dataArray) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // 使用事务确保数据一致性
    await connection.beginTransaction();

    // 获取当前时间戳
    const currentTime = dayjs().format('YYYY-MM-DD HH:mm:ss');

    for (const item of dataArray) {
      const { price_dt, mid_price } = item;

      if (!price_dt || mid_price === undefined || mid_price === null) {
        const errorMessage = `updateIndexHistory数据格式错误: ${JSON.stringify(item)}`;
        console.error(errorMessage);
        logToFile(errorMessage);
        continue;
      }

      // 使用 ON DUPLICATE KEY UPDATE 实现更新或插入
      // 使用格式化后的时间戳
      const query = `
        INSERT INTO index_history (price_dt, mid_price, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        mid_price = VALUES(mid_price),
        updated_at = VALUES(updated_at)
      `;

      await connection.execute(query, [price_dt, mid_price, currentTime, currentTime]);
    }

    // 提交事务
    await connection.commit();
    return true;
  } catch (error) {
    // 发生错误时回滚事务
    await connection.rollback();
    const errorMessage = `更新指数历史数据失败: ${error.message} updateIndexHistory函数内部错误`;
    console.error(errorMessage);
    logToFile(errorMessage);
    throw error;
  } finally {
    await connection.end();
  }
}
