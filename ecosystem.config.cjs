module.exports = {
  apps: [
    {
      name: 'app', // 应用名称
      script: 'server.js', // 启动脚本
      instances: 1, // 保持单实例，避免重复请求
      exec_mode: 'fork', // 执行模式
      watch: false, // 不监听文件变化
      max_memory_restart: '250M', // 内存超过150M时重启（高频请求通常内存使用较少）
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      // 自动重启配置
      autorestart: true,
      restart_delay: 2000, // 重启延迟时间缩短到2秒，确保15秒间隔不受影响
      // 监控配置
      exp_backoff_restart_delay: 30, // 指数退避重启延迟缩短
      max_restarts: 30, // 增加最大重启次数，适应高频请求
      // 性能监控
      min_uptime: '3s', // 最小运行时间进一步缩短
      // 集群配置
      exec_interpreter: 'node',
      exec_mode: 'fork',
      // 环境变量
      env_production: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
    },
  ],
};
