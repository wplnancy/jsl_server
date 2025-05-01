import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';

// 日志文件路径
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'crawler.log');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

/**
 * 将消息记录到日志文件
 * @param {string} message - 要记录的消息
 */
const logToFile = (message) => {
  const timestamp = dayjs().format('YYYY年MM月DD日HH时mm分ss秒');
  const logMessage = `[${timestamp}] ${message}\n`;

  fs.appendFile(LOG_FILE, logMessage, (err) => {
    if (err) {
      console.error('写入日志文件失败:', err);
    }
  });
};

export { logToFile };
