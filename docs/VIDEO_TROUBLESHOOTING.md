# 视频播放器故障排除指南

## 🐛 常见问题

### 1. 黑屏问题

#### 症状：
- 视频区域显示黑屏
- 加载指示器可能显示或不显示
- 控制台没有明显错误

#### 可能原因：

**A. MEGA 连接问题**
```
检查控制台日志：
- "Loading MEGA file from URL: ..."
- "MEGA file loaded successfully"
```

**解决方案：**
1. 检查 MEGA URL 是否有效
2. 访问测试端点：`/api/attachments/[id]/test-mega`
3. 检查 MEGA 凭据是否配置正确

**B. 视频格式不支持**
```
检查控制台日志：
- "Video error: ..."
- MediaError code
```

**解决方案：**
1. 确认视频格式（MP4, WebM, OGG）
2. 检查浏览器支持
3. 尝试转码为 MP4 H.264

**C. CORS 问题**
```
检查控制台错误：
- "Access to video at ... has been blocked by CORS policy"
```

**解决方案：**
1. 检查 API 路由的 CORS 头
2. 确认 `crossOrigin="anonymous"` 设置正确

**D. HLS.js 初始化失败**
```
检查控制台日志：
- "🎬 Initializing HLS.js for: ..."
- "❌ HLS error: ..."
```

**解决方案：**
1. 确认 HLS.js 已安装：`npm list hls.js`
2. 检查 .m3u8 URL 是否可访问
3. 查看 HLS 错误详情

### 2. 无限刷新/重新加载

#### 症状：
- 控制台不断输出注册/清除日志
- 页面性能下降
- 视频无法播放

#### 原因：
- useEffect 依赖项导致循环
- 状态更新触发重新渲染

#### 解决方案：
✅ 已修复 - 使用 `eslint-disable` 和优化依赖数组

### 3. 加载进度不显示

#### 症状：
- 加载指示器一直显示
- 进度条不更新

#### 检查：
```javascript
// 浏览器控制台
const video = document.querySelector('video');
console.log('Buffered:', video.buffered);
console.log('Duration:', video.duration);
console.log('Current time:', video.currentTime);
```

#### 解决方案：
1. 检查 `handleProgress` 是否被调用
2. 确认 `buffered` 数据存在
3. 验证 `duration` 已加载

### 4. 视频无法播放

#### 症状：
- 点击播放按钮无反应
- 视频卡在第一帧

#### 检查清单：
- [ ] 视频 URL 是否正确
- [ ] 网络请求是否成功（Network 标签）
- [ ] 是否有 JavaScript 错误
- [ ] 浏览器是否支持该格式

#### 调试步骤：
```javascript
// 1. 检查视频元素
const video = document.querySelector('video');
console.log('Video element:', video);
console.log('Video src:', video.src);
console.log('Ready state:', video.readyState);
console.log('Network state:', video.networkState);

// 2. 尝试手动播放
video.play().then(() => {
  console.log('✅ Play successful');
}).catch(err => {
  console.error('❌ Play failed:', err);
});

// 3. 检查 HLS
if (window.Hls) {
  console.log('HLS.js version:', Hls.version);
  console.log('HLS supported:', Hls.isSupported());
}
```

## 🔍 调试工具

### 浏览器开发者工具

#### 1. Console 标签
查找这些日志：
```
📹 Video source: { attachmentId, src, type }
🎬 Initializing HLS.js for: ...
✅ HLS manifest loaded, found X quality levels
🎨 Quality switched to: XXXp
❌ HLS error: ...
🧹 Cleaning up HLS instance
```

#### 2. Network 标签
检查请求：
- `/api/attachments/[id]/stream` - 应该返回 206 或 200
- Range 请求头
- Content-Type 响应头
- 响应大小和时间

#### 3. Elements 标签
检查 video 元素：
```html
<video 
  src="/api/attachments/123/stream"
  preload="auto"
  crossorigin="anonymous"
  ...
>
```

### 测试端点

#### 1. 测试 MEGA 连接
```
GET /api/attachments/[id]/test-mega
```

返回：
```json
{
  "success": true,
  "url": "https://mega.nz/...",
  "fileSize": 104857600,
  "fileName": "video.mp4",
  "loadTimeMs": 1234
}
```

#### 2. 测试流式传输
```
GET /api/attachments/[id]/stream
Range: bytes=0-1048575
```

应该返回：
- Status: 206 Partial Content
- Content-Range: bytes 0-1048575/104857600
- Content-Type: video/mp4

#### 3. 简化流式传输
```
GET /api/attachments/[id]/simple-stream
```

直接重定向到 MEGA URL

## 🛠️ 常用修复

### 修复 1: 清除浏览器缓存
```javascript
// 强制重新加载视频
const video = document.querySelector('video');
video.load();
```

### 修复 2: 重置 HLS 实例
```javascript
// 在浏览器控制台
if (window.hlsInstance) {
  window.hlsInstance.destroy();
  window.hlsInstance = null;
}
// 然后刷新页面
```

### 修复 3: 检查 MEGA 凭据
```bash
# .env.local
MEGA_EMAIL=your-email@example.com
MEGA_PASSWORD=your-password
```

### 修复 4: 降级到简单模式
临时禁用 HLS.js：
```tsx
// 在 bilibili-video-player.tsx
const isHLS = false; // src.includes('.m3u8');
```

## 📊 性能监控

### 监控指标

```javascript
// 添加到组件
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  const logStats = () => {
    console.log('📊 Video Stats:', {
      currentTime: video.currentTime,
      duration: video.duration,
      buffered: video.buffered.length > 0 
        ? `${video.buffered.start(0)} - ${video.buffered.end(0)}`
        : 'none',
      readyState: video.readyState,
      networkState: video.networkState,
      paused: video.paused,
      ended: video.ended,
    });
  };

  const interval = setInterval(logStats, 5000);
  return () => clearInterval(interval);
}, []);
```

### Ready State 含义
- 0: HAVE_NOTHING - 没有数据
- 1: HAVE_METADATA - 元数据已加载
- 2: HAVE_CURRENT_DATA - 当前帧数据可用
- 3: HAVE_FUTURE_DATA - 未来数据可用
- 4: HAVE_ENOUGH_DATA - 足够数据可播放

### Network State 含义
- 0: NETWORK_EMPTY - 未初始化
- 1: NETWORK_IDLE - 已选择资源但未使用网络
- 2: NETWORK_LOADING - 正在下载
- 3: NETWORK_NO_SOURCE - 未找到资源

## 🚨 紧急修复

如果视频完全无法播放，使用这个最小化版本：

```tsx
<video
  src="/api/attachments/123/stream"
  controls
  className="w-full h-full"
  preload="auto"
/>
```

这会使用浏览器原生控件，绕过所有自定义逻辑。

## 📞 获取帮助

如果以上都无法解决问题：

1. **收集信息：**
   - 浏览器版本
   - 控制台完整日志
   - Network 标签截图
   - 视频 URL 和大小

2. **测试端点：**
   ```
   /api/attachments/[id]/test-mega
   ```

3. **检查服务器日志：**
   - MEGA 连接日志
   - 流式传输日志
   - 错误堆栈

4. **提供复现步骤：**
   - 具体操作步骤
   - 预期行为
   - 实际行为
