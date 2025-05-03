import { logToFile } from '../utils/logger.js';
import sendMail from './email.js';
import sendMessage from './feishu.js';
const SECURITY_LEVELS = {
  2: '绝对安全',
  1: '相对安全',
  0: '不安全',
};
export default (data, medianPrice) => {
  try {
    // 筛选出价格小于等于目标价或重仓价的可转债
    const targetBonds = data.filter((item) => {
      const price = parseFloat(item.price);
      const targetPrice = item.target_price ? parseFloat(item.target_price) : null;
      const heavyPrice = item.target_heavy_price ? parseFloat(item.target_heavy_price) : null;

      const sellPrice = item.sell_price ? parseFloat(item.sell_price) : null;
      // 只有设置了目标价或重仓价的可转债才会被返回
      if (targetPrice === null && heavyPrice === null && sellPrice === null) {
        return false;
      }
      // if (item.is_favorite !== '1') {
      //     return false;
      // }
      return (
        (targetPrice !== null && price <= targetPrice) ||
        (heavyPrice !== null && price <= heavyPrice) ||
        (sellPrice !== null && price >= sellPrice)
      );
    });

    if (targetBonds?.length > 0) {
      const currentTime = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      // 构建邮件内容
      const emailContent = targetBonds
        .map((bond) => {
          const priceInfo = [];
          if (bond.target_price) {
            priceInfo.push(`目标价: ${bond.target_price}`);
          }
          // if (bond.target_heavy_price) {
          //   priceInfo.push(`重仓价: ${bond.target_heavy_price}`);
          // }
          if (bond.sell_price) {
            priceInfo.push(`卖出价: ${bond.sell_price}`);
          }
          priceInfo.push(
            `${bond.is_favorite !== '1' ? ' 没关注' : ' 关注的'} |${bond.profit_strategy}| ${
              SECURITY_LEVELS[bond.level]
            }`,
          );

          // if (item.is_favorite !== '1') {
          //   priceInfo.push(`没关注的: ${bond.sell_price}`);
          // }
          return `${bond.bond_nm} (现价: ${bond.price}, ${priceInfo.join(', ')})`;
        })
        .join('\n');
      const content = `[${currentTime}] 当前中位数: ${medianPrice}\n${emailContent}`;
      if (content?.length > 0) {
        sendMail(content);
        sendMessage(content);
      }
    }
  } catch (error) {
    logToFile(`发送邮件或者飞书失败 ${error.message || error.msg}`);
  }
};
