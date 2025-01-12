import * as fs from 'fs';
import * as mysql from 'mysql2/promise';

const data = JSON.parse(fs.readFileSync('./api-response.json', 'utf-8')).data;

const fields = [
  "bond_id", "bond_nm", "bond_py", "price", "increase_rt", "stock_id", "stock_nm", "stock_py", "sprice",
  "sincrease_rt", "pb", "int_debt_rate", "convert_price", "convert_value", "convert_dt", "premium_rt", "dblow",
  "sw_cd", "market_cd", "btype", "list_dt", "t_flag", "owned", "hold", "bond_value", "rating_cd", "option_value",
  "volatility_rate", "put_convert_price", "force_redeem_price", "convert_amt_ratio", "fund_rt", "maturity_dt",
  "year_left", "curr_iss_amt", "volume", "svolume", "turnover_rt", "ytm_rt", "put_ytm_rt", "notes", "noted",
  "last_time", "qstatus", "sqflag", "pb_flag", "adj_cnt", "adj_scnt", "convert_price_valid", "convert_price_tips",
  "convert_cd_tip", "ref_yield_info", "adjusted", "orig_iss_amt", "price_tips", "redeem_dt", "real_force_redeem_price",
  "option_tip", "after_next_put_dt", "icons", "is_min_price", "blocked", "debt_rate", "putting"
];

// 数据类型处理函数
const sanitizeItem = item => {
  return fields.map(field => {
    let value = item[field] ?? null;

    // 特殊字段序列化
    if (field === "t_flag" || field === "icons") {
      value = JSON.stringify(value);
    }

    // 类型转换示例
    if (field === "price" || field === "increase_rt") {
      value = parseFloat(value) || null;
    }

    return value;
  });
};

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'kzz_datax'
  });

  try {
    console.log('Database connection established.');

    // 动态生成更新子句
    const updateFields = fields
      .filter(field => field !== "bond_id") // 排除主键或唯一索引字段
      .map(field => `${field} = VALUES(${field})`) // ON DUPLICATE KEY UPDATE 子句
      .join(", ");

    const query = `
        INSERT INTO summary (
            ${fields.join(", ")}
        ) VALUES (
            ${fields.map(() => "?").join(", ")}
        )
        ON DUPLICATE KEY UPDATE
        ${updateFields}
    `;

    for (const item of data) {
      const values = sanitizeItem(item);
      if (item.bond_nm === '贵广转债') {
        console.log("item", item);
      }
      // console.log("Executing Query with values:", values); // 调试输出
      await connection.execute(query, values);
    }

    console.log('Data inserted or updated successfully.');
  } catch (error) {
    console.error('Error inserting or updating data:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed.');
  }
})();
