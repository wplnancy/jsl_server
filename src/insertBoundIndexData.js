import mysql from 'mysql2/promise';
import { dbConfig } from './config/db.config.js';

// 定义数据字段
const fields = [
  'id',
  'bond_index',
  'median_price',
  'median_premium_rate',
  'yield_to_maturity',
  'created_at',
];

// 数据类型处理函数
const sanitizeItem = (item) => {
  return fields.map((field) => {
    let value = item[field] ?? null;

    return value;
  });
};

// 插入数据到数据库的函数
export const insertBoundIndexData = async (data) => {
  // 使用统一的数据库配置
  const connection = await mysql.createConnection(dbConfig);

  try {
    // console.log('Database connection established.');

    // 动态生成插入和更新的 SQL 查询
    const updateFields = fields
      // .filter(field => field !== "id")  // 排除主键
      .map((field) => `${field} = VALUES(${field})`) // 用于 ON DUPLICATE KEY UPDATE 子句
      .join(', ');

    const query = `
      INSERT INTO bound_index (
        ${fields.join(', ')}
      ) VALUES (
        ${fields.map(() => '?').join(', ')}
      )
      ON DUPLICATE KEY UPDATE
        ${updateFields}
    `;

    // 遍历数据并插入到数据库
    for (const item of data) {
      const values = sanitizeItem(item);

      // 如果你想调试查看每个值的插入情况，可以取消注释下面这一行
      // console.log("Executing Query with values:", values);

      await connection.execute(query, values);
    }

    // console.log('Data inserted or updated successfully.');
  } catch (error) {
    console.error('Error inserting or updating data:', error);
  } finally {
    await connection.end();
  }
};
