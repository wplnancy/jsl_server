export default () => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const time = hour * 100 + minute;

  // 周一至周五
  if (day >= 1 && day <= 5) {
    // 上午交易时间 9:30-11:30
    if (time >= 930 && time <= 1130) {
      return true;
    }
    // 下午交易时间 12:57-15:00
    if (time >= 1257 && time <= 1500) {
      return true;
    }
  }
  return false;
};
