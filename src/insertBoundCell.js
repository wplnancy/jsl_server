import { pool } from './db.js';

// 定义数据字段
const fields = [
  "bond_id", "info"
];

// 数据类型处理函数
const sanitizeItem = (item) => {
  return fields.map(field => {
    let value = item[field] ?? null;

    return value;
  });
};

// 插入数据到数据库的函数
export const insertBoundCellData = async (data) => {
  const connection = await pool.getConnection();
  try {
    for (const item of data) {
      const { bond_id, info } = item;
      
      // 使用 ON DUPLICATE KEY UPDATE 实现 upsert
      const [result] = await connection.query(
        `INSERT INTO bound_cell (bond_id, info, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
         info = VALUES(info),
         updated_at = NOW()`,
        [bond_id, info]
      );
      
      console.log(`债券 ${bond_id} 数据${result.affectedRows === 1 ? '插入' : '更新'}成功`);
    }
  } catch (error) {
    console.error('插入/更新债券数据失败:', error);
    throw error;
  } finally {
    connection.release();
  }
};
