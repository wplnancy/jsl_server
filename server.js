import Koa from 'koa';
import Router from 'koa-router';
import cors from 'koa2-cors';
import { pool } from './src/utils/pool.js';
import koaBody from 'koa-body';
// import dayjs from 'dayjs';
import { insertDataToDB } from './src/utils.js';
import { API_URLS } from './src/constants/api-urls.js';
// import { initScheduler } from './src/scheduler.js';
import { fetchSummaryData } from './src/services/fetch-summary.service.js';
import { fetchMailData } from './src/services/send-mail.service.js';
import { fetchMidPrice } from './src/services/fetch-mid-price.service.js';
import { updateMedianPrice } from './src/services/update-mid-price.service.js';
import { updateIndexHistory } from './src/services/index-history.service.js';
import { fetchBondsWithoutAssetData } from './src/services/fetchBonds-without-asset-data.service.js';
import { logToFile } from './src/utils/logger.js';
import { fetchBoundCellData } from './src/services/fetch-bound-cell.service.js';
import { updateOrCreateBondCell } from './src/services/update-or-create-bond-cell.service.js';
import { updateOrCreateBondStrategy } from './src/services/update-or-create-bond-strategy.service.js';
import sendNotifyFn from './src/notify/sendNotify.js';
import isTradingTime from './src/utils/isTradingTime.js';
const app = new Koa();
const router = new Router();

// const startUrls = ['https://www.jisilu.cn/web/data/cb/list'];

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
// let isRefreshing = false;
// const REFRESH_COOLDOWN = 10 * 1000; // 10s 冷却时间
// let lastRefreshTime = 0;

// 优化：API路由 - 更新或创建可转债策略
router.post(API_URLS.UPDATE_BOND_STRATEGIES, async (ctx) => {
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
      message: `更新${bond_id}转债详情策略成功`,
    };
  } catch (error) {
    console.error('Error in bond strategy API:', error);
    logToFile(`更新${bond_id}转债策略失败 ${error.message}`);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新${bond_id}转债策略失败',
      error: error.message,
    };
  }
});

router.get(API_URLS.BOND_CELL, async (ctx) => {
  const { bond_id } = ctx.query;

  if (!bond_id) {
    logToFile(`${API_URLS.BOND_CELL} 没有传递过来bond_id ${bond_id}`);
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
    logToFile(`${API_URLS.BOND_CELL}接口错误 ${error.message}`);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Failed to fetch bond_cell data',
      error: error.message,
    };
  }
});

// API 路由 - 更新 bond_cells 数据 浏览器插件调用的
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
    console.log('updateData', Object.keys(updateData));
    const result = await updateOrCreateBondCell(stock_nm, bond_id, updateData);

    ctx.body = {
      success: true,
      message: `${bond_id}详情数据更新成功`,
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
    console.log('summary批量更新字段数量', Object.keys(data[0])?.length);
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
  let connection;
  try {
    connection = await pool.getConnection();
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
    await connection.release();
  }
});

// 注册路由
app.use(router.routes()).use(router.allowedMethods());

let lastBondList = null; // 存储上一次的查询结果
let timer = null; // 存储定时器引用
let currentInterval = 40 * 1000; // 初始间隔30秒
const MAX_INTERVAL = 5 * 60 * 1000; // 最大间隔60秒
const MIN_INTERVAL = 40 * 1000; // 最小间隔30秒

const sendNotify = async () => {
  const data = await fetchMailData();
  const currentBondList = data?.map((item) => item.bond_nm) || [];

  // 如果结果相同，增加查询间隔
  if (lastBondList === null) {
    // 第一次执行，直接发送通知
    console.log('首次执行，发送通知');
  } else if (JSON.stringify(currentBondList) === JSON.stringify(lastBondList)) {
    // 如果结果相同，增加间隔时间
    currentInterval = Math.min(currentInterval + 20 * 1000, MAX_INTERVAL);
    console.log(`转债列表未变化，增加查询间隔至${currentInterval / 1000}秒`);
    // 重新设置定时器
    startTradingTimer();
  } else {
    // 如果结果不同，重置为最小间隔
    currentInterval = MIN_INTERVAL;
    console.log('转债列表发生变化，重置查询间隔为30秒');
  }

  // 等权指数
  const [{ median_price }] = await fetchMidPrice();
  sendNotifyFn(data, median_price);
  lastBondList = currentBondList;
};

// 启动定时器
const startTradingTimer = () => {
  // 清理已存在的定时器
  if (timer) {
    clearInterval(timer);
  }

  // 创建新的定时器
  timer = setInterval(async () => {
    if (isTradingTime()) {
      try {
        await sendNotify();
      } catch (error) {
        console.error('发送通知失败:', error);
        logToFile(`发送通知失败: ${error.message}`);

        // 如果是数据库连接错误，尝试重新连接
        if (error.code === 'ECONNRESET' || error.code === 'ESOCKET') {
          console.log('数据库连接断开，尝试重新连接...');
          // 等待5秒后重新启动定时器
          setTimeout(() => {
            startTradingTimer();
          }, 5000);
        }
      }
    }
  }, currentInterval);

  return timer;
};

// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // 启动交易时间定时器
  startTradingTimer();
});

// 在程序退出时清理定时器
process.on('SIGINT', () => {
  if (timer) {
    clearInterval(timer);
  }
  process.exit();
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  logToFile(`未捕获的异常: ${error.message}`);

  // 如果是数据库连接错误，尝试重新连接
  if (error.code === 'ECONNRESET' || error.code === 'ESOCKET') {
    console.log('数据库连接断开，尝试重新连接...');
    // 等待5秒后重新启动定时器
    setTimeout(() => {
      startTradingTimer();
    }, 5000);
  }
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (error) => {
  console.error('未处理的Promise拒绝:', error);
  logToFile(`未处理的Promise拒绝: ${error.message}`);

  // 如果是数据库连接错误，尝试重新连接
  if (error.code === 'ECONNRESET' || error.code === 'ESOCKET') {
    console.log('数据库连接断开，尝试重新连接...');
    // 等待5秒后重新启动定时器
    setTimeout(() => {
      startTradingTimer();
    }, 5000);
  }
});

// 导入并初始化调度器  不再需要调度器了,通过浏览器插件实现了
// initScheduler();
