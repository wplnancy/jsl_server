import mysql from 'mysql2/promise';
import { dbConfig } from './config/db.config.js';

export const delay = async (time = 1000) => {
  await new Promise((resolve) => setTimeout(resolve, time)); // 等待指定时间
};

const getCurrentDateTime = () => {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours(),
  )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};
export const update_summary_bond_cells = async (data) => {
  console.log('update_summary_bond_cells-start')
  console.log(data)
  console.log('update_summary_bond_cells-end')
  
  // 我需要查询summary表和bond_cells表，获取每一行的bond_id的值，如果bond_id的值不在data数组中，则删除这一行
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 如果data为空数组，则不执行任何删除操作
    if (data.length === 0) {
      console.log('传入数据为空，不执行删除操作');
      return;
    }
    
    // 获取传入数据中的所有bond_id
    const dataBondIds = data;
    const placeholders = dataBondIds.map(() => '?').join(',');
    
    // 删除summary表中不在data中的记录
    const deleteSummaryQuery = `DELETE FROM summary WHERE bond_id NOT IN (${placeholders})`;
    const [summaryResult] = await connection.execute(deleteSummaryQuery, dataBondIds);
    console.log(`从summary表中删除了 ${summaryResult.affectedRows} 条不在数据中的记录`);
    
    // 删除bond_cells表中不在data中的记录
    const deleteBondCellsQuery = `DELETE FROM bond_cells WHERE bond_id NOT IN (${placeholders})`;
    const [bondCellsResult] = await connection.execute(deleteBondCellsQuery, dataBondIds);
    console.log(`从bond_cells表中删除了 ${bondCellsResult.affectedRows} 条不在数据中的记录`);
    
    console.log('update_summary_bond_cells 执行完成');
  } catch (error) {
    console.error('更新summary和bond_cells表时出错:', error);
    throw error;
  } finally {
    await connection.end();
  }
};
export const insertDataToDB = async (data) => {
  const fields = [
    'bond_id',
    'bond_nm',
    'bond_py',
    'price',
    'increase_rt',
    'last_5d_rt',
    'last_20d_rt',
    'last_3m_rt',
    'last_1y_rt',
    'stock_id',
    'stock_nm',
    'stock_py',
    'sprice',
    'sincrease_rt',
    'pb',
    'pe',
    'roe',
    'dividend_rate',
    'pe_temperature',
    'pb_temperature',
    'int_debt_rate',
    'pledge_rt',
    'market_value',
    'revenue',
    'revenue_growth',
    'profit',
    'profit_growth',
    'convert_price',
    'convert_value',
    'convert_dt',
    'premium_rt',
    'bond_premium_rt',
    'dblow',
    'adjust_condition',
    'sw_nm_r',
    'sw_cd',
    'market_cd',
    'btype',
    'list_dt',
    't_flag',
    'owned',
    'hold',
    'bond_value',
    'rating_cd',
    'option_value',
    'volatility_rate',
    'put_convert_price',
    'force_redeem_price',
    'convert_amt_ratio',
    'convert_amt_ratio2',
    'fund_rt',
    'maturity_dt',
    'year_left',
    'curr_iss_amt',
    'volume',
    'svolume',
    'turnover_rt',
    'ytm_rt',
    'ytm_rt_tax',
    'put_ytm_rt',
    'notes',
    'pct_rpt',
    'total_market_value',
    'redeem_price_total',
    'redeem_status',
    'province',
    'sturnover_rt',
    'slast_5d_rt',
    'slast_20d_rt',
    'slast_3m_rt',
    'slast_1y_rt',
    'bond_stdevry',
    'bond_md',
    'bond_bias20',
    'stock_bias20',
    'float_iss_amt',
    'float_iss_value',
    'total_cash_value',
    'last_6m_rt',
    'slast_6m_rt',
    'this_y_rt',
    'sthis_y_rt',
    'noted',
    'last_time',
    'qstatus',
    'sqflag',
    'pb_flag',
    'adj_cnt',
    'adj_scnt',
    'convert_price_valid',
    'convert_price_tips',
    'convert_cd_tip',
    'ref_yield_info',
    'adjusted',
    'orig_iss_amt',
    'price_tips',
    'redeem_dt',
    'real_force_redeem_price',
    'option_tip',
    'pct_chg',
    'adjust_status',
    'unadj_cnt',
    'after_next_put_dt',
    'redeem_remain_days',
    'adjust_remain_days',
    'adjust_orders',
    'redeem_orders',
    'icons',
    'is_min_price',
    'blocked',
    'debt_rate',
    'putting',
    'updated_at',
  ];

  const sanitizeItem = (item) => {
    const values = [];
    const updateFields = [];
    const updateValues = [];

    // 强制更新时间
    item.updated_at = getCurrentDateTime();

    fields.forEach((field) => {
      if (field in item) {
        let value = item[field];
        if (field === 't_flag' || field === 'icons') {
          value = JSON.stringify(value);
        }
        if (typeof value === 'string') {
          value = value.trim();
        }
        values.push(value);
        updateFields.push(`${field} = ?`);
        updateValues.push(value);
      }
    });

    // 保证updated_at一定在updateFields和updateValues里
    if (!updateFields.includes('updated_at = ?')) {
      updateFields.push('updated_at = ?');
      updateValues.push(item.updated_at);
    }
    if (!fields.includes('updated_at')) {
      values.push(item.updated_at);
    }

    return { values, updateFields, updateValues };
  };

  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('Database connection established.');

    for (const item of data) {
      const { values, updateFields, updateValues } = sanitizeItem(item);

      if (!item.bond_id) {
        console.error('跳过没有 bond_id 的数据');
        continue;
      }

      // 检查记录是否存在
      const [existingRows] = await connection.execute(
        'SELECT bond_id FROM summary WHERE bond_id = ?',
        [item.bond_id],
      );

      if (existingRows.length > 0) {
        // 更新现有记录，强制更新时间
        if (updateFields.length > 0) {
          const updateSQL = `UPDATE summary SET ${updateFields.join(', ')} WHERE bond_id = ?`;
          await connection.execute(updateSQL, [...updateValues, item.bond_id]);
        }
      } else {
        // 插入新记录，强制更新时间
        const insertFields = fields.filter((field) => field in item);
        if (!insertFields.includes('updated_at')) {
          insertFields.push('updated_at');
        }
        const insertSQL = `
          INSERT INTO summary (${insertFields.join(', ')})
          VALUES (${Array(insertFields.length).fill('?').join(', ')})
        `;
        await connection.execute(insertSQL, values);
      }
    }

    console.log('Data inserted or updated successfully.');
  } catch (error) {
    console.error('Error inserting or updating data:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed.');
  }
};

export const checkCookieValidity = async (cookies) => {
  console.log('检查 cookies:');
  try {
    if (!cookies) return false;
    // 找到指定的 cookie
    const loginCookie = cookies.find((cookie) => cookie.name === 'kbzw__user_login');
    if (!loginCookie) {
      console.warn('Cookie kbzw__user_login 不存在，可能需要重新登录');
      return false; // 表示需要重新登录
    }

    const currentTime = Date.now() / 1000; // 当前时间戳（秒）
    console.info(
      `Cookie "kbzw__user_login" expires at: ${loginCookie.expires}, current time: ${currentTime}`,
    );

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
