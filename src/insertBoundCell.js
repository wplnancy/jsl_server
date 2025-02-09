import mysql from 'mysql2/promise';

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
  // 连接到数据库
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'kzz_datax'
  });

  try {
    console.log('Database connection established.');

    // 动态生成插入和更新的 SQL 查询
    const updateFields = fields
      // .filter(field => field !== "id")  // 排除主键
      .map(field => `${field} = VALUES(${field})`)  // 用于 ON DUPLICATE KEY UPDATE 子句
      .join(", ");

    const query = `
      INSERT INTO bond_cells (
        ${fields.join(", ")}
      ) VALUES (
        ${fields.map(() => "?").join(", ")}
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

    console.log('Data inserted or updated successfully.');
  } catch (error) {
    console.error('Error inserting or updating data:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed.');
  }
};
