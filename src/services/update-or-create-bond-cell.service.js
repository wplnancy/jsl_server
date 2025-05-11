import { pool } from '../utils/pool.js';
import { logToFile } from '../utils/logger.js';

/**
 * 更新或创建 bond_cells 记录
 * @param {string} stock_nm
 * @param {string} bond_id
 * @param {Object} updateData
 * @returns {Promise<{success: boolean, bond_id: string}>}
 */
export async function updateOrCreateBondCell({ stock_nm, bond_id, updateData = {} }) {
  let conn;
  try {
    conn = await pool.getConnection();
    let bond_ids = [];
    // 如果没有传入 bond_id，则通过 stock_nm 查询
    if (!bond_id && stock_nm) {
      const [bondRows] = await conn.execute('SELECT bond_id FROM summary WHERE stock_nm = ?', [
        stock_nm,
      ]);
      if (bondRows.length === 0) {
        logToFile(`updateOrCreateBondCell 未找到股票名称为 ${stock_nm} 的记录`);
        throw new Error(`未找到股票名称为 ${stock_nm} 的记录`);
      }

      bond_ids = bondRows.map((item) => item.bond_id);
    }
    if (bond_id && !stock_nm) {
      bond_ids = [bond_id];
    }

    if (bond_ids?.length === 0) {
      logToFile(`updateOrCreateBondCell 没有提供 bond_id 和 stock_nm`);
      throw new Error('必须提供 bond_id 或 stock_nm');
    }
    const updateBondData = async (finalBondId) => {
      const [existingRows] = await conn.execute(
        'SELECT bond_id FROM bond_cells WHERE bond_id = ?',
        [finalBondId],
      );

      if (existingRows.length > 0) {
        // 构建动态更新SQL
        const updateFields = [];
        const updateValues = [];

        if ('asset_data' in updateData) {
          updateFields.push('asset_data = ?');
          updateValues.push(updateData.asset_data);
        }
        if ('debt_data' in updateData) {
          updateFields.push('debt_data = ?');
          updateValues.push(updateData.debt_data);
        }
        if ('cash_flow_data' in updateData) {
          updateFields.push('cash_flow_data = ?');
          updateValues.push(updateData.cash_flow_data);
        }
        if ('industry' in updateData) {
          updateFields.push('industry = ?');
          updateValues.push(updateData.industry);
        }

        if ('redeem_tc' in updateData) {
          updateFields.push('redeem_tc = ?');
          updateValues.push(updateData.redeem_tc);
        }

        if ('put_tc' in updateData) {
          updateFields.push('put_tc = ?');
          updateValues.push(updateData.put_tc);
        }

        if ('lt_bps' in updateData) {
          updateFields.push('lt_bps = ?');
          updateValues.push(updateData.lt_bps);
        }

        if ('cpn_desc' in updateData) {
          updateFields.push('cpn_desc = ?');
          updateValues.push(updateData.cpn_desc);
        }

        if ('unredeem_logs' in updateData) {
          updateFields.push('unredeem_logs = ?');
          updateValues.push(updateData.unredeem_logs);
        }

        if ('info' in updateData) {
          updateFields.push('info = ?');
          updateValues.push(updateData.info);
        }
        if ('adjust_tc' in updateData) {
          updateFields.push('adjust_tc = ?');
          updateValues.push(updateData.adjust_tc);
        }
        // issuanceScale
        if ('issuanceScale' in updateData) {
          updateFields.push('issuanceScale = ?');
          updateValues.push(updateData.issuanceScale);
        }
        if ('concept' in updateData) {
          updateFields.push('concept = ?');
          updateValues.push(updateData.concept);
        }
        if ('max_history_price' in updateData) {
          updateFields.push('max_history_price = ?');
          updateValues.push(updateData.max_history_price);
        }
        if ('min_history_price' in updateData) {
          updateFields.push('min_history_price = ?');
          updateValues.push(updateData.min_history_price);
        }
        if ('adj_logs' in updateData) {
          updateFields.push('adj_logs = ?');
          updateValues.push(updateData.adj_logs);
        }
        if ('unadj_logs' in updateData) {
          updateFields.push('unadj_logs = ?');
          updateValues.push(updateData.unadj_logs);
        }

        if (updateFields.length > 0) {
          const updateSQL = `UPDATE bond_cells SET ${updateFields.join(', ')} WHERE bond_id = ?`;
          updateValues.push(finalBondId);
          await conn.execute(updateSQL, updateValues);
          console.log(`更新${finalBondId}成功`);
        }
      } else {
        // 构建插入字段和值
        const insertFields = ['bond_id'];
        const insertValues = [finalBondId];
        const placeholders = ['?'];

        if ('asset_data' in updateData) {
          insertFields.push('asset_data');
          insertValues.push(updateData.asset_data);
          placeholders.push('?');
        }

        if ('redeem_tc' in updateData) {
          insertFields.push('redeem_tc');
          insertValues.push(updateData.redeem_tc);
          placeholders.push('?');
        }

        if ('lt_bps' in updateData) {
          insertFields.push('lt_bps');
          insertValues.push(updateData.lt_bps);
          placeholders.push('?');
        }

        if ('put_tc' in updateData) {
          insertFields.push('put_tc');
          insertValues.push(updateData.put_tc);
          placeholders.push('?');
        }
        // 发行规模
        if ('issuanceScale' in updateData) {
          insertFields.push('issuanceScale');
          insertValues.push(updateData.issuanceScale);
          placeholders.push('?');
        }
        if ('cpn_desc' in updateData) {
          insertFields.push('cpn_desc');
          insertValues.push(updateData.cpn_desc);
          placeholders.push('?');
        }

        if ('unredeem_logs' in updateData) {
          insertFields.push('unredeem_logs');
          insertValues.push(updateData.unredeem_logs);
          placeholders.push('?');
        }

        if ('debt_data' in updateData) {
          insertFields.push('debt_data');
          insertValues.push(updateData.debt_data);
          placeholders.push('?');
        }
        if ('cash_flow_data' in updateData) {
          insertFields.push('cash_flow_data');
          insertValues.push(updateData.cash_flow_data);
          placeholders.push('?');
        }
        if ('industry' in updateData) {
          insertFields.push('industry');
          insertValues.push(updateData.industry);
          placeholders.push('?');
        }
        if ('info' in updateData) {
          insertFields.push('info');
          insertValues.push(updateData.info);
          placeholders.push('?');
        }
        if ('adjust_tc' in updateData) {
          insertFields.push('adjust_tc');
          insertValues.push(updateData.adjust_tc);
          placeholders.push('?');
        }
        if ('concept' in updateData) {
          insertFields.push('concept');
          insertValues.push(updateData.concept);
          placeholders.push('?');
        }
        if ('adj_logs' in updateData) {
          insertFields.push('adj_logs');
          insertValues.push(updateData.adj_logs);
          placeholders.push('?');
        }
        if ('unadj_logs' in updateData) {
          insertFields.push('unadj_logs');
          insertValues.push(updateData.unadj_logs);
          placeholders.push('?');
        }
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

        const insertSQL = `INSERT INTO bond_cells (${insertFields.join(
          ', ',
        )}) VALUES (${placeholders.join(', ')})`;
        console.log('执行插入 SQL:', insertSQL);
        console.log('插入值:', insertValues);
        await conn.execute(insertSQL, insertValues);
        console.log(`插入${finalBondId}成功`);
      }
    };
    for (let i = 0; i < bond_ids?.length; i++) {
      await updateBondData(bond_ids[i]);
    }
    // 检查 bond_cells 记录是否存在

    return { success: true, bond_id: bond_ids.toString() };
  } catch (error) {
    console.error('更新或创建 bond_cells 记录失败:', error);
    logToFile(`更新或创建 bond_cells 记录失败: ${error.message}`);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}
