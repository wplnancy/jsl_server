import { pool } from '../utils/pool.js';
import { logToFile } from '../utils/logger.js';

/**
 * 更新或创建 bond_strategies 记录
 * @param {string} bond_id
 * @param {Object} updateData
 * @returns {Promise<boolean>}
 */
export async function updateOrCreateBondStrategy(bond_id, updateData = {}) {
  let conn;
  try {
    conn = await pool.getConnection();
    // 检查记录是否存在
    const [existingRows] = await conn.execute('SELECT id FROM bond_strategies WHERE bond_id = ?', [
      bond_id,
    ]);

    if (existingRows.length > 0) {
      // 构建动态更新SQL
      const updateFields = [];
      const updateValues = [];

      if ('target_price' in updateData) {
        updateFields.push('target_price = ?');
        updateValues.push(updateData.target_price);
      }

      if ('finance_data' in updateData) {
        updateFields.push('finance_data = ?');
        updateValues.push(updateData.finance_data);
      }
      if ('target_heavy_price' in updateData) {
        updateFields.push('target_heavy_price = ?');
        updateValues.push(updateData.target_heavy_price);
      }
      if ('is_state_owned' in updateData) {
        updateFields.push('is_state_owned = ?');
        updateValues.push(updateData.is_state_owned);
      }
      if ('level' in updateData) {
        updateFields.push('level = ?');
        updateValues.push(updateData.level);
      }
      if ('is_analyzed' in updateData) {
        updateFields.push('is_analyzed = ?');
        updateValues.push(updateData.is_analyzed);
      }
      if ('is_favorite' in updateData) {
        updateFields.push('is_favorite = ?');
        updateValues.push(updateData.is_favorite);
      }
      if ('profit_strategy' in updateData) {
        updateFields.push('profit_strategy = ?');
        updateValues.push(updateData.profit_strategy);
      }
      if ('is_blacklisted' in updateData) {
        updateFields.push('is_blacklisted = ?');
        updateValues.push(updateData.is_blacklisted);
      }
      if ('sell_price' in updateData) {
        updateFields.push('sell_price = ?');
        updateValues.push(updateData.sell_price);
      }

      if (updateFields.length > 0) {
        const updateSQL = `UPDATE bond_strategies SET ${updateFields.join(', ')} WHERE bond_id = ?`;
        updateValues.push(bond_id);
        await conn.execute(updateSQL, updateValues);
      }
    } else {
      const fields = ['bond_id'];
      const values = [bond_id];
      const placeholders = ['?'];

      if ('target_price' in updateData) {
        fields.push('target_price');
        values.push(updateData.target_price);
        placeholders.push('?');
      }
      if ('finance_data' in updateData) {
        fields.push('finance_data');
        values.push(updateData.finance_data);
        placeholders.push('?');
      }
      if ('target_heavy_price' in updateData) {
        fields.push('target_heavy_price');
        values.push(updateData.target_heavy_price);
        placeholders.push('?');
      }
      if ('is_state_owned' in updateData) {
        fields.push('is_state_owned');
        values.push(updateData.is_state_owned);
        placeholders.push('?');
      }
      if ('level' in updateData) {
        fields.push('level');
        values.push(updateData.level);
        placeholders.push('?');
      }
      if ('is_analyzed' in updateData) {
        fields.push('is_analyzed');
        values.push(updateData.is_analyzed);
        placeholders.push('?');
      }
      if ('is_favorite' in updateData) {
        fields.push('is_favorite');
        values.push(updateData.is_favorite);
        placeholders.push('?');
      }
      if ('profit_strategy' in updateData) {
        fields.push('profit_strategy');
        values.push(updateData.profit_strategy);
        placeholders.push('?');
      }
      if ('is_blacklisted' in updateData) {
        fields.push('is_blacklisted');
        values.push(updateData.is_blacklisted);
        placeholders.push('?');
      }
      if ('sell_price' in updateData) {
        fields.push('sell_price');
        values.push(updateData.sell_price);
        placeholders.push('?');
      }

      const insertSQL = `INSERT INTO bond_strategies (${fields.join(
        ', ',
      )}) VALUES (${placeholders.join(', ')})`;
      await conn.execute(insertSQL, values);
    }

    return true;
  } catch (error) {
    console.error('Error updating bond strategy:', error);
    logToFile(`更新${bond_id}转债策略失败 ${error.message}`);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}
