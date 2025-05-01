import { logToFile } from './logger.js';
/**
 * 解析现金流数据字符串，提取净利润信息
 * @param {string} cashFlowStr - 现金流数据字符串
 * @returns {Object|null} 包含净利润数据的对象，如果解析失败则返回 null
 */
export function parseCashFlowData(cashFlowStr, bondId) {
  try {
    if (!cashFlowStr) return null;

    const lines = cashFlowStr.split('\n');
    const netProfitLine = lines.find((line) => line.includes('净利润'));

    if (!netProfitLine) return null;

    // 提取冒号后的净利润数据
    const colonIndex = netProfitLine.indexOf(':');
    if (colonIndex === -1) return null;

    const profitsStr = netProfitLine.slice(colonIndex + 1);
    // 匹配数字（包括负数和小数）后面跟着"亿"的模式
    const profitMatches = profitsStr.match(/([-]?\d+\.?\d*)(?=亿)/g);

    if (!profitMatches) return null;

    // 转换为数字数组
    const profits = profitMatches.map((num) => parseFloat(num));

    // 取最后三年的净利润数据（包括最后一个值）
    const last3YearsProfits = profits.slice(-3);
    const totalProfit = Number(
      last3YearsProfits.reduce((sum, profit) => sum + profit, 0).toFixed(2),
    );
    // if (bondId === '123128') { 首华
    // last3YearsProfits [ 0.41, -2.46, -7.11 ]
    // totalProfit -9.16
    //   console.log('last3YearsProfits', last3YearsProfits);
    //   console.log('totalProfit', totalProfit);
    // }
    return {
      profits: last3YearsProfits,
      total: totalProfit,
    };
  } catch (error) {
    const errorMessage = `解析现金流数据失败: ${bondId} ${error.message}`;
    console.error(errorMessage);
    logToFile(errorMessage);
    return null;
  }
}
