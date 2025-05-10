// API URLs
export const API_URLS = {
  // 查询转债等权指数和价格中位数等信息
  BOUND_INDEX: '/api/bound_index',
  BOND_CELL: '/api/bond_cell',
  BOND_STRATEGIES: '/api/bond_strategies',
  SUMMARY: '/api/summary', // 获取summary列表
  UPDATE_LIST: '/api/update_list', // 获取summary列表
  SUMMARY_BATCH_UPDATE: '/api/summary/batch-update', // 批量更新summary
  REFRESH_WITH_COOLDOWN: '/api/refresh-with-cooldown', // 暂时不需要了
  BOND_CELLS_UPDATE: '/api/bond_cells/update',
  UPDATE_BOND_STRATEGIES: '/api/bond_strategies',

  BOND_CELLS_WITHOUT_ASSET_DATA: '/api/bond_cells/without_asset_data',
  // 获取中位数历史数据
  INDEX_HISTORY: '/api/index_history',
  INDEX_HISTORY_BATCH: '/api/index_history/batch',
  // 更新中位数价格
  UPDATE_MEDIAN_PRICE: '/api/bound_index/median_price',
};
