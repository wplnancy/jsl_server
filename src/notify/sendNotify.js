import { logToFile } from '../utils/logger.js';
import sendMail from './email.js';
import sendMessage from './feishu.js';
const SECURITY_LEVELS = {
  2: '绝对安全',
  1: '相对安全',
  0: '不安全',
};
export default (targetBonds, medianPrice) => {
  try {
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
            `涨跌幅: ${bond.increase_rt}% |${bond.profit_strategy}| ${
              SECURITY_LEVELS[bond.level]
            } `,
          );

          return `${bond.bond_nm.slice(0, 2)} ${bond.bond_id}(现价: ${bond.price}, ${priceInfo.join(
            ', ',
          )})`;
        })
        .join('\n');
      const content = `[${currentTime}] 当前中位数: ${medianPrice}\n${emailContent}`;
      if (content?.length > 0) {
        // sendMail(content);
        sendMessage(content);
      }
    }
  } catch (error) {
    logToFile(`发送邮件或者飞书失败 ${error.message || error.msg}`);
  }
};
