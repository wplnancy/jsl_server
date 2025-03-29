# 可转债策略更新接口文档

## 接口说明
更新或创建可转债策略信息。如果指定的`bond_id`已存在，则更新相应字段；如果不存在，则创建新记录。

## 接口信息
- 请求路径：`/api/bond_strategies`
- 请求方法：`POST`
- 请求类型：`application/json`

## 请求参数

| 参数名 | 类型 | 是否必须 | 说明 |
|--------|------|----------|------|
| bond_id | string | 是 | 可转债唯一标识 |
| target_price | decimal | 否 | 目标价格 |
| level | string | 否 | 可转债等级 |
| is_analyzed | number | 否 | 是否已分析完成（1表示已完成，0表示未完成）|

## 请求示例

```json
// 示例1：只更新目标价格
{
    "bond_id": "123456",
    "target_price": 105.5
}

// 示例2：更新多个字段
{
    "bond_id": "123456",
    "target_price": 105.5,
    "level": "A",
    "is_analyzed": 1
}

// 示例3：只更新分析状态
{
    "bond_id": "123456",
    "is_analyzed": 1
}
```

## 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 请求是否成功 |
| message | string | 响应信息 |
| error | string | 错误信息（仅在失败时返回）|

## 响应示例

```json
// 成功响应
{
    "success": true,
    "message": "可转债策略更新成功"
}

// 失败响应
{
    "success": false,
    "message": "更新可转债策略失败",
    "error": "错误详细信息"
}
```

## 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误（缺少必要参数bond_id）|
| 500 | 服务器内部错误 |

## 注意事项
1. 只需要传入需要更新的字段，未传入的字段将保持原值不变
2. 新建记录时，未传入的可选字段将使用默认值：
   - target_price: null
   - level: null
   - is_analyzed: 0 