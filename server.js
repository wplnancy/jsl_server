import Koa from 'koa';
import Router from 'koa-router';
import cors from 'koa2-cors';
import mysql from 'mysql2/promise';
import koaBody from 'koa-body';
import dayjs from 'dayjs';
import { insertDataToDB } from './src/utils.js';
import { pool } from './src/utils/pool.js';
import { API_URLS } from './src/constants/api-urls.js';
import { dbConfig } from './src/config/db.config.js';
import { initScheduler } from './src/scheduler.js';
import { parseAdjustData } from './src/utils/parser.js';
import { parseCashFlowData } from './src/utils/cash-flow-parser.js';
import { fetchSummaryData } from './src/services/summary.service.js';
import { fetchMidPrice } from './src/services/fetch-mid-price.service.js';
import { updateMedianPrice } from './src/services/update-mid-price.service.js';
import { updateIndexHistory } from './src/services/index-history.service.js';
import { fetchBondsWithoutAssetData } from './src/services/fetchBonds-without-asset-data.service.js';
import { logToFile } from './src/utils/logger.js';

const app = new Koa();
const router = new Router();

const startUrls = ['https://www.jisilu.cn/web/data/cb/list'];

// 使用 CORS 中间件，允许跨域
app.use(
  cors({
    origin: '*', // 允许所有来源访问
    allowMethods: ['GET', 'POST'], // 允许的请求方法
  }),
);

// 解析 JSON 请求体
app.use(koaBody.default());
// 防止重复请求的简单实现
let isRefreshing = false;
const REFRESH_COOLDOWN = 10 * 1000; // 10s 冷却时间
let lastRefreshTime = 0;

async function fetchBoundCellData(bond_id) {
  const connection = await mysql.createConnection(dbConfig);
  const query = `
    SELECT 
      bc.*,
      s.finance_data,
      s.target_price,
      s.profit_strategy,
      s.target_heavy_price,
      s.level,
      s.is_analyzed,
      s.is_state_owned,
      s.is_favorite,
      s.is_blacklisted,
      s.sell_price
    FROM bond_cells bc
    LEFT JOIN bond_strategies s ON bc.bond_id = s.bond_id
    WHERE bc.bond_id = ?
  `;
  const [rows] = await connection.execute(query, [bond_id]);
  await connection.end();
  return rows;
}

