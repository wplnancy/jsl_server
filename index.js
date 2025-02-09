import Koa from 'koa';
import Router from 'koa-router';
import cors from 'koa2-cors';
import mysql from 'mysql2/promise';
import koaBody from 'koa-body';
import cron from 'node-cron';
import { crawler } from './src/main.js'

(async () => {
  const startUrls = ['https://www.jisilu.cn/web/data/cb/list'];

  console.log('开始爬虫任务');
  // 执行爬虫任务
  await crawler.run(startUrls);

  // console.error('第二次爬');
  // await crawler.run(startUrls);
  await crawler.browserPool.closeAllBrowsers();

  console.log('Crawler task completed and browsers closed.');
})()