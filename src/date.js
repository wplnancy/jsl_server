import dayjs from 'dayjs';

export function isMarketOpen() {
  const now = dayjs();
  const hour = now.hour();
  const minute = now.minute();
  
  // 判断是否是工作日
  const dayOfWeek = now.day(); // 0: Sunday, 1: Monday, ..., 6: Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false; // 周末休市
  }

  // 判断是否在交易时间内（9:30-11:30 或 13:00-15:00）
  if ((hour === 9 && minute >= 30) || (hour >= 10 && hour < 11) || (hour === 11 && minute <= 30) || (hour >= 13 && hour < 15)) {
    return true;
  }

  return false;
}
