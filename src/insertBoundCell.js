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
      const {
        bond_id,
        industry,
        concept,
        max_history_price,
        min_history_price,
        info = JSON.stringify([])
      } = item;
      
      // 使用 ON DUPLICATE KEY UPDATE 实现 upsert
      const [result] = await connection.query(
        `INSERT INTO bond_cells (
          bond_id,
          industry,
          concept,
          max_history_price,
          min_history_price,
          info
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          industry = COALESCE(VALUES(industry), industry),
          concept = COALESCE(VALUES(concept), concept),
          max_history_price = COALESCE(VALUES(max_history_price), max_history_price),
          min_history_price = COALESCE(VALUES(min_history_price), min_history_price),
          info = COALESCE(VALUES(info), info)`,
        [
          bond_id,
          industry || null,
          concept || null,
          max_history_price || null,
          min_history_price || null,
          info || null
        ]
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
