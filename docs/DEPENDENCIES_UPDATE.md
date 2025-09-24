# 依赖项更新

为了完整支持 MFA TOTP 功能，需要安装以下依赖项：

## 必需依赖

```bash
npm install otplib qrcode
npm install @types/qrcode --save-dev
```

## 依赖说明

### otplib
- **用途**: 生成和验证 TOTP (Time-based One-Time Password)
- **版本**: ^12.0.1 (推荐)
- **功能**: 
  - 生成 TOTP secret
  - 验证 6 位验证码
  - 支持多种算法 (SHA1, SHA256, SHA512)

### qrcode  
- **用途**: 生成二维码
- **版本**: ^1.5.3 (推荐)
- **功能**:
  - 生成 TOTP URL 的二维码
  - 支持多种输出格式 (DataURL, Canvas, SVG)
  - 高度可配置

### @types/qrcode
- **用途**: qrcode 库的 TypeScript 类型定义
- **版本**: ^1.5.2 (推荐)
- **功能**: 提供完整的类型安全支持

## 更新后的代码示例

安装依赖后，更新以下文件：

### app/api/auth/mfa/setup/route.ts
```typescript
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

// 替换临时的 generateSecret 函数
function generateSecret(): string {
  return authenticator.generateSecret();
}

// 在 GET 路由中生成 QR 码
const qrCodeDataUrl = await QRCode.toDataURL(totpUrl);

return NextResponse.json({
  secret,
  totpUrl,
  backupCodes,
  qrCode: qrCodeDataUrl, // 真实的二维码
  message: 'TOTP setup generated. Please verify with your authenticator app.'
});

// 在 POST 路由中验证 TOTP
const isValid = authenticator.check(code, userProfile.totp_secret);
```

### app/api/auth/mfa/disable/route.ts
```typescript
import { authenticator } from 'otplib';

// 验证 TOTP 代码
const isValid = authenticator.check(code, userProfile.totp_secret);
```

## 安装命令

```bash
# 进入项目目录
cd /path/to/studify

# 安装生产依赖
npm install otplib qrcode

# 安装开发依赖
npm install @types/qrcode --save-dev
```

## 验证安装

安装完成后，可以通过以下方式验证：

```bash
# 检查已安装的包
npm list otplib qrcode @types/qrcode

# 或查看 package.json
cat package.json | grep -E "(otplib|qrcode)"
```

预期输出：
```json
{
  "dependencies": {
    "otplib": "^12.0.1",
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.2"
  }
}
```
