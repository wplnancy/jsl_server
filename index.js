import Koa from 'koa';
import Router from 'koa-router';
import cors from 'koa2-cors';
import mysql from 'mysql2/promise';
import koaBody from 'koa-body';
import cron from 'node-cron';
import { crawler } from './src/main.js'

(async () => {
  const startUrls = ['https://www.jisilu.cn/web/data/cb/list'];
  
  // 第一次爬取
  console.log('开始第一次爬虫任务');
  await crawler.run(startUrls);
  
  // 添加适当的延迟
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('开始第二次爬虫任务');
  // 第二次爬取时复用已有的浏览器实例
  await crawler.run(startUrls);
  
  // 最后才关闭浏览器
  await crawler.browserPool.closeAllBrowsers();
  
  console.log('Crawler task completed and browsers closed.');
})()