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
        info = JSON.stringify([]),
        adj_logs,
        max_price_date,
        min_price_date
      } = item;

      // 处理日期格式
      const formatDate = (dateStr) => {
        if (!dateStr) return null;
        // 移除多余的空格和时间部分
        return dateStr.trim().split(' ')[0];
      };

      // 确保所有值都被正确处理
      const values = [
        bond_id,
        industry || null,
        concept || null,
        max_history_price || null,
        min_history_price || null,
        info || JSON.stringify([]),
        adj_logs ? encodeURIComponent(adj_logs) : null,
        formatDate(min_price_date),
        formatDate(max_price_date)
      ];

      console.log("准备插入的数据:", {
        bond_id,
        industry,
        concept,
        max_history_price,
        min_history_price,
        info_length: info ? info.length : 0,
        adj_logs_length: adj_logs ? adj_logs.length : 0,
        min_price_date: formatDate(min_price_date),
        max_price_date: formatDate(max_price_date)
      });

      // 使用 ON DUPLICATE KEY UPDATE 实现 upsert
      const [result] = await connection.query(
        `INSERT INTO bond_cells (
          bond_id,
          industry,
          concept,
          max_history_price,
          min_history_price,
          info,
          adj_logs,
          min_price_date,
          max_price_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          industry = COALESCE(VALUES(industry), industry),
          concept = COALESCE(VALUES(concept), concept),
          max_history_price = COALESCE(VALUES(max_history_price), max_history_price),
          min_history_price = COALESCE(VALUES(min_history_price), min_history_price),
          info = COALESCE(VALUES(info), info),
          adj_logs = COALESCE(VALUES(adj_logs), adj_logs),
          min_price_date = COALESCE(VALUES(min_price_date), min_price_date),
          max_price_date = COALESCE(VALUES(max_price_date), max_price_date)`,
        values
      );

      // 验证存储的数据
      const [stored] = await connection.query(
        'SELECT adj_logs, min_price_date, max_price_date FROM bond_cells WHERE bond_id = ?',
        [bond_id]
      );
      
      if (stored && stored[0]) {
        console.log("存储后的数据:", {
          adj_logs_length: stored[0].adj_logs ? stored[0].adj_logs.length : 0,
          min_price_date: stored[0].min_price_date,
          max_price_date: stored[0].max_price_date
        });
      }
      
      console.log(`债券 ${bond_id} 数据${result.affectedRows === 1 ? '插入' : '更新'}成功`);
    }
  } catch (error) {
    console.error('插入/更新债券数据失败:', error);
    throw error;
  } finally {
    connection.release();
  }
};
