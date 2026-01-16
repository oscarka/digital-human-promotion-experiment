# 活动记录查询系统

## 功能说明

系统会自动记录以下关键事件：

1. **接起解析** (`analysis_started`): 医生接起电话并开始解析流程
2. **推荐产品** (`product_recommended`): AI分析完成并推荐产品
3. **发送短信** (`sms_sent`): 医生确认并发送结果给患者

## 数据存储

- **存储位置**: `server/data/activity_records.jsonl`
- **存储格式**: JSONL（每行一个JSON对象），追加写入
- **数据安全**: 
  - 每次写入后立即同步到磁盘
  - 追加模式，不会覆盖已有数据
  - 已添加到 `.gitignore`，不会提交到Git

## 查询页面

### 访问方式

1. **独立页面**: 访问 `http://localhost:3000/records.html`
2. **或通过路由**: 在应用中添加路由到 `RecordsQuery` 组件

### 功能特性

- 📊 **统计信息**: 显示总记录数、各事件类型数量
- 🔍 **筛选查询**: 支持按事件类型、医生ID、通话ID、日期范围筛选
- 📄 **分页显示**: 支持分页浏览，每页50条记录
- 📋 **详细信息**: 显示每条记录的完整信息，包括医生、患者、产品、话术等

## API接口

### 记录事件

```http
POST /api/records/log
Content-Type: application/json

{
  "event": "analysis_started" | "product_recommended" | "sms_sent",
  "doctor_id": "doctor_001",
  "doctor_name": "张医生",
  "call_id": "call_123456",
  ...
}
```

### 查询记录

```http
GET /api/records/query?event=analysis_started&doctor_id=doctor_001&page=1&pageSize=50
```

**查询参数**:
- `event`: 事件类型（可选）
- `doctor_id`: 医生ID（可选）
- `call_id`: 通话ID（可选）
- `start_date`: 开始日期（可选，格式：YYYY-MM-DD）
- `end_date`: 结束日期（可选，格式：YYYY-MM-DD）
- `page`: 页码（默认：1）
- `pageSize`: 每页数量（默认：50）

### 获取统计信息

```http
GET /api/records/statistics?start_date=2026-01-01&end_date=2026-01-31
```

## 记录的数据结构

### analysis_started (接起解析)

```json
{
  "event": "analysis_started",
  "timestamp": "2026-01-13T10:00:00.000Z",
  "doctor_id": "doctor_001",
  "doctor_name": "张医生",
  "call_id": "call_123456",
  "patient_id": "patient_001",
  "patient_name": "测试患者"
}
```

### product_recommended (推荐产品)

```json
{
  "event": "product_recommended",
  "timestamp": "2026-01-13T10:05:00.000Z",
  "doctor_id": "doctor_001",
  "doctor_name": "张医生",
  "call_id": "call_123456",
  "product_id": "p1",
  "product_name": "呼吸科产品A",
  "diagnosis": {
    "healthProblems": ["咳嗽", "胸闷"],
    "riskPoints": ["长期吸烟"],
    "suggestionSummary": "建议戒烟并服用..."
  }
}
```

### sms_sent (发送短信)

```json
{
  "event": "sms_sent",
  "timestamp": "2026-01-13T10:10:00.000Z",
  "doctor_id": "doctor_001",
  "doctor_name": "张医生",
  "call_id": "call_123456",
  "product_id": "p1",
  "product_name": "呼吸科产品A",
  "script": {
    "healthProblem": "根据您的症状...",
    "possibleSolution": "建议您...",
    "productPitch": "推荐您使用..."
  }
}
```

## 注意事项

1. **数据备份**: 建议定期备份 `server/data/activity_records.jsonl` 文件
2. **文件大小**: 如果记录数量很大，考虑定期归档或清理旧数据
3. **性能**: JSONL格式适合追加写入，但查询时需要读取整个文件，如果数据量很大（>10万条），建议迁移到数据库
