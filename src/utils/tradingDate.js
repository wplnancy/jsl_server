import dayjs from 'dayjs';

/**
 * 判断是否为交易日（周一至周五）
 * @param {string|Date} date - 日期
 * @returns {boolean} 是否为交易日
 */
export function isTradingDay(date) {
  const day = dayjs(date).day();
  // 0: 周日, 1: 周一, ..., 6: 周六
  return day >= 1 && day <= 5;
}

/**
 * 获取当前交易日
 * 如果今天是交易日，返回今天；否则返回最近的交易日（上周五）
 * @returns {string} 当前交易日，格式：YYYY-MM-DD
 */
export function getCurrentTradingDate() {
  const today = dayjs();

  // 如果今天是交易日，直接返回今天
  if (isTradingDay(today)) {
    return today.format('YYYY-MM-DD');
  }

  // 如果今天是周末，找到最近的交易日（上周五）
  let currentDate = today;
  while (!isTradingDay(currentDate)) {
    currentDate = currentDate.subtract(1, 'day');
  }

  return currentDate.format('YYYY-MM-DD');
}

/**
 * 获取上一个交易日
 * @param {string} currentTradingDate - 当前交易日，格式：YYYY-MM-DD
 * @returns {string} 上一个交易日，格式：YYYY-MM-DD
 */
export function getPreviousTradingDate(currentTradingDate) {
  let date = dayjs(currentTradingDate);

  // 向前查找，直到找到交易日
  do {
    date = date.subtract(1, 'day');
  } while (!isTradingDay(date));

  return date.format('YYYY-MM-DD');
}

/**
 * 获取交易日期对（当前交易日和上一个交易日）
 * @returns {Object} 包含 update_time_date 和 second_time_date 的对象
 */
export function getTradingDatePair() {
  const currentRecentTradingDate = getCurrentTradingDate();
  const previousTradingDate = getPreviousTradingDate(currentRecentTradingDate);

  return {
    currentRecentTradingDate,
    previousTradingDate
  };
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {string|Date} date - 日期
 * @returns {string} 格式化后的日期
 */
export function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD');
}
