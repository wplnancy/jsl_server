import Koa from 'koa';
import Router from 'koa-router';
import cors from 'koa2-cors';
import mysql from 'mysql2/promise';
import koaBody from 'koa-body';
import cron from 'node-cron';
import { crawler } from './src/main.js'
import dayjs from 'dayjs';
import { PlaywrightCrawler, RequestQueue } from 'crawlee';
import { insertDataToDB } from './src/utils.js'

import {isMarketOpen} from './src/date.js'

const app = new Koa();
const router = new Router();

const startUrls = ['https://www.jisilu.cn/web/data/cb/list'];

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '12345678',
  database: 'kzz_datax',
};

// 使用 CORS 中间件，允许跨域
app.use(
  cors({
    origin: '*', // 允许所有来源访问
    allowMethods: ['GET', 'POST'], // 允许的请求方法
  })
);

// 解析 JSON 请求体
app.use(koaBody.default());

// 数据库查询函数
async function fetchSummaryData(limit = 100) {
  const connection = await mysql.createConnection(dbConfig);
  const query = `
    SELECT 
      s.*,
      bs.target_price,
      bs.target_heavy_price,
      bs.is_state_owned,
      bs.profit_strategy,
      bs.finance_data,
      bs.level,
      IFNULL(bs.is_analyzed, 0) as is_analyzed,
      IFNULL(bs.is_favorite, 0) as is_favorite
    FROM summary s
    LEFT JOIN bond_strategies bs ON s.bond_id = bs.bond_id
    LIMIT ?
  `;
  
  try {
    const [rows] = await connection.execute(query, [limit]);
    return rows;
  } catch (error) {
    console.error('Error fetching summary data:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 新增：获取 bound_index 表的数据
async function fetchBoundIndexData(limit = 100) {
  const connection = await mysql.createConnection(dbConfig);
  const [rows] = await connection.execute('SELECT * FROM bound_index LIMIT ?', [limit]);
  await connection.end();
  return rows;
}

async function fetchBoundCellData(bond_id) {
  const connection = await mysql.createConnection(dbConfig);
  const [rows] = await connection.execute('SELECT * FROM bond_cells where bond_id = ?', [bond_id]);
  await connection.end();
  return rows;
}


// 新增：API 路由 - 获取 bound_index 数据
router.get('/api/bound_index', async (ctx) => {
  const { limit = 1000 } = ctx.query;
  try {
    const data = await fetchBoundIndexData(parseInt(limit));
    ctx.body = {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error fetching bound_index data:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Failed to fetch bound_index data',
      error: error.message,
    };
  }
});


// 优化：更新或创建可转债策略，支持部分字段更新
async function updateOrCreateBondStrategy(bond_id, updateData = {}) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 检查记录是否存在
    const [existingRows] = await connection.execute(
      'SELECT id FROM bond_strategies WHERE bond_id = ?', 
      [bond_id]
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
        fields.push('finance_data = ?');
        values.push(updateData.finance_data);
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

      const insertSQL = `INSERT INTO bond_strategies (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
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

// 优化：API路由 - 更新或创建可转债策略
router.post('/api/bond_strategies', async (ctx) => {
  const { bond_id, ...updateData } = ctx.request.body;
  
  // 验证必要参数
  if (!bond_id) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: '缺少必要参数 bond_id'
    };
    return;
  }
  
  try {
    await updateOrCreateBondStrategy(bond_id, updateData);
    
    ctx.body = {
      success: true,
      message: '可转债策略更新成功'
    };
  } catch (error) {
    console.error('Error in bond strategy API:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新可转债策略失败',
      error: error.message
    };
  }
});

router.get('/api/bond_cell', async (ctx) => {
  const { bond_id } = ctx.query;
  
  if (!bond_id) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: 'bond_id 参数是必需的'
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
router.get('/api/summary', async (ctx) => {
  const { limit = 1000 } = ctx.query;
  try {
    const data = await fetchSummaryData(parseInt(limit));
    // 等权指数
    const bond_index = await fetchBoundIndexData(parseInt(limit));
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
    }

    ctx.body = {
      success: true,
      data,
      bond_index
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Failed to fetch data',
      error: error.message,
    };
  }
});

// API 路由 - 批量更新 summary 数据
router.post('/api/summary/batch-update', async (ctx) => {
  // console.error('收到请求更新数据',  ctx.request.body?.[0]?.bond_id, ctx.request.body?.[0]?.price);
  try {
    const data = ctx.request.body;
    
    if (!Array.isArray(data)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请求数据必须是数组格式'
      };
      return;
    }

    // 使用 insertDataToDB 函数处理数据更新
    await insertDataToDB(data);

    ctx.body = {
      success: true,
      message: '数据更新成功',
      count: data.length
    };
  } catch (error) {
    console.error('更新 summary 数据失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新数据失败',
      error: error.message
    };
  }
});

// 防止重复请求的简单实现
let isRefreshing = false;
const REFRESH_COOLDOWN = 10 *  1000; // 10s 冷却时间
let lastRefreshTime = 0;

// 添加带有冷却时间的刷新接口
router.get('/api/refresh-with-cooldown', async (ctx) => {
    const now = Date.now();
    
    // 检查是否在冷却时间内
    if (now - lastRefreshTime < REFRESH_COOLDOWN) {
        ctx.status = 429; // Too Many Requests
        ctx.body = {
            code: 429,
            message: `请求过于频繁，请在 ${Math.ceil((REFRESH_COOLDOWN - (now - lastRefreshTime)) / 1000)} 秒后重试`,
            success: false
        };
        return;
    }

    // 检查是否有正在进行的刷新操作
    if (isRefreshing) {
        ctx.status = 409; // Conflict
        ctx.body = {
            code: 409,
            message: '另一个刷新操作正在进行中',
            success: false
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
        const data = await fetchSummaryData(1000); // 使用默认限制 1000 条
        
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
            data: data
        };
    } catch (error) {
        console.error('刷新失败:', error);
        ctx.status = 500;
        ctx.body = {
            code: 500,
            message: '刷新失败: ' + error.message,
            success: false
        };
    } finally {
        isRefreshing = false;
    }
});

// 更新 bound_index 表中的 median_price 字段
async function updateBoundIndexMedianPrice(medianPrice) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const query = `
      UPDATE bound_index 
      SET median_price = ? 
      WHERE id = 1
    `;
    
    await connection.execute(query, [medianPrice]);
    return true;
  } catch (error) {
    console.error('Error updating bound_index median_price:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// API 路由 - 更新 bound_index 的 median_price
router.post('/api/bound_index/median_price', async (ctx) => {
  try {
    const { median_price } = ctx.request.body;
    console.error('获取到中位数', median_price)
    
    if (typeof median_price !== 'number') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'median_price 必须是数字类型'
      };
      return;
    }

    await updateBoundIndexMedianPrice(median_price);
    
    ctx.body = {
      success: true,
      message: '中位数价格更新成功'
    };
  } catch (error) {
    console.error('更新中位数价格失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新中位数价格失败',
      error: error.message
    };
  }
});

// 更新或创建 bond_cells 记录
async function updateOrCreateBondCell(stock_nm, updateData = {}) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 先从 summary 表中获取 bond_id，使用 stock_nm 字段查询
    const [bondRows] = await connection.execute(
      'SELECT bond_id FROM summary WHERE stock_nm = ?',
      [stock_nm]
    );

    if (bondRows.length === 0) {
      throw new Error(`未找到股票名称为 ${stock_nm} 的记录`);
    }

    const bond_id = bondRows[0].bond_id;
    console.log('找到对应的 bond_id:', bond_id);

    // 检查 bond_cells 记录是否存在
    const [existingRows] = await connection.execute(
      'SELECT bond_id FROM bond_cells WHERE bond_id = ?',
      [bond_id]
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

      if (updateFields.length > 0) {
        const updateSQL = `UPDATE bond_cells SET ${updateFields.join(', ')} WHERE bond_id = ?`;
        updateValues.push(bond_id);
        await connection.execute(updateSQL, updateValues);
      }
    } else {
      // 构建插入字段和值
      const insertFields = ['bond_id'];
      const insertValues = [bond_id];
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

      // 概念信息
      if ('concept' in updateData) {
        insertFields.push('concept');
        insertValues.push(updateData.concept);
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

      const insertSQL = `INSERT INTO bond_cells (${insertFields.join(', ')}) VALUES (${placeholders.join(', ')})`;
      console.log('执行插入 SQL:', insertSQL);
      console.log('插入值:', insertValues);
      await connection.execute(insertSQL, insertValues);
    }
    
    return { success: true, bond_id };
  } catch (error) {
    console.error('更新或创建 bond_cells 记录失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// API 路由 - 更新 bond_cells 数据
router.post('/api/bond_cells/update', async (ctx) => {
  try {
    const { stock_nm, ...updateData } = ctx.request.body;
    console.log('获取到的数据:', {
      stock_nm,
      updateData
    });
    
    if (!stock_nm) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'stock_nm (股票名称) 是必需的'
      };
      return;
    }

    const result = await updateOrCreateBondCell(stock_nm, updateData);
    
    ctx.body = {
      success: true,
      message: '数据更新成功',
      bond_id: result.bond_id
    };
  } catch (error) {
    console.error('更新数据失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新数据失败',
      error: error.message
    };
  }
});

// 查询没有资产数据的可转债列表
async function fetchBondsWithoutAssetData() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const query = `
      SELECT bond_nm, stock_nm, price
      FROM summary 
      WHERE bond_id NOT IN (
        SELECT bond_id 
        FROM bond_cells 
        WHERE asset_data IS NOT NULL
        AND cash_flow_data is not NULL AND debt_data is not NULL
      ) and price >= 90 and price <= 140 order by price asc
    `;
    
    const [rows] = await connection.execute(query);
    return rows;
  } catch (error) {
    console.error('查询没有资产数据的可转债失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// API 路由 - 获取没有资产数据的可转债列表
router.get('/api/bond_cells/without_asset_data', async (ctx) => {
  try {
    const data = await fetchBondsWithoutAssetData();
    
    ctx.body = {
      success: true,
      data
    };
  } catch (error) {
    console.error('获取没有资产数据的可转债列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取数据失败',
      error: error.message
    };
  }
});

// 注册路由
app.use(router.routes()).use(router.allowedMethods());

// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


// 定时任务，每天在市场开市时间启动任务
const runCrawlerTask = async ({ ignoreMarketOpen = false } = {}) => {
    if (isMarketOpen() || ignoreMarketOpen) {
        console.log('开始爬虫任务');
        try {
            // 创建新的请求队列
            const requestQueue = await RequestQueue.open();
            
            // 清理请求队列
            await requestQueue.drop();
            
            // 运行爬虫
            await crawler.run(startUrls);
        } catch (error) {
            console.error('爬虫任务执行出错:', error);
        } finally {
            try {
                if (crawler.browserPool) {
                    await crawler.browserPool.closeAllBrowsers();
                }
            } catch (error) {
                console.error('关闭浏览器出错:', error);
            }
        }
    }
};

// 启动时立即执行一次
const count = 0; // 记录第几次执行
// runCrawlerTask();

// 开市时期，每间隔 1h 获取一次最新数据
// cron.schedule(`0 * * * *`, async () => {
//   runCrawlerTask();
// });

// ---- 确保盘后更新 -----
// 每天 13:16 执行任务，只有在是交易日的情况下
// cron.schedule(`10 13 * * 1-5`, async () => {  // 每天 3:10 PM 执行（周一至周五）
//   console.error('启动 13:10 定时更新器')
//   runCrawlerTask({ ignoreMarketOpen: true });
// });

// 每天的 3 点 16 分执行一次任务，只有在是交易日的情况下
// cron.schedule(`10 15 * * 1-5`, async () => {  // 每天 3:10 PM 执行（周一至周五）
//   console.error('启动 15:10 定时更新器')
//   runCrawlerTask({ ignoreMarketOpen: true });
// });

console.log('Scheduler is running...');