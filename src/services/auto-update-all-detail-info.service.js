import { pool } from '../utils/pool.js';
import dayjs from 'dayjs';
import { logToFile } from '../utils/logger.js';
const update_time_date = '2025-05-30';
const second_time_date = dayjs(update_time_date).subtract(1, 'day').format('YYYY-MM-DD');
/**
 * 获取可转债摘要数据
 * @param {number} limit - 返回记录数量限制
 * @param {Object} filters - 过滤条件
 * @returns {Promise<Array>} 可转债摘要数据数组
 */
export async function fetchDetailListData() {
  let conn;
  try {
    conn = await pool.getConnection();

    // 构建基础查询，添加 bond_cells 表连接
    let query = `
      SELECT 
        s.*,
        bc.update_time,
        bc.min_price_date,
        bc.min_history_price,
        bc.max_price_date,
        bc.max_history_price,
        bc.info,
        bs.is_blacklisted,
        bs.is_state_owned,
        bs.is_favorite
      FROM summary s
      LEFT JOIN bond_strategies bs ON s.bond_id = bs.bond_id
      LEFT JOIN bond_cells bc ON s.bond_id = bc.bond_id
    `;

    // 添加过滤条件
    // 直接将 limit 值添加到查询字符串中
    query += ` LIMIT 2000`;
    const [rows] = await conn.execute(query);

    // 获取当前日期
    const today = dayjs().format('YYYY-MM-DD');
    const validRows = [];

    // 处理每一行数据
    for (const row of rows) {
      // 处理日期格式 maturity_dt到期时间
      try {
        if (row.maturity_dt) {
          row.maturity_dt = dayjs(row.maturity_dt).format('YYYY-MM-DD');
          // 过滤掉已到期的可转债 三板的 eb可交债
          if (
            row?.maturity_dt < today ||
            row?.market_cd === 'sb' ||
            row?.btype === 'E' ||
            parseInt(row?.is_blacklisted) === 1 ||
            row?.redeem_status === '已公告强赎' ||
            row?.redeem_status?.match(/强赎\s(\d{4}-\d{2}-\d{2})最后交易/)
          ) {
            continue;
          }
        }
      } catch (e) {
        console.error('maturity_dt 格式错误', row.bond_nm, row.maturity_dt);
      }
      let lastItem = row?.info?.rows?.[0];
      let secondItem = row?.info?.rows?.[1];
      if (
        lastItem &&
        secondItem &&
        lastItem.id === row.bond_id &&
        secondItem.id === row.bond_id &&
        (lastItem?.cell?.last_chg_dt !== update_time_date ||
          secondItem?.cell?.last_chg_dt !== second_time_date)
      ) {
        validRows.push(row);
      }
    }
    const updateBondData = async (bond_id, updateData = {}) => {
      const [existingRows] = await conn.execute(
        'SELECT bond_id FROM bond_cells WHERE bond_id = ?',
        [bond_id],
      );

      if (existingRows.length > 0) {
        // 构建动态更新SQL
        const updateFields = [];
        const updateValues = [];

        if ('info' in updateData) {
          updateFields.push('info = ?');
          updateValues.push(updateData.info);
        }

        if ('max_history_price' in updateData) {
          updateFields.push('max_history_price = ?');
          updateValues.push(updateData.max_history_price);
        }
        if ('min_history_price' in updateData) {
          updateFields.push('min_history_price = ?');
          updateValues.push(updateData.min_history_price);
        }

        if ('max_price_date' in updateData) {
          updateFields.push('max_price_date = ?');
          updateValues.push(updateData.max_price_date);
        }
        if ('min_price_date' in updateData) {
          updateFields.push('min_price_date = ?');
          updateValues.push(updateData.min_price_date);
        }

        if (updateFields.length > 0) {
          const updateSQL = `UPDATE bond_cells SET ${updateFields.join(', ')} WHERE bond_id = ?`;
          updateValues.push(bond_id);
          await conn.execute(updateSQL, updateValues);
          console.log(`更新${bond_id}成功`, Object.keys(updateData));
        }
      } else {
        // 构建插入字段和值
        const insertFields = ['bond_id'];
        const insertValues = [bond_id];
        const placeholders = ['?'];

        if ('info' in updateData) {
          insertFields.push('info');
          insertValues.push(updateData.info);
          placeholders.push('?');
        }
        // max_price_date
        if ('max_history_price' in updateData) {
          insertFields.push('max_history_price');
          insertValues.push(updateData.max_history_price);
          placeholders.push('?');
        }

        if ('min_history_price' in updateData) {
          insertFields.push('min_history_price');
          insertValues.push(updateData.min_history_price);
          placeholders.push('?');
        }

        if ('max_price_date' in updateData) {
          insertFields.push('max_price_date');
          insertValues.push(updateData.max_price_date);
          placeholders.push('?');
        }
        if ('min_price_date' in updateData) {
          insertFields.push('min_price_date');
          insertValues.push(updateData.min_price_date);
          placeholders.push('?');
        }

        const insertSQL = `INSERT INTO bond_cells (${insertFields.join(
          ', ',
        )}) VALUES (${placeholders.join(', ')})`;
        console.log('执行插入 SQL:', insertSQL);
        console.log('插入值:', insertValues);
        await conn.execute(insertSQL, insertValues);
        console.log(`插入${bond_id}成功`);
      }
    };
    for (let i = 0; i < validRows?.length; i++) {
      let item = validRows[i];
      let info = item?.info;
      let rows = info?.rows;
      let total = info?.total;
      let min_history_price = item.min_history_price;
      let max_history_price = item.max_history_price;
      let min_price_date = item.min_price_date;
      let max_price_date = item.max_price_date;
      // 确保日期格式正确
      if (parseFloat(item.price) < parseFloat(item.min_history_price)) {
        min_history_price = item.price;
        min_price_date = update_time_date; // "2025-05-29T16:00:00.000Z"
      }
      if (parseFloat(item.price) > parseFloat(item.max_history_price)) {
        max_history_price = item.price;
        max_price_date = update_time_date;
      }
      if (rows && rows.length > 0) {
        rows.unshift({
          id: item.bond_id,
          cell: {
            price: item.price,
            sprice: item.sprice,
            volume: item.volume,
            ytm_rt: item.ytm_rt + '%',
            bond_id: item.bond_id,
            premium_rt: item.premium_rt + '%',
            last_chg_dt: update_time_date,
            turnover_rt: item.turnover_rt + '%',
            curr_iss_amt: item.curr_iss_amt,
            stock_volume: item.stock_volume,
            convert_value: item.convert_value,
          },
        });
      }
      item.total = total + 1;
      await updateBondData(validRows[i]?.bond_id, {
        info,
        max_history_price,
        min_history_price,
        min_price_date,
        max_price_date,
      });
    }
    return validRows;
  } catch (error) {
    const errorMessage = `更新info数据失败: ${error.message}`;
    console.error(errorMessage);
    logToFile(errorMessage);
    throw error;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}
