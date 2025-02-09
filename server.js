import Koa from 'koa';
import Router from 'koa-router';
import cors from 'koa2-cors';
import mysql from 'mysql2/promise';
import koaBody from 'koa-body';
import cron from 'node-cron';
import { crawler } from './src/main.js'

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
const runCrawlerTask = async () => {
  return;
  console.error(`执行第----    *** ${count + 1} ***   ----次`);
  console.error('当前时间是否开市', isMarketOpen())
  if (isMarketOpen()) {
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
  runCrawlerTask();
});

// 每天的 3 点 16 分执行一次任务，只有在是交易日的情况下
cron.schedule(`10 15 * * 1-5`, async () => {  // 每天 3:10 PM 执行（周一至周五）
  console.error('启动 15:10 定时更新器')
  runCrawlerTask();
});

console.log('Scheduler is running...');