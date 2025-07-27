module.exports = {
  apps: [
    {
      name: 'app', // 应用名称
      script: 'server.js', // 启动脚本
      instances: 2, // 改为2个实例，提供冗余
      exec_mode: 'cluster', // 改为集群模式
      watch: false, // 不监听文件变化
      max_memory_restart: '200M', // 降低内存限制，更频繁重启
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
      restart_delay: 1000, // 缩短重启延迟
      // 监控配置
      exp_backoff_restart_delay: 10, // 缩短退避延迟
      max_restarts: 50, // 增加重启次数
      // 性能监控
      min_uptime: '2s', // 缩短最小运行时间
      // 集群配置
      exec_interpreter: 'node',
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
