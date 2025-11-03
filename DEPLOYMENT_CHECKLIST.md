# 🚀 移动端认证部署检查清单

## ✅ 已完成

- [x] 获取 SHA256 指纹：`5228682A034750EF69526D72FDE499F9263A3CCF8065D8B17202BEF58641D994`
- [x] 更新 `public/.well-known/assetlinks.json`

## 📋 下一步操作

### 1. 在 Supabase 添加重定向 URL

进入 [Supabase Dashboard](https://app.supabase.com) → 你的项目 → Authentication → URL Configuration

在 **Redirect URLs** 部分添加以下 URL：

```
studify://auth-callback
https://studify-platform.vercel.app/api/auth/callback
https://studify-platform.vercel.app/mobile-redirect
```

点击 **Save** 保存。

---

### 2. 部署到 Vercel

```bash
# 提交更改
git add public/.well-known/assetlinks.json
git commit -m "Add Android App Links configuration"
git push
```

等待 Vercel 自动部署完成（约 1-2 分钟）。

---

### 3. 验证 assetlinks.json 可访问

在浏览器或命令行中访问：

```
https://studify-platform.vercel.app/.well-known/assetlinks.json
```

应该看到 JSON 内容，包含你的 SHA256 指纹。

或使用命令：

```bash
curl https://studify-platform.vercel.app/.well-known/assetlinks.json
```

---

### 4. 重新构建 Android 应用

```bash
# 构建 Next.js
npm run build

# 同步到 Capacitor
npx cap sync android

# 打开 Android Studio
npx cap open android
```

在 Android Studio 中：

1. **Build** → **Clean Project**
2. **Build** → **Rebuild Project**
3. 如果已安装旧版本，先卸载：
   - 设备上长按应用图标 → 卸载
   - 或使用命令：`adb uninstall com.studify.platform.vercel.app`
4. 点击 **Run** 按钮安装新版本

---

### 5. 测试 App Links

#### 方法 1：使用 ADB 命令测试

```bash
# 测试 OAuth 回调（自定义 scheme）
adb shell am start -W -a android.intent.action.VIEW -d "studify://auth-callback?code=test123"

# 测试邮箱验证（App Links）
adb shell am start -W -a android.intent.action.VIEW -d "https://studify-platform.vercel.app/api/auth/callback?code=test123&type=signup"

# 测试密码重置（App Links）
adb shell am start -W -a android.intent.action.VIEW -d "https://studify-platform.vercel.app/api/auth/callback?type=recovery&token_hash=test123"
```

**预期结果：** 应用应该打开（不是浏览器）

#### 方法 2：检查 App Links 验证状态

```bash
# 查看验证状态
adb shell pm get-app-links com.studify.platform.vercel.app

# 手动触发验证
adb shell pm verify-app-links --re-verify com.studify.platform.vercel.app

# 等待几秒后再次查看状态
adb shell pm get-app-links com.studify.platform.vercel.app
```

**预期输出：**

```
com.studify.platform.vercel.app:
  ID: ...
  Signatures: ...
  Domain verification state:
    studify-platform.vercel.app: verified
```

如果显示 `none` 或 `ask`，说明验证失败，需要检查：

- assetlinks.json 是否可访问
- SHA256 指纹是否正确
- 包名是否匹配

---

### 6. 完整功能测试

#### 测试 1：OAuth 登录 ✅

1. 打开应用
2. 点击"使用 Google 登录"
3. 在浏览器中选择账户
4. **应用应该自动打开**（不停留在浏览器）
5. 成功登录并跳转到首页

#### 测试 2：邮箱验证 🔧

1. 注册新账户（使用真实邮箱）
2. 收到验证邮件
3. 在手机上打开邮件
4. 点击验证链接
5. **应用应该自动打开**（不是浏览器）
6. 显示验证成功并自动登录

#### 测试 3：密码重置 🔧

1. 点击"忘记密码"
2. 输入邮箱
3. 收到重置邮件
4. 在手机上打开邮件
5. 点击重置链接
6. **应用应该自动打开**（不是浏览器）
7. 显示重置密码页面
8. 输入新密码并成功重置

---

## 🐛 故障排除

### 问题：App Links 显示 "none" 或 "ask"

**解决方案：**

1. **确认 assetlinks.json 可访问**

   ```bash
   curl https://studify-platform.vercel.app/.well-known/assetlinks.json
   ```

   应该返回 JSON，不是 404

2. **确认 SHA256 正确**
   你的 SHA256：`5228682A034750EF69526D72FDE499F9263A3CCF8065D8B17202BEF58641D994`

   验证应用的 SHA256：

   ```bash
   keytool -list -v -keystore C:\Users\user\keystore\studify.keystore -alias key0 -storepass YOUR_PASSWORD | findstr "SHA256:"
   ```

3. **清除应用数据并重新安装**

   ```bash
   adb uninstall com.studify.platform.vercel.app
   # 然后从 Android Studio 重新安装
   ```

4. **等待验证完成**
   App Links 验证可能需要几分钟。可以手动触发：
   ```bash
   adb shell pm verify-app-links --re-verify com.studify.platform.vercel.app
   ```

### 问题：点击邮件链接后在浏览器打开

**可能原因：**

- App Links 验证未通过
- 应用未安装或已卸载
- 邮件客户端不支持 App Links

**解决方案：**

1. 检查 App Links 验证状态（见上文）
2. 确保应用已安装
3. 如果 App Links 不工作，会自动降级到 mobile-redirect 页面，显示"打开应用"按钮

### 问题：OAuth 登录后停留在浏览器

**解决方案：**

1. 确认 Supabase 中添加了 `studify://auth-callback`
2. 检查 AndroidManifest.xml 中的 intent-filter
3. 清除应用数据并重试

---

## 📊 验收标准

完成以下所有测试后，移动端认证适配即完成：

- [ ] assetlinks.json 可以通过 HTTPS 访问
- [ ] App Links 验证状态为 "verified"
- [ ] OAuth 登录后返回应用
- [ ] 邮箱验证链接打开应用
- [ ] 密码重置链接打开应用
- [ ] 所有流程在真实设备上测试通过

---

## 📱 你的配置信息

- **包名：** `com.studify.platform.vercel.app`
- **SHA256：** `5228682A034750EF69526D72FDE499F9263A3CCF8065D8B17202BEF58641D994`
- **Keystore：** `C:\Users\user\keystore\studify.keystore`
- **Alias：** `key0`
- **域名：** `studify-platform.vercel.app`

---

## 🎉 完成后

恭喜！你的移动端认证系统现在支持：

- ✅ OAuth 登录（Google）自动返回应用
- ✅ 邮箱验证链接打开应用
- ✅ 密码重置链接打开应用
- ✅ 无缝的用户体验

如有问题，请查看：

- [IMPLEMENTATION_GUIDE.zh-CN.md](./docs/IMPLEMENTATION_GUIDE.zh-CN.md)
- [MOBILE_AUTH_SUMMARY.zh-CN.md](./docs/MOBILE_AUTH_SUMMARY.zh-CN.md)
- [QUICK_REFERENCE.zh-CN.md](./docs/QUICK_REFERENCE.zh-CN.md)