// 优化：更新或创建可转债策略，支持部分字段更新
async function updateOrCreateBondStrategy(bond_id, updateData = {}) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    // 检查记录是否存在
    const [existingRows] = await connection.execute(
      'SELECT id FROM bond_strategies WHERE bond_id = ?',
      [bond_id],
    );

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

      // 是否加入收藏
      if ('is_favorite' in updateData) {
        updateFields.push('is_favorite = ?');
        updateValues.push(updateData.is_favorite);
      }

      // 添加 profit_strategy 字段的更新
      if ('profit_strategy' in updateData) {
        updateFields.push('profit_strategy = ?');
        updateValues.push(updateData.profit_strategy);
      }

      // 添加 is_blacklisted 字段的更新
      if ('is_blacklisted' in updateData) {
        updateFields.push('is_blacklisted = ?');
        updateValues.push(updateData.is_blacklisted);
      }

      // 添加 sell_price 字段的更新
      if ('sell_price' in updateData) {
        updateFields.push('sell_price = ?');
        updateValues.push(updateData.sell_price);
      }

      if (updateFields.length > 0) {
        const updateSQL = `UPDATE bond_strategies SET ${updateFields.join(', ')} WHERE bond_id = ?`;
        updateValues.push(bond_id);
        await connection.execute(updateSQL, updateValues);
      }
    } else {
      const fields = ['bond_id'];
      const values = [bond_id];
      const placeholders = ['?'];

      // 动态添加存在的字段
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

      // 是否加入收藏
      if ('is_favorite' in updateData) {
        fields.push('is_favorite');
        values.push(updateData.is_favorite);
        placeholders.push('?');
      }

      // 添加 profit_strategy 字段的插入
      if ('profit_strategy' in updateData) {
        fields.push('profit_strategy');
        values.push(updateData.profit_strategy);
        placeholders.push('?');
      }

      // 添加 is_blacklisted 字段的插入
      if ('is_blacklisted' in updateData) {
        fields.push('is_blacklisted');
        values.push(updateData.is_blacklisted);
        placeholders.push('?');
      }

      // 添加 sell_price 字段的插入
      if ('sell_price' in updateData) {
        fields.push('sell_price');
        values.push(updateData.sell_price);
        placeholders.push('?');
      }

      const insertSQL = `INSERT INTO bond_strategies (${fields.join(
        ', ',
      )}) VALUES (${placeholders.join(', ')})`;
      await connection.execute(insertSQL, values);
    }

    return true;
  } catch (error) {
    console.error('Error updating bond strategy:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 更新或创建 bond_cells 记录
async function updateOrCreateBondCell(stock_nm, bond_id, updateData = {}) {
  const connection = await mysql.createConnection(dbConfig);

  try {
    let finalBondId = bond_id;

    // 如果没有传入 bond_id，则通过 stock_nm 查询
    if (!finalBondId && stock_nm) {
      const [bondRows] = await connection.execute(
        'SELECT bond_id FROM summary WHERE stock_nm = ?',
        [stock_nm],
      );

      if (bondRows.length === 0) {
        throw new Error(`未找到股票名称为 ${stock_nm} 的记录`);
      }

      finalBondId = bondRows[0].bond_id;
    }

    if (!finalBondId) {
      throw new Error('必须提供 bond_id 或 stock_nm');
    }

    console.log('使用的 bond_id:', finalBondId);

    // 检查 bond_cells 记录是否存在
    const [existingRows] = await connection.execute(
      'SELECT bond_id FROM bond_cells WHERE bond_id = ?',
      [finalBondId],
    );

    if (existingRows.length > 0) {
      // 构建动态更新SQL
      const updateFields = [];
      const updateValues = [];

      // 资产数据
      if ('asset_data' in updateData) {
        updateFields.push('asset_data = ?');
        updateValues.push(updateData.asset_data);
      }

      // 负债数据
      if ('debt_data' in updateData) {
        updateFields.push('debt_data = ?');
        updateValues.push(updateData.debt_data);
      }

      // 现金流数据
      if ('cash_flow_data' in updateData) {
        updateFields.push('cash_flow_data = ?');
        updateValues.push(updateData.cash_flow_data);
      }

      // 行业信息
      if ('industry' in updateData) {
        updateFields.push('industry = ?');
        updateValues.push(updateData.industry);
      }

      // 历史数据信息
      if ('info' in updateData) {
        updateFields.push('info = ?');
        updateValues.push(updateData.info);
      }

      // 调整条款信息
      if ('adjust_tc' in updateData) {
        updateFields.push('adjust_tc = ?');
        updateValues.push(updateData.adjust_tc);
      }

      // 概念信息
      if ('concept' in updateData) {
        updateFields.push('concept = ?');
        updateValues.push(updateData.concept);
      }

      // 最高历史价格
      if ('max_history_price' in updateData) {
        updateFields.push('max_history_price = ?');
        updateValues.push(updateData.max_history_price);
      }

      // 最低历史价格
      if ('min_history_price' in updateData) {
        updateFields.push('min_history_price = ?');
        updateValues.push(updateData.min_history_price);
      }

      //
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
        await connection.execute(updateSQL, updateValues);
      }
    } else {
      // 构建插入字段和值
      const insertFields = ['bond_id'];
      const insertValues = [finalBondId];
      const placeholders = ['?'];

      // 资产数据
      if ('asset_data' in updateData) {
        insertFields.push('asset_data');
        insertValues.push(updateData.asset_data);
        placeholders.push('?');
      }

      // 负债数据
      if ('debt_data' in updateData) {
        insertFields.push('debt_data');
        insertValues.push(updateData.debt_data);
        placeholders.push('?');
      }

      // 现金流数据
      if ('cash_flow_data' in updateData) {
        insertFields.push('cash_flow_data');
        insertValues.push(updateData.cash_flow_data);
        placeholders.push('?');
      }

      // 行业信息
      if ('industry' in updateData) {
        insertFields.push('industry');
        insertValues.push(updateData.industry);
        placeholders.push('?');
      }

      // 历史价格信息
      if ('info' in updateData) {
        insertFields.push('info');
        insertValues.push(updateData.info);
        placeholders.push('?');
      }

      // 调整条款信息
      if ('adjust_tc' in updateData) {
        insertFields.push('adjust_tc');
        insertValues.push(updateData.adjust_tc);
        placeholders.push('?');
      }

      // 概念信息
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

      // 最高历史价格
      if ('max_history_price' in updateData) {
        insertFields.push('max_history_price');
        insertValues.push(updateData.max_history_price);
        placeholders.push('?');
      }

      // 最低历史价格
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
      await connection.execute(insertSQL, insertValues);
    }

    return { success: true, bond_id: finalBondId };
  } catch (error) {
    console.error('更新或创建 bond_cells 记录失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 优化：API路由 - 更新或创建可转债策略
router.post('/api/bond_strategies', async (ctx) => {
  const { bond_id, ...updateData } = ctx.request.body;
  // 验证必要参数
  if (!bond_id) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: '缺少必要参数 bond_id',
    };
    return;
  }

  try {
    await updateOrCreateBondStrategy(bond_id, updateData);

    ctx.body = {
      success: true,
      message: '可转债策略更新成功',
    };
  } catch (error) {
    console.error('Error in bond strategy API:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新可转债策略失败',
      error: error.message,
    };
  }
});

router.get(API_URLS.BOND_CELL, async (ctx) => {
  const { bond_id } = ctx.query;

  if (!bond_id) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: 'bond_id 参数是必需的',
    };
    return;
  }

  try {
    const data = await fetchBoundCellData(bond_id);
    ctx.body = {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error fetching bond_cell data:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Failed to fetch bond_cell data',
      error: error.message,
    };
  }
});

