# MySQL 故障排除与解决方案

## 问题描述

项目无法连接到数据库，报错：
```
Error fetching data: Error: connect ECONNREFUSED 127.0.0.1:3306
```

Navicat Premium 无法连接到数据库，报错：
```
2002 - Can't connect to server on '127.0.0.1' (36)
```

## 问题诊断

### 1. 检查 MySQL 服务状态

```bash
brew services list | grep mysql
```

输出结果:
```
mysql   error  78       wplnancy ~/Library/LaunchAgents/homebrew.mxcl.mysql.plist
```

表明 MySQL 服务启动失败。

### 2. 尝试重启 MySQL 服务

```bash
brew services restart mysql
```

输出结果:
```
Stopping `mysql`... (might take a while)
==> Successfully stopped `mysql` (label: homebrew.mxcl.mysql)
==> Successfully started `mysql` (label: homebrew.mxcl.mysql)
```

### 3. 再次检查服务状态

```bash
brew services list | grep mysql
```

输出结果:
```
mysql   stopped         wplnancy ~/Library/LaunchAgents/homebrew.mxcl.mysql.plist
```

### 4. 检查端口占用情况

```bash
lsof -i:3306
```

无输出，表明没有服务在监听 3306 端口。

### 5. 查看 MySQL 错误日志

```bash
tail -n 50 /usr/local/var/mysql/*.err
```

关键错误信息:
```
Invalid MySQL server upgrade: Cannot upgrade from 80023 to 90300. Upgrade to next major version is only allowed from the last LTS release, which version 80023 is not.
```

表明存在版本升级冲突。

## 解决方案

### 1. 停止所有 MySQL 服务

```bash
brew services stop mysql && brew services stop mysql@8.4
```

输出结果:
```
Stopping `mysql`... (might take a while)
==> Successfully stopped `mysql` (label: homebrew.mxcl.mysql)
Stopping `mysql@8.4`... (might take a while)
==> Successfully stopped `mysql@8.4` (label: homebrew.mxcl.mysql@8.4)
```

### 2. 查找 MySQL 进程并终止

```bash
ps aux | grep mysql | grep -v grep
kill -9 [进程ID]
```

### 3. 恢复原始 MySQL 安装

发现原始 MySQL 安装位于:
```
/usr/local/mysql-8.0.13-macos10.14-x86_64/
```

数据库 kzz_datax 位于:
```
/usr/local/mysql-8.0.13-macos10.14-x86_64/data/kzz_datax
```

### 4. 启动原始 MySQL 服务

```bash
/usr/local/mysql-8.0.13-macos10.14-x86_64/bin/mysqld_safe --datadir=/usr/local/mysql-8.0.13-macos10.14-x86_64/data
```

### 5. 验证 MySQL 服务运行状态

```bash
lsof -i:3306
```

输出结果:
```
COMMAND   PID     USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
mysqld  28496 wplnancy   32u  IPv6 0x5d0855cf733ace71      0t0  TCP *:mysql (LISTEN)
```

### 6. 确认数据库存在

```bash
/usr/local/mysql-8.0.13-macos10.14-x86_64/bin/mysql -u root -p12345678 -e "SHOW DATABASES;"
```

输出结果:
```
+--------------------+
| Database           |
+--------------------+
| information_schema |
| koa2_weibo_db      |
| kzz_datax          |
| mysql              |
| performance_schema |
| sys                |
+--------------------+
```

### 7. 验证数据库表存在

```bash
/usr/local/mysql-8.0.13-macos10.14-x86_64/bin/mysql -u root -p12345678 -e "USE kzz_datax; SHOW TABLES;"
```

输出结果:
```
+---------------------+
| Tables_in_kzz_datax |
+---------------------+
| bond_cells          |
| bond_strategies     |
| bound_index         |
| summary             |
+---------------------+
```

## 连接配置

现在可以通过以下参数连接 MySQL 数据库：

- **主机**: 127.0.0.1 或 localhost
- **端口**: 3306
- **用户名**: root
- **密码**: 12345678
- **数据库**: kzz_datax

## 后续操作

如需在 bond_strategies 表中添加拉黑字段，可执行以下 SQL:

```sql
USE kzz_datax;
ALTER TABLE bond_strategies ADD COLUMN is_blacklisted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '拉黑状态：0-不拉黑，1-拉黑';
```

## 预防措施

为避免类似问题再次发生，建议:

1. 保持单一 MySQL 版本，避免多版本冲突
2. 定期备份重要数据库
3. 记录 MySQL 配置信息（版本、数据目录位置等）
4. 设置自启动脚本，确保系统重启后 MySQL 服务自动启动 