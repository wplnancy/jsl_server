import { createPuppeteerRouter, log, KeyValueStore } from 'crawlee';
import fs from 'fs/promises';
export const router = createPuppeteerRouter();

const TIMEOUT = 60000;  // 超时时间
// 未登录展示的描述信息
const VISIT_TEXT = '游客仅显示前 30 条转债记录，请登录查看完整列表数据';
const COOKIES_KEY = 'cookies';  // 存储 cookies 的键

router.addDefaultHandler(async ({ page, browserController }) => {
    console.info(`enqueueing new URLs`);
    // 加载 cookies
    const store = await KeyValueStore.open();
    const savedCookies: any[] = await store.getValue(COOKIES_KEY);

    if (savedCookies) {
        console.info('Loading saved cookies...');
        await page.setCookie(...savedCookies);  // 设置 cookies
    }

    // 监听新页面打开事件
    page.on('response', async (response) => {
        const url = response.url();
        console.error("url", url)
        const request = response.request();
        const initiatorUrl = request.headers().referer || request.frame()?.url();

      
        //先判断用户信息

        // if (url.includes('https://www.jisilu.cn/webapi/account/userinfo/')) {
        //     // 判断用户信息
        //     log.info(`Intercepted API response from: ${url}`);
        //     const userInfoData = await response.json(); // 获取 API 响应 JSON 数据
        //     if (userInfoData.data === null) {
        //         // 未登录
        //     }
        // }


        // 检查是否是目标 API 请求
        if (url.includes('https://www.jisilu.cn/webapi/cb/list/')) {
            log.info(`Intercepted API response from: ${url}`);
            console.info(`Response received from API: ${url}`);
            console.info(`Request initiated from: ${initiatorUrl}`);

            try {
                const jsonData = await response.json(); // 获取 API 响应 JSON 数据
                if (jsonData.data?.length > 50) {
                    // log.info('API Response Data:', jsonData);
                    const store = await KeyValueStore.open();
                    await store.setValue('api-response', jsonData);
                    const filePath = './api-response.json';
                    console.error('写入成功', jsonData?.data?.length)
                    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2));
                    log.info(`Saved API response to file: ${filePath}`);
                }
                
            } catch (error) {
                log.error('Failed to parse API response:', error);
            }
        }
    });



    try {
        // 等待 class 为 "prompt" 的元素出现
        await page.waitForSelector('.prompt', { timeout: 10000 }); // 10秒超时
        console.info('Element with class "prompt" is now visible on the page.');

        // 现在可以对该元素进行操作，例如获取内容
        const text = await page.$eval('.prompt', (el) => el.textContent?.trim());
        console.info(`Element content: ${text}`);
        if (text === VISIT_TEXT) {
            console.error('当前未登录');
            // 等待 class 为 "not_login" 的元素出现
            await page.waitForSelector('.not_login', { timeout: TIMEOUT }); 
            // 查找 class 为 "not_login" 下的 class 为 "el-button-group" 的子元素
            const button = await page.$('.not_login .el-button-group button:first-child');

            if (button) {
                // 获取按钮文本
                const text = await page.evaluate((btn) => btn.textContent?.trim(), button);
                console.info(`Found button with text: "${text}"`);

                // 检查文本是否为 "登录"
                if (text === '登录') {
                    console.info('Clicking the "登录" button...');
                    await button.click();
                    await page.waitForNavigation({ waitUntil: 'networkidle0' }); // 等待页面跳转完成
                    // 找到输入框
                    const inputSelector = 'input.form-control[name="user_name"]';
                    await page.waitForSelector(inputSelector, { timeout: TIMEOUT }); // 10秒超时

                    console.info('Input element found. Typing "13166911205"...');

                    // 输入文本
                    await page.type(inputSelector, '13166911205');

                    const passwordSelector = 'input.form-control[name="password"]';
                    await page.waitForSelector(passwordSelector, { timeout: TIMEOUT }); // 10秒超时

                    console.info('Input element found. Typing "968716asD@"...');

                    // 输入文本
                    await page.type(passwordSelector, 'a123456b');
                    const checkSelector = ".user_agree_box .remember_me input[name='auto_login']"
                    await page.waitForSelector(checkSelector, { timeout: TIMEOUT }); // 10秒超时
                    await page.click(checkSelector);

                    const agreeSelector = ".user_agree_box .user_agree input"
                    await page.waitForSelector(agreeSelector, { timeout: TIMEOUT }); // 10秒超时
                    await page.click(agreeSelector);
                    await page.click('.password_login form .text_align_center');

                    // 登录成功后保存 cookie
                    const cookies = await page.cookies();
                    await store.setValue(COOKIES_KEY, cookies);  // 保存 cookies
                    console.info('Cookies saved.', cookies);

                    await page.waitForSelector('.user_icon .name', { timeout: TIMEOUT });


                    const userName = await page.$eval('.user_icon .name', (el) => el.textContent?.trim());
        console.info(`Element content: ${text}`);
                    console.info(`userName: "${userName}"`);
                    await page.waitForSelector('.jsl-table-body-wrapper .jsl-table-body td .jsl-table-body-wrapper ', { timeout: TIMEOUT * 100 });
                    console.error('等待表格加载完成')
                    // 此处需要等待表格数据加载完成
                    const firstTableRowCount = await page.$eval('.jsl-table-body:nth-of-type(1)', (table) => {
                        return table.querySelectorAll('tr').length;
                    });
                    console.error('第一个表格的长度', firstTableRowCount)
                } else {
                    console.warn('The first button is not the "登录" button.');
                }
            } else {
                console.info('No button found under ".not_login .el-button-group".');
            }
        }
    } catch (error) {
        console.info('出错了报错了', error)
        console.info(JSON.stringify(error));
    }
});