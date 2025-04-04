import Koa from 'koa';
import Router from 'koa-router';
import cors from 'koa2-cors';
import mysql from 'mysql2/promise';
import koaBody from 'koa-body';
import cron from 'node-cron';
import { crawler } from './src/main.js'
import { RequestQueue } from 'crawlee';
import { log } from 'crawlee';

// 设置日志级别为DEBUG，帮助调试
log.setLevel(log.LEVELS.DEBUG);

const count = 1;

(async () => {
  try {
    log.info('准备开始爬虫任务');
    const startUrls = ['https://www.jisilu.cn/web/data/cb/list'];

    // 创建新的请求队列
    // const requestQueue = await RequestQueue.open();
    // log.info('请求队列已初始化');
            
    // // 清理请求队列
    // await requestQueue.drop();
    log.info('旧请求队列已清理');

    for (let i = 0; i < count; i++) {
      log.info(`开始第${i + 1}次爬虫任务`);
      
      try {
        // 在每次爬取前等待
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 运行爬虫
        log.info(`运行爬虫，处理URL: ${startUrls[0]}`);
        await crawler.run(startUrls);
        log.info(`第${i + 1}次爬虫任务完成`);
      } catch (runError) {
        log.error(`爬虫运行失败: ${runError.message}`);
        log.debug(`错误堆栈: ${runError.stack}`);
      }
    }
    
    // 最后关闭所有浏览器
    // await crawler.browserPool.closeAllBrowsers();
    
  } catch (error) {
    log.error(`爬虫任务发生错误: ${error.message}`);
    log.debug(`错误堆栈: ${error.stack}`);
    
    // 确保浏览器被关闭
    try {
      await crawler.browserPool.closeAllBrowsers();
      log.info('浏览器已强制关闭');
    } catch (closeError) {
      log.error(`关闭浏览器失败: ${closeError.message}`);
    }
  }
})()