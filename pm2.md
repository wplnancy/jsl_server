一些 PM2 的常用命令：
pm2 start ecosystem.config.cjs  # 使用配置文件启动
pm2 list                      # 列出所有运行中的应用
pm2 status                    # 查看应用状态
pm2 show app           # 查看特定应用的详细信息

pm2 logs                      # 查看所有应用的日志
pm2 logs app           # 查看特定应用的日志
pm2 logs --lines 200          # 查看最近200行日志
pm2 flush                     # 清空所有日志

进程管理

pm2 stop app           # 停止特定应用
pm2 stop all                  # 停止所有应用
pm2 restart app        # 重启特定应用
pm2 restart all               # 重启所有应用
pm2 delete app         # 删除特定应用
pm2 delete all                # 删除所有应用


监控和性能
pm2 monit                     # 实时监控应用
pm2 describe [app_name]       # 查看应用详细信息
pm2 reload [app_name]         # 零停机重载应用