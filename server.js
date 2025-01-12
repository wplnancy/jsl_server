import Koa from 'koa';
import Router from 'koa-router';
import cors from 'koa2-cors';
import mysql from 'mysql2/promise';
import  koaBody from 'koa-body';

const app = new Koa();
const router = new Router();

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
