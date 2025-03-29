CREATE TABLE bond_strategies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bond_id VARCHAR(20) NOT NULL COMMENT '可转债的唯一标识',
    target_price DECIMAL(10, 2) COMMENT '目标价格',
    level VARCHAR(20) COMMENT '可转债等级',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY idx_bond_id (bond_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='可转债分析策略表';


ALTER TABLE bond_strategies
ADD COLUMN target_heavy_price DECIMAL(10, 2) COMMENT '重仓价格' 
AFTER target_price;


ALTER TABLE bond_strategies
ADD COLUMN heavy_position_price DECIMAL(10, 2) COMMENT '重仓价格' 
AFTER target_price; 