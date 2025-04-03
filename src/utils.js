import mysql from 'mysql2/promise';

export const delay = async (time = 1000) => {
  await new Promise((resolve) => setTimeout(resolve, time)); // 等待指定时间
};

export const insertDataToDB = async (data) => {
  const fields = [
    "bond_id", "bond_nm", "bond_py", "price", "increase_rt", "last_5d_rt", "last_20d_rt", "last_3m_rt", "last_1y_rt", "stock_id",
    "stock_nm", "stock_py", "sprice", "sincrease_rt", "pb", "pe", "roe", "dividend_rate", "pe_temperature", "pb_temperature",
    "int_debt_rate", "pledge_rt", "market_value", "revenue", "revenue_growth", "profit", "profit_growth", "convert_price", "convert_value",
    "convert_dt", "premium_rt", "bond_premium_rt", "dblow", "adjust_condition", "sw_nm_r", "sw_cd", "market_cd", "btype", "list_dt", 
    "t_flag", "owned", "hold", "bond_value", "rating_cd", "option_value", "volatility_rate", "put_convert_price", "force_redeem_price",
    "convert_amt_ratio", "convert_amt_ratio2", "fund_rt", "maturity_dt", "year_left", "curr_iss_amt", "volume", "svolume", "turnover_rt",
    "ytm_rt", "ytm_rt_tax", "put_ytm_rt", "notes", "pct_rpt", "total_market_value", "redeem_price_total", "redeem_status", "province",
    "sturnover_rt", "slast_5d_rt", "slast_20d_rt", "slast_3m_rt", "slast_1y_rt", "bond_stdevry", "bond_md", "bond_bias20", "stock_bias20",
    "float_iss_amt", "float_iss_value", "total_cash_value", "last_6m_rt", "slast_6m_rt", "this_y_rt", "sthis_y_rt", "noted", "last_time",
    "qstatus", "sqflag", "pb_flag", "adj_cnt", "adj_scnt", "convert_price_valid", "convert_price_tips", "convert_cd_tip", "ref_yield_info",
    "adjusted", "orig_iss_amt", "price_tips", "redeem_dt", "real_force_redeem_price", "option_tip", "pct_chg", "adjust_status", "unadj_cnt",
    "after_next_put_dt", "redeem_remain_days", "adjust_remain_days", "adjust_orders", "redeem_orders", "icons", "is_min_price", "blocked",
    "debt_rate", "putting"
  ];

  const sanitizeItem = item => {
    return fields.map(field => {
      let value = item[field] ?? null;

      if (field === "t_flag" || field === "icons") {
        value = JSON.stringify(value);
      }

      if (typeof value === "string") {
        value = value.trim();
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
      const updateFields = fields.filter(field => field !== "bond_id")
        .map(field => `${field} = VALUES(${field})`)
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
};

export const checkCookieValidity = async (cookies) => {
  console.log('检查 cookies:');
  try {
    if (!cookies) return false;
      // 找到指定的 cookie
      const loginCookie = cookies.find(cookie => cookie.name === 'kbzw__user_login');
      if (!loginCookie) {
          console.warn('Cookie kbzw__user_login 不存在，可能需要重新登录');
          return false; // 表示需要重新登录
      }

      const currentTime = Date.now() / 1000; // 当前时间戳（秒）
      console.info(`Cookie "kbzw__user_login" expires at: ${loginCookie.expires}, current time: ${currentTime}`);

      if (loginCookie.expires > currentTime) {
          console.info('Cookie 未过期，无需重新登录');
          return true; // Cookie 有效
      } else {
          console.warn('Cookie 已过期，需要重新登录');
          return false; // Cookie 过期，需要重新登录
      }
  } catch (error) {
      console.error('检查 Cookie 有效性时发生错误:', error);
      return false; // 出现错误，默认需要重新登录
  }
};