import { pool } from '../utils/pool.js';
import { logToFile } from '../utils/logger.js';

export const updateOrCreateFinancialData = async (data) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // 从summary表查询bond_id
    const [summaryRecords] = await connection.execute(
      'SELECT bond_id FROM summary WHERE stock_nm = ?',
      [data.stock_nm],
    );

    if (summaryRecords.length === 0) {
      throw new Error(`未找到可转债 ${data.stock_nm} 对应的bond_id`);
    }

    const bond_id = summaryRecords[0].bond_id;
    data.bond_id = bond_id; // 添加bond_id到数据对象中

    delete data.stock_nm;

    // 构建更新字段
    const updateFields = [];
    const values = [];
    const placeholders = [];

    // 遍历数据对象，构建SQL语句
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        updateFields.push(`${key} = ?`);
        values.push(value);
        placeholders.push('?');
      }
    });

    // 检查是否已存在记录
    const [existingRecords] = await connection.execute(
      'SELECT id FROM financial_data WHERE bond_id = ?',
      [data.bond_id],
    );

    if (existingRecords.length > 0) {
      // 更新现有记录
      const updateQuery = `
        UPDATE financial_data 
        SET ${updateFields.join(', ')}
        WHERE bond_id = ?
      `;
      values.push(data.bond_id);

      await connection.execute(updateQuery, values);
      return { success: true, message: '财务数据更新成功' };
    } else {
      // 插入新记录
      const insertQuery = `
        INSERT INTO financial_data 
        (${Object.keys(data)
          .filter((key) => data[key] !== undefined && data[key] !== null)
          .join(', ')})
        VALUES (${placeholders.join(', ')})
      `;

      await connection.execute(insertQuery, values);
      return { success: true, message: '财务数据创建成功' };
    }
  } catch (error) {
    console.error('更新或创建财务数据失败:', error);
    logToFile(`更新或创建财务数据失败: ${error.message}`);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
