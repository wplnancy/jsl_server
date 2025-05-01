import cron from 'node-cron';
import { RequestQueue } from 'crawlee';
import { crawler } from './main.js';
import { isMarketOpen } from './date.js';
import { logToFile } from './utils/logger.js';

// 爬虫起始URL
const startUrls = ['https://www.jisilu.cn/web/data/cb/list'];

// 爬虫任务执行函数
const runCrawlerTask = async ({ ignoreMarketOpen = false } = {}) => {
  if (isMarketOpen() || ignoreMarketOpen) {
    const startTime = new Date();
    logToFile('开始爬虫任务');
    console.log('开始爬虫任务');

    try {
      // 创建新的请求队列
      const requestQueue = await RequestQueue.open();
      logToFile('创建请求队列成功');

      // 清理请求队列
      await requestQueue.drop();
      logToFile('清理请求队列成功');

      // 运行爬虫
      await crawler.run(startUrls);
      logToFile('爬虫任务执行完成');

      const endTime = new Date();
      const duration = (endTime - startTime) / 1000; // 转换为秒
      logToFile(`任务执行完成，耗时: ${duration}秒`);
    } catch (error) {
      const errorMessage = `爬虫任务执行出错: ${error.message}`;
      logToFile(errorMessage);
      console.error(errorMessage);
    } finally {
      try {
        if (crawler.browserPool) {
          await crawler.browserPool.closeAllBrowsers();
          logToFile('浏览器池关闭成功');
        }
      } catch (error) {
        const errorMessage = `关闭浏览器出错: ${error.message}`;
        logToFile(errorMessage);
        console.error(errorMessage);
      }
    }
  } else {
    logToFile('当前不是开市时间，跳过执行');
  }
};

// 初始化定时任务
const initScheduler = () => {
  // 每天晚上 9:30 执行一次任务
  cron.schedule(`30 21 * * *`, async () => {
    logToFile('启动晚上 9:30 定时更新器');
    await runCrawlerTask({ ignoreMarketOpen: true });
  });

  logToFile('定时任务调度器初始化完成');
  console.log('Scheduler is running...');
};

export { initScheduler, runCrawlerTask };
