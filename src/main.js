// For more information, see https://crawlee.dev/
import { PuppeteerCrawler, log, Dataset } from 'crawlee';
import { BrowserName, DeviceCategory, OperatingSystemsName } from '@crawlee/browser-pool';

import { router } from './routes.js';

// 设置日志等级
log.setLevel(log.LEVELS.DEBUG);

export const crawler = new PuppeteerCrawler({
    // 设置浏览器为非无头模式
    launchContext: {
        launchOptions: {
            devtools: true,
            headless: false, // 让浏览器以有头模式运行
        },
    },
    // async requestHandler({ page, request }) {
    //     log.info(`Opening page: ${request.url}`);

    //     // 监听 API 响应
    //     page.on('response', async (response) => {
    //         const url = response.url();
    //         Dataset.pushData({ url })

    //         //先判断用户信息

    //         if (url.includes('https://www.jisilu.cn/webapi/account/userinfo/')) {
    //             // 判断用户信息
    //             log.info(`Intercepted API response from: ${url}`);
    //             const userInfoData = await response.json(); // 获取 API 响应 JSON 数据
    //             if (userInfoData.data === null) {
    //                 // 未登录
    //             }
    //         }


    //         // 检查是否是目标 API 请求
    //         if (url.includes('https://www.jisilu.cn/webapi/cb/list/')) {
    //             log.info(`Intercepted API response from: ${url}`);

    //             try {
    //                 const jsonData = await response.json(); // 获取 API 响应 JSON 数据
    //                 log.info('API Response Data:', jsonData);
    //             } catch (error) {
    //                 log.error('Failed to parse API response:', error);
    //             }
    //         }
    //     });

    //     // 打开目标页面
    //     // await page.goto(request.url, { waitUntil: 'networkidle0' });

    //     // log.info('Page loaded successfully.');
    // },
    failedRequestHandler({ request }) {
        log.error(`Request ${request.url} failed.`);
    },
    maxConcurrency: 5, // 最大并发数


    browserPoolOptions: {
        useFingerprints: true, // this is the default
        fingerprintOptions: {
            fingerprintGeneratorOptions: {
                browsers: [{
                    name: BrowserName.edge,
                    minVersion: 96,
                }],
                devices: [
                    DeviceCategory.desktop,
                ],
                operatingSystems: [
                    OperatingSystemsName.windows,
                ],
            },
        },
    },
    // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
    requestHandler: router,
    // Comment this option to scrape the full website.
    // 不限制爬取的数量
    maxRequestsPerCrawl: Infinity,
});