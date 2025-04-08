import { PuppeteerCrawler, log } from 'crawlee';
import fs from 'fs/promises';

// 添加延时函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const crawler = new PuppeteerCrawler({
    async requestHandler({ page, request, log }) {
        log.info(`正在处理页面1 ${request.url}`);

        // 设置更长的超时时间
        // await page.setDefaultTimeout(60000);
        // await page.setDefaultNavigationTimeout(60000);

        // 设置更真实的 User-Agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // 等待页面加载
        console.log(222);
        // await delay(5000);
        // await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.waitForNavigation({ waitUntil: 'networkidle0' }); // 等待页面跳转完成
        console.error('等待页面加载完成')

        // 等待页面内容加载
        try {
            // 首先等待页面主体加载
            await page.waitForSelector('.back-old-btn.right_nav_btn_base', { timeout: 30000 });
            log.info('找到返回旧版按钮');

            // 点击返回旧版按钮
            await Promise.all([
                // 等待页面跳转完成
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                // 点击按钮
                page.click('.back-old-btn.right_nav_btn_base')
            ]);
            await page.waitForNavigation({ waitUntil: 'networkidle0' }); // 等待页面跳转完成
            log.info('已点击返回旧版按钮，等待新页面加载');

            // 等待新页面的表格加载
            await page.waitForSelector('.upright_table', { timeout: 30000 });
            log.info('新页面表格已加载');

            // 使用自定义的延时函数
            log.info('等待 5 秒完成');

            // 获取渲染后的 HTML
            const renderedHtml = await page.content();
            
            // 保存完整的 HTML 到文件
            await fs.writeFile('iwencai_full.html', renderedHtml);
            log.info('已保存完整 HTML');

            // 获取表格数据
            const tableData = await page.evaluate(() => {
                const tables = document.querySelectorAll('.upright_table');
                return Array.from(tables).map(table => table.outerHTML).join('\\n');
            });

            if (tableData) {
                await fs.writeFile('iwencai_table.html', tableData);
                log.info('表格数据已保存到 iwencai_table.html');
            }

            // 提取表格数据为结构化格式
            const data = await page.evaluate(() => {
                const tables = document.querySelectorAll('.upright_table');
                return Array.from(tables).map(table => {
                    const rows = Array.from(table.querySelectorAll('tr'));
                    return rows.map(row => {
                        const cells = Array.from(row.querySelectorAll('td, th'));
                        return cells.map(cell => cell.textContent.trim());
                    });
                });
            });

            // 保存结构化数据到 JSON 文件
            // await fs.writeFile('iwencai_data.json', JSON.stringify(data, null, 2));
            log.info('数据已保存到 iwencai_data.json');

        } catch (error) {
            log.error('处理页面时出错:', error);
            // 保存错误页面的截图以便调试
            await page.screenshot({ path: 'error.png', fullPage: true });
            throw error;
        }
    },
    
    // 设置浏览器选项
    browserPoolOptions: {
        useFingerprints: true,
        fingerprintOptions: {
            screen: { width: 1920, height: 1080 },
        },
    },
    
    // 增加超时时间
    requestHandlerTimeoutSecs: 120,
    
    // 添加更多浏览器设置
    launchContext: {
        launchOptions: {
            headless: false,  // 设置为 false 以便查看浏览器行为
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
            ],
        },
    },
});

// 运行爬虫
try {
    await crawler.run([
        'https://www.iwencai.com/stockpick/search?rsh=3&typed=0&preParams=&ts=1&f=1&qs=result_original&selfsectsn=&querytype=stock&searchfilter=&tid=stockpick&w=%E7%B2%BE%E8%BE%BE%E8%82%A1%E4%BB%BD2021%E5%B9%B4%E6%8A%A5%E5%BD%92%E6%AF%8D%E5%87%80%E5%88%A9%E6%B6%A6%2C2022%E5%B9%B4%E6%8A%A5%E5%BD%92%E6%AF%8D%E5%87%80%E5%88%A9%E6%B6%A6%2C2023%E5%B9%B4%E6%8A%A5%E5%BD%92%E6%AF%8D%E5%87%80%E5%88%A9%E6%B6%A6%2C2024%E5%B9%B4%E6%8A%A5%E5%BD%92%E6%AF%8D%E5%87%80%E5%88%A9%E6%B6%A6%EF%BC%8C2024%E5%B9%B4%E4%B8%89%E5%AD%A3%E6%8A%A5%E6%8A%A5%E5%BD%92%E6%AF%8D%E5%87%80%E5%88%A9%E6%B6%A6%2C2021%E5%B9%B4%E6%8A%A5%E7%BB%8F%E8%90%A5%E7%8E%B0%E9%87%91%E6%B5%81%2C2022%E5%B9%B4%E6%8A%A5%E7%BB%8F%E8%90%A5%E7%8E%B0%E9%87%91%E6%B5%81%2C2023%E5%B9%B4%E6%8A%A5%E7%BB%8F%E8%90%A5%E7%8E%B0%E9%87%91%E6%B5%81%2C2024%E5%B9%B4%E6%8A%A5%E7%BB%8F%E8%90%A5%E7%8E%B0%E9%87%91%E6%B5%81%EF%BC%8C2024%E5%B9%B4%E4%B8%89%E5%AD%A3%E6%8A%A5%E6%8A%A5%E7%BB%8F%E8%90%A5%E7%8E%B0%E9%87%91%E6%B5%81'
    ]);
    log.info('爬虫任务完成');
} catch (error) {
    log.error('爬虫运行出错:', error);
} 