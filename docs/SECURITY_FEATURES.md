# 安全功能文档

本文档介绍 Studify 应用的安全功能，包括双重验证 (MFA) 和密码重置功能。

## 🔐 双重验证 (MFA/TOTP)

### 功能概述
- 基于 TOTP (Time-based One-Time Password) 的双重验证
- 支持主流验证器应用：Google Authenticator、Authy、Microsoft Authenticator、1Password
- 提供备用代码以防设备丢失

### 实现特性
- **安全性**：TOTP secret 加密存储在数据库
- **用户友好**：引导式设置流程，包含二维码和手动输入选项
- **备用方案**：生成 10 个一次性备用代码
- **管理功能**：可以启用/禁用，需要密码确认

### 使用流程
1. 用户在设置页面点击"双重验证"开关
2. 系统生成 TOTP secret 和二维码
3. 用户扫描二维码或手动输入密钥到验证器应用
4. 输入 6 位验证码确认设置
5. 下载备用代码文件
6. 完成设置，账户受双重验证保护

### 技术实现
```typescript
// API 端点
GET  /api/auth/mfa/setup     // 生成 TOTP secret 和二维码
POST /api/auth/mfa/setup     // 验证 TOTP 并启用 MFA
POST /api/auth/mfa/disable   // 禁用 MFA (需要密码确认)

// React Hooks
useMFASetup()    // 设置 MFA
useMFAVerify()   // 验证并启用 MFA
useMFADisable()  // 禁用 MFA
useMFAStatus()   // 获取 MFA 状态
```

## 🔑 密码重置

### 功能概述
- 安全的密码重置流程
- 邮件链接验证
- 密码强度要求
- 支持已登录用户修改密码

### 安全特性
- **令牌安全**：使用 SHA-256 哈希存储重置令牌
- **时效性**：重置链接 24 小时后自动过期
- **一次性使用**：令牌使用后立即失效
- **审计跟踪**：记录 IP 地址和用户代理

### 密码要求
- 最少 8 个字符
- 包含大写字母
- 包含小写字母
- 包含数字
- 包含特殊字符

## 📊 数据库架构

### 运行 Migration
```bash
# 运行以下 SQL 文件应用数据库更改
psql -d studify -f db/migrations/20250924_add_mfa_support.sql
```

## 🛠️ 安装和配置

### 依赖项
```bash
# 需要安装以下 npm 包来完整支持 TOTP
npm install otplib qrcode
npm install @types/qrcode --save-dev
```

### 环境变量
确保设置以下环境变量：
```
NEXT_PUBLIC_SITE_URL=https://yourdomain.com  # 生产环境域名
```

## 🚀 部署说明

1. **运行数据库 Migration**：
   ```bash
   psql -d studify -f db/migrations/20250924_add_mfa_support.sql
   ```

2. **安装 TOTP 依赖**：
   ```bash
   npm install otplib qrcode @types/qrcode
   ```

3. **更新 MFA API**：
   - 取消注释 `app/api/auth/mfa/setup/route.ts` 中的 otplib 相关代码
   - 移除临时的验证逻辑

4. **配置邮件服务**：
   - 实现密码重置邮件发送功能
   - 替换 `app/api/auth/reset-password/route.ts` 中的 TODO 注释

## 🎯 功能特色

### 用户体验
- **直观界面**：现代化的设置页面，清晰的状态指示
- **引导流程**：步骤式 MFA 设置，降低用户学习成本
- **安全提示**：密码强度实时检查，备用代码重要性提醒

### 安全措施
- **多层验证**：密码 + TOTP 双重保护
- **令牌安全**：加密存储，定时过期
- **审计日志**：完整的安全操作记录
- **访问控制**：基于角色的权限管理

### 开发者友好
- **类型安全**：完整的 TypeScript 类型定义
- **错误处理**：全面的错误捕获和用户反馈
- **状态管理**：基于 React Query 的高效数据管理
- **可扩展性**：模块化设计，便于功能扩展