// API 路由 - 获取 summary 数据
router.get(API_URLS.SUMMARY, async (ctx) => {
  const { limit = 1000, is_blacklisted } = ctx.query;
  try {
    // 构建过滤条件对象
    const filters = {};
    if (is_blacklisted !== undefined) {
      filters.is_blacklisted = is_blacklisted;
    }

    const data = await fetchSummaryData(parseInt(limit), filters);
    // 等权指数
    const bond_index = await fetchMidPrice();

    ctx.body = {
      success: true,
      data,
      bond_index,
    };
  } catch (error) {
    const errorMessage = `获取可转债摘要数据失败: ${API_URLS.SUMMARY} ${error.message}`;
    console.error(errorMessage);
    logToFile(errorMessage);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Failed to fetch data',
      error: error.message,
    };
  }
});

// API 路由 - 批量更新 summary 数据
router.post(API_URLS.SUMMARY_BATCH_UPDATE, async (ctx) => {
  try {
    const data = ctx.request.body;
    if (!Array.isArray(data)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请求数据必须是数组格式',
      };
      return;
    }

    // 使用 insertDataToDB 函数处理数据更新
    await insertDataToDB(data);

    ctx.body = {
      success: true,
      message: '列表数据更新成功',
      count: data.length,
    };
  } catch (error) {
    console.error('更新 summary 数据失败:', error);
    logToFile(`更新 summary 数据失败: ${error.message} ${API_URLS.SUMMARY_BATCH_UPDATE}`);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新数据失败',
      error: error.message,
    };
  }
});

// 添加带有冷却时间的刷新接口
router.get(API_URLS.REFRESH_WITH_COOLDOWN, async (ctx) => {
  const now = Date.now();

  // 检查是否在冷却时间内
  if (now - lastRefreshTime < REFRESH_COOLDOWN) {
    ctx.status = 429; // Too Many Requests
    ctx.body = {
      code: 429,
      message: `请求过于频繁，请在 ${Math.ceil(
        (REFRESH_COOLDOWN - (now - lastRefreshTime)) / 1000,
      )} 秒后重试`,
      success: false,
    };
    return;
  }

  // 检查是否有正在进行的刷新操作
  if (isRefreshing) {
    ctx.status = 409; // Conflict
    ctx.body = {
      code: 409,
      message: '另一个刷新操作正在进行中',
      success: false,
    };
    return;
  }

  try {
    isRefreshing = true;
    console.log('开始刷新数据...');

    // 执行爬虫任务
    await crawler.run(startUrls);

    // 更新最后刷新时间
    lastRefreshTime = Date.now();

    // 获取最新的 summary 数据
    const data = await fetchSummaryData(1000, {}); // 传递空过滤对象

    // 处理数据格式，与 summary 接口保持一致
    for (let item of data) {
      // 处理日期格式
      if (item.maturity_dt) {
        item.maturity_dt = dayjs(item.maturity_dt).format('YYYY-MM-DD');
      }

      // 确保is_analyzed为数字类型，并设置默认值
      item.is_analyzed = item.is_analyzed ? 1 : 0;

      // 确保target_price和level有默认值
      item.target_price = item.target_price || null;
      item.level = item.level || '';
      item.is_state_owned = item.is_state_owned ? 1 : 0;
    }

    ctx.body = {
      code: 200,
      message: '刷新成功',
      success: true,
      data: data,
    };
  } catch (error) {
    console.error('刷新失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: '刷新失败: ' + error.message,
      success: false,
    };
  } finally {
    isRefreshing = false;
  }
});

