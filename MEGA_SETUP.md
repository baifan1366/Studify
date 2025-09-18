# MEGA Storage Configuration

## 环境变量配置

在你的 `.env` 文件中添加以下环境变量（**注意：不要使用 NEXT_PUBLIC_ 前缀**）：

```bash
# Mega Storage (服务器端专用，不暴露给客户端)
MEGA_EMAIL="weixuan.chong@gmail.com"
MEGA_PASSWORD="bk_zdgJ2frqp:2Y"
```

## 重要说明

### 为什么不使用 NEXT_PUBLIC_ 前缀？

- `NEXT_PUBLIC_` 前缀会将环境变量暴露给客户端浏览器
- MEGA 凭据包含敏感信息，不应该暴露给客户端
- 我们的新实现通过安全的 API 端点 `/api/mega/credentials` 提供凭据

### 工作原理

1. **小文件 (≤4MB)**: 通过 Next.js API 路由上传
2. **大文件 (>4MB)**: 客户端直接上传到 MEGA，绕过 Vercel 4MB 限制
3. **凭据安全**: 客户端通过认证的 API 端点获取 MEGA 凭据
4. **元数据保存**: 上传完成后，文件元数据保存到数据库

### API 端点

- `GET /api/mega/credentials` - 为认证用户提供 MEGA 凭据
- `POST /api/attachments/save-metadata` - 保存文件元数据到数据库

### 部署注意事项

确保在生产环境中设置这些环境变量：
- Vercel Dashboard → Settings → Environment Variables
- 不要将敏感凭据提交到 Git 仓库

## 使用方式

用户现在可以：
1. 上传任意大小的文件（无需输入 MEGA 凭据）
2. 小文件通过服务器上传
3. 大文件自动通过 MEGA 直接上传
4. 测试 MEGA 连接（使用环境变量中的凭据）

## 安全特性

- ✅ MEGA 凭据仅在服务器端可见
- ✅ 客户端无法直接访问敏感凭据
- ✅ 认证用户才能获取上传凭据
- ✅ 所有文件元数据保存到数据库
- ✅ 绕过 Vercel 4MB 文件大小限制
