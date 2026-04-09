# 🔍 验证项目和 API 访问权限

## 目标
确认你的 API Key 所属的项目已经启用了 Custom Search API。

---

## 📋 步骤 1：找到 API Key 所属的项目

### 1.1 访问 API 凭据页面
```
https://console.cloud.google.com/apis/credentials
```

### 1.2 查看所有项目
1. 点击页面顶部的**项目选择器**（项目名称旁边的下拉箭头）
2. 你会看到所有项目的列表
3. **记下所有项目名称**

### 1.3 找到你的 API Key
1. 在每个项目中，查看 "API keys" 部分
2. 找到以 `AIzaSyC0qFEy_wy...` 开头的 API Key
3. **记下这个 API Key 所在的项目名称**

---

## 📋 步骤 2：检查该项目是否启用了 Custom Search API

### 2.1 切换到 API Key 所在的项目
1. 点击页面顶部的项目选择器
2. 选择你在步骤 1.3 中找到的项目

### 2.2 访问已启用的 API 列表
```
https://console.cloud.google.com/apis/dashboard
```

### 2.3 查找 Custom Search API
1. 在 "Enabled APIs & services" 页面
2. 查看列表中是否有 **"Custom Search API"** 或 **"Programmable Search Engine API"**
3. 如果找到了，说明已启用 ✅
4. 如果没有找到，说明未启用 ❌

---

## 📋 步骤 3：如果未启用，在该项目中启用

### 3.1 确保你在正确的项目中
- 页面顶部应该显示 API Key 所在的项目名称

### 3.2 启用 Custom Search API
```
https://console.cloud.google.com/apis/library/customsearch.googleapis.com
```
1. **再次确认项目名称**（页面顶部）
2. 点击 **"ENABLE"** 按钮
3. 等待 3-5 秒

### 3.3 验证已启用
返回到：
```
https://console.cloud.google.com/apis/dashboard
```
确认 "Custom Search API" 出现在列表中。

---

## 📋 步骤 4：验证 API Key 没有限制

### 4.1 访问 API Key 详情
```
https://console.cloud.google.com/apis/credentials
```

### 4.2 点击你的 API Key
找到以 `AIzaSyC0qFEy_wy...` 开头的 key，点击它的名称。

### 4.3 检查 API restrictions
查看 **"API restrictions"** 部分：

**选项 A：没有限制（推荐）**
- 应该显示：**"Don't restrict key"**
- 如果是这样，✅ 很好

**选项 B：有限制**
- 如果显示：**"Restrict key"**
- 检查列表中是否包含 **"Custom Search API"**
- 如果包含，✅ 很好
- 如果不包含，❌ 需要添加

### 4.4 如果需要修改
1. 选择 **"Don't restrict key"**（最简单）
2. 或者选择 **"Restrict key"** 并勾选 **"Custom Search API"**
3. 点击 **"Save"**
4. 等待 1-2 分钟

---

## 📋 步骤 5：运行诊断脚本

### 5.1 运行诊断
```bash
npx tsx diagnose-setup.ts
```

### 5.2 查看输出
脚本会告诉你：
- API Key 格式是否正确
- 能否连接到 Google APIs
- 具体的错误信息和建议

---

## 🎯 快速检查清单

完成每一步后打勾：

- [ ] 找到了 API Key 所在的项目名称
- [ ] 切换到该项目
- [ ] 在 API Dashboard 中看到 "Custom Search API" 已启用
- [ ] 检查了 API Key 的限制设置
- [ ] API Key 没有限制，或限制中包含 Custom Search API
- [ ] 运行了诊断脚本
- [ ] 等待了 1-2 分钟（如果刚做了更改）

---

## 📊 验证方法总结

### 方法 1：通过 API Dashboard
```
https://console.cloud.google.com/apis/dashboard
```
在 "Enabled APIs & services" 中查找 "Custom Search API"

### 方法 2：通过 API Library
```
https://console.cloud.google.com/apis/library/customsearch.googleapis.com
```
如果显示 "MANAGE" 或 "API enabled"，说明已启用

### 方法 3：通过 gcloud CLI（如果已安装）
```bash
gcloud services list --enabled --project=<你的项目ID>
```
查找 `customsearch.googleapis.com`

---

## 🔍 常见情况

### 情况 1：API Key 在项目 A，但你在项目 B 启用了 API
**问题：** 项目不匹配

**解决：**
- 选项 A：在项目 A 中启用 Custom Search API
- 选项 B：在项目 B 中创建新的 API Key

### 情况 2：API 已启用，但 API Key 有限制
**问题：** API Key 限制中不包含 Custom Search API

**解决：**
- 编辑 API Key
- 移除限制或添加 Custom Search API

### 情况 3：一切看起来都正确，但仍然 403
**问题：** 可能是缓存或传播延迟

**解决：**
- 等待 2-3 分钟
- 创建新的 API Key
- 清除浏览器缓存

---

## 💡 提示

**最简单的验证方法：**

1. 访问：https://console.cloud.google.com/apis/credentials
2. 找到你的 API Key
3. 记下项目名称（页面顶部）
4. 访问：https://console.cloud.google.com/apis/dashboard
5. 确认项目名称相同
6. 查找 "Custom Search API"

如果这两个项目名称不同，或者找不到 Custom Search API，那就是问题所在！

---

## 🆘 需要帮助？

完成检查后，告诉我：
1. 你的 API Key 在哪个项目中？
2. 该项目的 API Dashboard 中有 "Custom Search API" 吗？
3. API Key 有限制吗？如果有，限制了哪些 API？

我会根据你的情况提供具体的解决方案！
