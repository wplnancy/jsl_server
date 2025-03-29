import Koa from 'koa';
import Router from 'koa-router';
import cors from 'koa2-cors';
import mysql from 'mysql2/promise';
import koaBody from 'koa-body';
import cron from 'node-cron';
import { crawler } from './src/main.js'
import dayjs from 'dayjs';

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
  const [rows] = await connection.execute('SELECT * FROM summary LIMIT ?', [limit]);
  await connection.end();
  return rows;
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


// 新增：更新或创建可转债策略
async function updateOrCreateBondStrategy(bond_id, target_price, level, is_analyzed) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 检查记录是否存在
    const [existingRows] = await connection.execute(
      'SELECT id FROM bond_strategies WHERE bond_id = ?', 
      [bond_id]
    );
    
    if (existingRows.length > 0) {
      // 更新现有记录
      await connection.execute(
        'UPDATE bond_strategies SET target_price = ?, level = ?, is_analyzed = ? WHERE bond_id = ?',
        [target_price, level, is_analyzed, bond_id]
      );
    } else {
      // 创建新记录
      await connection.execute(
        'INSERT INTO bond_strategies (bond_id, target_price, level, is_analyzed) VALUES (?, ?, ?, ?)',
        [bond_id, target_price, level, is_analyzed]
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error updating bond strategy:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 新增：API路由 - 更新或创建可转债策略
router.post('/api/bond_strategies', async (ctx) => {
  const { bond_id, target_price, level, is_analyzed } = ctx.request.body;
  
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
    await updateOrCreateBondStrategy(
      bond_id, 
      target_price || null, 
      level || null, 
      is_analyzed !== undefined ? is_analyzed : 0
    );
    
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
  try {
    const data = await fetchBoundCellData(bond_id);
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

// API 路由 - 获取 summary 数据
router.get('/api/summary', async (ctx) => {
  const { limit = 1000 } = ctx.query; // 支持通过查询参数限制返回条目
  try {
    const data = await fetchSummaryData(parseInt(limit));
    for (let item of data) {
      if (item.maturity_dt) {
        item.maturity_dt = dayjs(item.maturity_dt).format('YYYY-MM-DD')
      }
    }

    ctx.body = {
      success: true,
      data,
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

// 注册路由
app.use(router.routes()).use(router.allowedMethods());

// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


// 定时任务，每天在市场开市时间启动任务
const runCrawlerTask = async ({ ignoreMarketOpen = false } = {}) => {
  console.error(`执行第----    *** ${count + 1} ***   ----次`);
  console.error('当前时间是否开市', isMarketOpen())
  if (isMarketOpen() || ignoreMarketOpen) {
    console.log('开始爬虫任务');
    // 执行爬虫任务
    await crawler.run(startUrls);

    // 显式关闭浏览器 如果关闭浏览器，会导致用户 cookie
    await crawler.browserPool.closeAllBrowsers();

    console.log('Crawler task completed and browsers closed.');
  } else {
    console.log('Market is closed. Skipping crawler task...');
  }
};

// 启动时立即执行一次
const count = 0; // 记录第几次执行
runCrawlerTask();

// 开市时期，每间隔 1h 获取一次最新数据
cron.schedule(`0 * * * *`, async () => {
  runCrawlerTask();
});

// ---- 确保盘后更新 -----
// 每天 13:16 执行任务，只有在是交易日的情况下
cron.schedule(`10 13 * * 1-5`, async () => {  // 每天 3:10 PM 执行（周一至周五）
  console.error('启动 13:10 定时更新器')
  runCrawlerTask({ ignoreMarketOpen: true });
});

// 每天的 3 点 16 分执行一次任务，只有在是交易日的情况下
cron.schedule(`10 15 * * 1-5`, async () => {  // 每天 3:10 PM 执行（周一至周五）
  console.error('启动 15:10 定时更新器')
  runCrawlerTask({ ignoreMarketOpen: true });
});

console.log('Scheduler is running...');