// API 路由 - 更新中位数价格
router.post(API_URLS.UPDATE_MEDIAN_PRICE, async (ctx) => {
  try {
    const { median_price } = ctx.request.body;
    console.log('获取到集思录的中位数', median_price);

    if (typeof median_price !== 'number') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'median_price 必须是数字类型',
      };
      return;
    }

    await updateMedianPrice(median_price);
    console.log('成功更新中位数', median_price);

    ctx.body = {
      success: true,
      message: '中位数价格更新成功',
    };
  } catch (error) {
    console.error('更新中位数价格失败:', error);
    logToFile(`更新中位数价格失败: ${error.message} ${API_URLS.UPDATE_MEDIAN_PRICE}`);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新中位数价格失败',
      error: error.message,
    };
  }
});

// API 路由 - 更新 bond_cells 数据
router.post(API_URLS.BOND_CELLS_UPDATE, async (ctx) => {
  try {
    const { stock_nm, bond_id, ...updateData } = ctx.request.body;
    if (!stock_nm && !bond_id) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '必须提供 stock_nm (股票名称) 或 bond_id',
      };
      return;
    }

    const result = await updateOrCreateBondCell(stock_nm, bond_id, updateData);

    ctx.body = {
      success: true,
      message: '数据更新成功',
      bond_id: result.bond_id,
    };
  } catch (error) {
    console.error('更新数据失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新数据失败',
      error: error.message,
    };
  }
});

// API 路由 - 获取没有资产数据的可转债列表
router.get(API_URLS.BOND_CELLS_WITHOUT_ASSET_DATA, async (ctx) => {
  try {
    const data = await fetchBondsWithoutAssetData();

    ctx.body = {
      success: true,
      data,
    };
  } catch (error) {
    console.error('获取没有资产数据的可转债列表失败:', error);
    logToFile(
      `获取没有资产数据的可转债列表失败: ${error.message} ${API_URLS.BOND_CELLS_WITHOUT_ASSET_DATA}`,
    );
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取数据失败',
      error: error.message,
    };
  }
});

// API 路由 - 批量更新中位数历史数据
router.post(API_URLS.INDEX_HISTORY_BATCH, async (ctx) => {
  try {
    const dataArray = ctx.request.body;

    if (!Array.isArray(dataArray)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请求数据必须是数组格式',
      };
      return;
    }

    await updateIndexHistory(dataArray);

    ctx.body = {
      success: true,
      message: '数据更新成功',
      count: dataArray.length,
    };
  } catch (error) {
    console.error('批量更新指数历史数据失败:', error);
    logToFile(`批量更新指数历史数据失败: ${error.message} ${API_URLS.INDEX_HISTORY_BATCH}`);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新数据失败',
      error: error.message,
    };
  }
});

// 获取中位数历史数据
router.get(API_URLS.INDEX_HISTORY, async (ctx) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute(
      'SELECT price_dt, mid_price FROM index_history ORDER BY price_dt DESC',
    );

    ctx.body = {
      success: true,
      data: rows,
    };
  } catch (error) {
    console.error('获取指数历史数据失败:', error);
    logToFile(`获取指数历史数据失败: ${error.message} ${API_URLS.INDEX_HISTORY}`);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取数据失败',
      error: error.message,
    };
  } finally {
    await connection.end();
  }
});

// 注册路由
app.use(router.routes()).use(router.allowedMethods());

// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// 导入并初始化调度器
initScheduler();
