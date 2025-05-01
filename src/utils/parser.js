import { logToFile } from './logger.js';

/**
 * 解析调整记录数据
 * @param {string} htmlStr - HTML格式的调整记录字符串
 * @returns {Array} 解析后的调整记录数组
 */
export function parseAdjustData(htmlStr, bondId) {
  try {
    // 解码 HTML 字符串
    const decodedHtml = decodeURIComponent(htmlStr);
    const records = [];

    // 按行分割
    const rows = decodedHtml.split('<tr>');

    // 遍历每一行（跳过表头）
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];

      // 提取单元格内容
      const cells = row.split('</td>').map((cell) => {
        // 移除HTML标签和多余空格
        return cell.replace(/<[^>]*>/g, '').trim();
      });
      // 检查是否为下修且成功的记录
      if (cells[4] === '下修' && cells[5] === '成功') {
        // 从说明中提取下修底价
        const bottomPriceMatch = cells[6].match(/下修底价\s*(\d+(\.\d+)?)/);
        const bottomPrice = bottomPriceMatch ? parseFloat(bottomPriceMatch[1]) : null;
        const newPrice = parseFloat(cells[2]);

        // 构建记录对象
        const record = {
          meeting_date: cells[0] || null, // 股东大会日期
          effective_date: cells[1], // 生效日期
          new_price: newPrice, // 新转股价
          old_price: parseFloat(cells[3]), // 原转股价
          bottom_price: bottomPrice, // 下修底价
          adj_rate: bottomPrice && newPrice ? Number((bottomPrice / newPrice).toFixed(2)) : null, // 下修比例
        };

        records.push(record);
      }
      if (cells[4] === '下修' && cells[5] === '提议') {
        // 从说明中提取下修底价
        const bottomPriceMatch = cells[6];
        const bottomPrice = bottomPriceMatch ? parseFloat(bottomPriceMatch[1]) : null;
        const newPrice = parseFloat(cells[2]);

        // 构建记录对象
        const record = {
          meeting_date: cells[0] || null, // 股东大会日期
          effective_date: cells[1] || null, // 生效日期
          new_price: cells[2] || null, // 新转股价
          old_price: parseFloat(cells[3]), // 原转股价
          bottom_price: bottomPrice, // 下修底价
          adj_rate: bottomPrice && newPrice ? Number((bottomPrice / newPrice).toFixed(2)) : null, // 下修比例
        };

        records.push(record);
      }
    }

    return records;
  } catch (error) {
    const errorMessage = `解析调整记录失败: ${bondId} ${error.message}`;
    console.error(errorMessage);
    logToFile(errorMessage);
    return [];
  }
}
