import Koa from 'koa';
import Router from 'koa-router';
import cors from 'koa2-cors';
import mysql from 'mysql2/promise';
import koaBody from 'koa-body';
import cron from 'node-cron';
import { crawler } from './src/main.js'
import { RequestQueue } from 'crawlee';

const count = 1;

(async () => {
  const startUrls = ['https://www.jisilu.cn/web/data/cb/list'];

  for (let i = 0; i < count; i++) {
    console.log(`开始第${i + 1}次爬虫任务`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    // 创建新的请求队列
    const requestQueue = await RequestQueue.open();
            
    // 清理请求队列
    await requestQueue.drop();
    await crawler.run(startUrls);
  }
  // 最后才关闭浏览器
  await crawler.browserPool.closeAllBrowsers();
  
  console.log('Crawler task completed and browsers closed.');
})()