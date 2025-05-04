# Crawlee + PuppeteerCrawler + TypeScript project

This template is a production ready boilerplate for developing with `PuppeteerCrawler`. Use this to bootstrap your projects using the most up-to-date code.

If you're looking for examples or want to learn more visit:

- [Documentation](https://crawlee.dev/api/puppeteer-crawler/class/PuppeteerCrawler)
- [Examples](https://crawlee.dev/docs/examples/puppeteer-crawler)

## TODO
如何防爬

// 添加带有冷却时间的刷新接口  这个代码先临时存放防止以后再需要
router.get(API_URLS.REFRESH_WITH_COOLDOWN, async (ctx) => {
  const now = Date.now();

  // 检查是否在冷却时间内
  if (now - lastRefreshTime < REFRESH_COOLDOWN) {
    ctx.status = 429; // Too Many Requests
    ctx.body = {
      code: 429,
      message: `请求过于频繁，请在 ${Math.ceil(
        (REFRESH_COOLDOWN - (now - lastRefreshTime)) / 1000,
      )} 秒后重试`,
      success: false,
    };
    return;
  }

  // 检查是否有正在进行的刷新操作
  if (isRefreshing) {
    ctx.status = 409; // Conflict
    ctx.body = {
      code: 409,
      message: '另一个刷新操作正在进行中',
      success: false,
    };
    return;
  }

  try {
    isRefreshing = true;
    console.log('开始刷新数据...');

    // 执行爬虫任务
    await crawler.run(startUrls);

    // 更新最后刷新时间
    lastRefreshTime = Date.now();

    // 获取最新的 summary 数据
    const data = await fetchSummaryData(1000, {}); // 传递空过滤对象

    // 处理数据格式，与 summary 接口保持一致
    for (let item of data) {
      // 处理日期格式
      if (item.maturity_dt) {
        item.maturity_dt = dayjs(item.maturity_dt).format('YYYY-MM-DD');
      }

      // 确保is_analyzed为数字类型，并设置默认值
      item.is_analyzed = item.is_analyzed ? 1 : 0;

      // 确保target_price和level有默认值
      item.target_price = item.target_price || null;
      item.level = item.level || '';
      item.is_state_owned = item.is_state_owned ? 1 : 0;
    }

    ctx.body = {
      code: 200,
      message: '刷新成功',
      success: true,
      data: data,
    };
  } catch (error) {
    console.error('刷新失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: '刷新失败: ' + error.message,
      success: false,
    };
  } finally {
    isRefreshing = false;
  }
});

