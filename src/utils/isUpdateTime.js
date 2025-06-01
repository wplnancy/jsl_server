export default () => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const time = hour * 100 + minute;

  // 周一至周五
  if (day >= 1 && day <= 5) {
    return time >= 1500 && time <= 2300;
  }
  return false;
};
