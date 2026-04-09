# Google Custom Search API 配置指南

本文档详细说明如何为 Studify 平台配置 Google Custom Search API，以启用 Web Search Tool 功能。

## 📋 目录

1. [前置要求](#前置要求)
2. [创建 Google Custom Search Engine](#创建-google-custom-search-engine)
3. [获取 API Key](#获取-api-key)
4. [配置环境变量](#配置环境变量)
5. [验证配置](#验证配置)
6. [配额管理](#配额管理)
7. [故障排除](#故障排除)

---

## 前置要求

- Google 账号
- 访问 Google Cloud Console 的权限
- 项目的 `.env` 文件访问权限

---

## 创建 Google Custom Search Engine

### 步骤 1: 访问 Programmable Search Engine

1. 打开浏览器，访问：
   ```
   https://programmablesearchengine.google.com/
   ```

2. 使用你的 Google 账号登录

### 步骤 2: 创建新的搜索引擎

1. 点击 **"Add"** 或 **"创建搜索引擎"** 按钮

2. 填写搜索引擎信息：
   - **搜索引擎名称**: `Studify Web Search` (或任意名称)
   - **搜索内容**: 选择 **"搜索整个网络"** (Search the entire web)
     
     ⚠️ **重要**: 必须选择搜索整个网络，而不是特定网站

3. 点击 **"创建"** 完成创建

### 步骤 3: 获取 Search Engine ID (CX)

1. 在搜索引擎列表中，点击你刚创建的搜索引擎

2. 在左侧菜单中，点击 **"Setup"** 或 **"设置"**

3. 在 **"Basic"** 标签页中，找到 **"Search engine ID"**

4. 复制这个 ID（格式类似：`a1b2c3d4e5f6g7h8i`）

   ```
   示例: a1b2c3d4e5f6g7h8i
   ```

5. 保存这个 ID，稍后需要设置为 `GOOGLE_CX` 环境变量

### 步骤 4: 启用 SafeSearch（可选但推荐）

1. 在 **"Setup"** → **"Basic"** 页面

2. 找到 **"SafeSearch"** 选项

3. 选择 **"Filter explicit results"** 以过滤不适当内容

---

## 获取 API Key

### 步骤 1: 访问 Google Cloud Console

1. 打开浏览器，访问：
   ```
   https://console.cloud.google.com/
   ```

2. 登录你的 Google 账号

### 步骤 2: 创建或选择项目

1. 在顶部导航栏，点击项目选择器

2. 选择现有项目或点击 **"新建项目"**

3. 如果创建新项目：
   - 项目名称: `Studify` (或任意名称)
   - 点击 **"创建"**

### 步骤 3: 启用 Custom Search API

1. 在左侧菜单中，导航到：
   ```
   APIs & Services → Library
   ```

2. 在搜索框中输入：
   ```
   Custom Search API
   ```

3. 点击 **"Custom Search API"** 结果

4. 点击 **"启用"** (Enable) 按钮

### 步骤 4: 创建 API Key

1. 在左侧菜单中，导航到：
   ```
   APIs & Services → Credentials
   ```

2. 点击顶部的 **"+ CREATE CREDENTIALS"** 按钮

3. 选择 **"API key"**

4. API key 创建成功后，会显示在弹窗中

5. **复制这个 API Key**（格式类似：`AIzaSyABC123def456GHI789jkl012MNO345pqr`）

   ```
   示例: AIzaSyABC123def456GHI789jkl012MNO345pqr
   ```

### 步骤 5: 限制 API Key（推荐）

为了安全，建议限制 API Key 的使用范围：

1. 点击刚创建的 API Key 进入编辑页面

2. 在 **"API restrictions"** 部分：
   - 选择 **"Restrict key"**
   - 勾选 **"Custom Search API"**

3. 在 **"Application restrictions"** 部分（可选）：
   - 如果是服务器端使用，选择 **"IP addresses"**
   - 添加你的服务器 IP 地址

4. 点击 **"Save"** 保存设置

---

## 配置环境变量

### 步骤 1: 打开 `.env` 文件

在项目根目录找到 `.env` 文件（如果不存在，创建一个）

### 步骤 2: 添加配置

在 `.env` 文件中添加以下两行：

```bash
# Google Custom Search API Configuration
GOOGLE_API_KEY=AIzaSyABC123def456GHI789jkl012MNO345pqr
GOOGLE_CX=a1b2c3d4e5f6g7h8i
```

⚠️ **注意**:
- 将 `AIzaSyABC123def456GHI789jkl012MNO345pqr` 替换为你的实际 API Key
- 将 `a1b2c3d4e5f6g7h8i` 替换为你的实际 Search Engine ID
- 不要在值周围添加引号
- 不要提交 `.env` 文件到 Git（确保 `.gitignore` 包含 `.env`）

### 步骤 3: 验证格式

确保配置格式正确：

```bash
# ✅ 正确格式
GOOGLE_API_KEY=AIzaSyABC123def456GHI789jkl012MNO345pqr
GOOGLE_CX=a1b2c3d4e5f6g7h8i

# ❌ 错误格式（不要使用引号）
GOOGLE_API_KEY="AIzaSyABC123def456GHI789jkl012MNO345pqr"
GOOGLE_CX='a1b2c3d4e5f6g7h8i'

# ❌ 错误格式（不要有空格）
GOOGLE_API_KEY = AIzaSyABC123def456GHI789jkl012MNO345pqr
```

---

## 验证配置

### 方法 1: 使用测试脚本

运行项目提供的测试脚本：

```bash
npx tsx test-web-search.ts
```

预期输出：

```
🧪 Testing Web Search Tool Integration

============================================================

📋 Test 1: Environment Configuration
------------------------------------------------------------
✅ GOOGLE_API_KEY: AIzaSyABC1...
✅ GOOGLE_CX: a1b2c3d4e5f6g7h8i

📋 Test 2: Direct Function Call (searchWeb)
------------------------------------------------------------
🔍 Query: "What is artificial intelligence?"

📊 Results:
  - Count: 5
  - Cached: false
  - Message: Found 5 relevant web results

📄 Top Results:
  1. Artificial Intelligence (AI): What it is and why it matters
     Link: https://www.sas.com/en_us/insights/analytics/what-is-artificial-intelligence.html
     ...

✅ Test 2 PASSED
```

### 方法 2: 检查应用日志

启动应用后，查看控制台日志：

```
✅ Web Search Tool registered (API keys configured)
```

如果看到以下警告，说明配置有问题：

```
⚠️ Web Search Tool not registered (GOOGLE_API_KEY or GOOGLE_CX not configured)
```

### 方法 3: 手动测试 API

使用 curl 测试 API 是否可用：

```bash
curl "https://www.googleapis.com/customsearch/v1?key=YOUR_API_KEY&cx=YOUR_CX&q=test"
```

替换 `YOUR_API_KEY` 和 `YOUR_CX` 为你的实际值。

---

## 配额管理

### 免费配额

Google Custom Search API 提供：
- **每天 100 次免费查询**
- 超出后需要付费

### 监控使用量

1. 访问 Google Cloud Console:
   ```
   https://console.cloud.google.com/apis/api/customsearch.googleapis.com/quotas
   ```

2. 查看当前使用情况和配额限制

### 优化策略

项目已实现以下优化措施：

1. **Redis 缓存**: 相同查询 24 小时内直接返回缓存结果
2. **限制调用**: Agent 每次查询最多调用 1 次 web search
3. **优先内部搜索**: 优先使用内部知识库，减少外部搜索

### 配额告警

当接近配额限制时（90 次/天），系统会在日志中输出警告：

```
⚠️ Approaching daily quota limit: 90/100 requests used
```

### 超出配额处理

如果超出配额，API 会返回 403 错误：

```json
{
  "error": {
    "code": 403,
    "message": "The daily quota for this API has been exceeded."
  }
}
```

系统会自动处理此错误，返回友好提示：

```
Web search quota exceeded. Please try again later.
```

---

## 故障排除

### 问题 1: "GOOGLE_API_KEY not configured"

**症状**: 测试脚本显示 API Key 未配置

**解决方案**:
1. 检查 `.env` 文件是否存在
2. 确认 `GOOGLE_API_KEY` 拼写正确（区分大小写）
3. 确认没有多余的空格或引号
4. 重启应用以重新加载环境变量

### 问题 2: "API request failed with status 400"

**症状**: API 调用返回 400 错误

**可能原因**:
- API Key 格式错误
- Search Engine ID (CX) 格式错误

**解决方案**:
1. 重新复制 API Key 和 CX，确保完整
2. 检查是否有隐藏字符或空格
3. 使用 curl 手动测试 API

### 问题 3: "API request failed with status 403"

**症状**: API 调用返回 403 错误

**可能原因**:
- API Key 未启用 Custom Search API
- 超出每日配额限制
- IP 地址限制

**解决方案**:
1. 在 Google Cloud Console 确认 Custom Search API 已启用
2. 检查配额使用情况
3. 如果设置了 IP 限制，确认服务器 IP 在白名单中

### 问题 4: "Request timeout after 5 seconds"

**症状**: 搜索请求超时

**可能原因**:
- 网络连接问题
- Google API 服务响应慢

**解决方案**:
1. 检查网络连接
2. 稍后重试
3. 检查是否有防火墙阻止访问 googleapis.com

### 问题 5: 搜索结果为空

**症状**: API 调用成功但返回 0 个结果

**可能原因**:
- 搜索引擎未配置为"搜索整个网络"
- 查询词过于特殊

**解决方案**:
1. 检查 Programmable Search Engine 设置
2. 确认选择了"Search the entire web"
3. 尝试更通用的查询词

### 问题 6: 缓存不工作

**症状**: 相同查询每次都调用 API

**可能原因**:
- Redis 连接失败
- 缓存键生成问题

**解决方案**:
1. 检查 Redis 连接配置
2. 查看日志中的缓存相关错误
3. 确认 Upstash Redis 服务正常运行

---

## 安全最佳实践

### 1. 保护 API Key

- ✅ 将 API Key 存储在 `.env` 文件中
- ✅ 确保 `.env` 在 `.gitignore` 中
- ✅ 不要在代码中硬编码 API Key
- ✅ 不要在前端代码中暴露 API Key

### 2. 限制 API Key 权限

- ✅ 仅启用 Custom Search API
- ✅ 设置 IP 地址限制（如果可能）
- ✅ 定期轮换 API Key

### 3. 监控使用情况

- ✅ 定期检查 API 使用量
- ✅ 设置配额告警
- ✅ 审查异常的 API 调用模式

### 4. 生产环境配置

在生产环境（如 Vercel、Render）：

1. 在平台的环境变量设置中添加：
   ```
   GOOGLE_API_KEY=your_actual_api_key
   GOOGLE_CX=your_actual_cx
   ```

2. 不要在代码仓库中提交这些值

3. 使用平台的密钥管理服务（如果可用）

---

## 相关资源

- [Google Custom Search JSON API 文档](https://developers.google.com/custom-search/v1/overview)
- [Programmable Search Engine 控制台](https://programmablesearchengine.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [API 配额和限制](https://developers.google.com/custom-search/v1/overview#pricing)

---

## 支持

如果遇到问题：

1. 查看本文档的[故障排除](#故障排除)部分
2. 运行测试脚本获取详细错误信息
3. 检查应用日志中的错误消息
4. 联系项目维护者

---

**最后更新**: 2026-04-08
**维护者**: Studify Development Team
