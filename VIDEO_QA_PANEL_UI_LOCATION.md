# VideoQAPanel UI 显示位置说明

## 🎯 UI 显示位置

VideoQAPanel 是一个**固定定位的侧边面板**，显示在视频播放器的右侧。

### 视觉位置
```
┌─────────────────────────────────────────────────────────┐
│                    页面顶部导航栏                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────┐  ┌──────────────┐   │
│  │                              │  │              │   │
│  │                              │  │  VideoQA     │   │
│  │      视频播放器               │  │   Panel      │   │
│  │   (BilibiliVideoPlayer)      │  │              │   │
│  │                              │  │  (侧边面板)   │   │
│  │                              │  │              │   │
│  │  ┌────────────────────────┐  │  │  [问题输入]  │   │
│  │  │  [播放] [音量] [设置]  │  │  │              │   │
│  │  │  [AI按钮] ← 触发按钮   │  │  │  [AI回答]    │   │
│  │  └────────────────────────┘  │  │              │   │
│  └──────────────────────────────┘  └──────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### CSS 定位
```css
position: fixed;
right: 16px;      /* right-4 */
top: 80px;        /* top-20 */
width: 320px;     /* w-80 */
max-height: 500px;
z-index: 50;
```

---

## 🔘 触发方式

### 1. 点击视频控制栏的 AI 按钮

**位置**: 视频播放器底部控制栏，右侧区域

**代码位置**: `components/video/bilibili-video-player.tsx` (第 2169-2177 行)

```typescript
{/* AI QA Button */}
{lessonId && (
  <button
    onClick={() => qaPanel.openPanel()}
    className={`text-white hover:text-purple-400 transition-colors ${
      qaPanel.isOpen ? "text-purple-400" : ""
    }`}
    title={t("ask_ai")}
  >
    <Bot size={20} />  {/* 机器人图标 */}
  </button>
)}
```

**图标**: `<Bot>` (机器人图标，来自 lucide-react)
**颜色**: 
- 默认: 白色
- 悬停: 紫色 (purple-400)
- 激活: 紫色 (panel 打开时)

### 2. 键盘快捷键 `Q`

**代码位置**: `components/video/bilibili-video-player.tsx` (第 1456-1460 行)

```typescript
case "KeyQ":
  e.preventDefault();
  if (lessonId) {
    qaPanel.openPanel();
  }
  break;
```

**使用方法**: 在视频播放时按 `Q` 键

---

## 🎨 UI 组件结构

### 面板布局

```
┌─────────────────────────────────┐
│ 📱 Header                       │
│  [MessageCircle] Ask AI  [X]    │
├─────────────────────────────────┤
│ ⏰ Current Time Context         │
│  Current time: 2:35             │
├─────────────────────────────────┤
│                                 │
│ 📝 Content Area (可滚动)        │
│                                 │
│  ┌─ 问题输入模式 ─────────────┐ │
│  │                            │ │
│  │  [问题输入框]              │ │
│  │                            │ │
│  │  [Ask 按钮]                │ │
│  │                            │ │
│  │  Quick Questions:          │ │
│  │  • Explain this concept    │ │
│  │  • What is key point       │ │
│  │  • Give example            │ │
│  │  • Related practice        │ │
│  └────────────────────────────┘ │
│                                 │
│  或                             │
│                                 │
│  ┌─ 答案显示模式 ─────────────┐ │
│  │                            │ │
│  │  Your Question:            │ │
│  │  [问题内容]                │ │
│  │                            │ │
│  │  💡 AI Answer:             │ │
│  │  [AI 回答内容]             │ │
│  │                            │ │
│  │  ⏰ Related Video Segments:│ │
│  │  #1 [2:15-2:45] [跳转]    │ │
│  │  #2 [3:20-3:50] [跳转]    │ │
│  │                            │ │
│  │  📚 Course Context         │ │
│  │                            │ │
│  │  [Save as Note]            │ │
│  │  [Ask Another] [Close]     │ │
│  └────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

---

## 🎭 动画效果

### 进入动画
```typescript
initial={{ opacity: 0, x: 300 }}    // 从右侧 300px 外开始
animate={{ opacity: 1, x: 0 }}      // 滑入到正常位置
transition={{ duration: 0.3 }}      // 0.3 秒动画
```

**效果**: 从右侧滑入

### 退出动画
```typescript
exit={{ opacity: 0, x: 300 }}       // 滑出到右侧
```

**效果**: 向右侧滑出

---

## 📍 在页面中的实际位置

### 渲染位置
**文件**: `components/video/bilibili-video-player.tsx` (第 3369-3381 行)

```typescript
{/* AI QA Panel */}
{lessonId && (
  <VideoQAPanel
    lessonId={lessonId}
    currentTime={currentTime}
    isOpen={qaPanel.isOpen}
    onClose={qaPanel.closePanel}
    onSeekTo={(time) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    }}
  />
)}
```

**条件**: 只有当 `lessonId` 存在时才渲染

---

## 🎯 功能特性

### 1. 问题输入区域
- **多行文本框**: 3 行高度
- **快捷键**: Enter 提交，Shift+Enter 换行
- **占位符**: 提示用户输入问题
- **禁用状态**: 加载时禁用输入

### 2. 快速问题按钮
预设的常见问题，点击自动填充：
- "Explain this concept"
- "What is key point"
- "Give example"
- "Related practice"

### 3. 答案显示区域
- **问题回显**: 显示用户的问题
- **AI 回答**: 绿色背景，带灯泡图标
- **相关视频片段**: 
  - 显示时间戳
  - 可点击跳转
  - 显示相关文本
- **课程上下文**: 显示课程/模块/课节信息

### 4. 操作按钮
- **Save as Note**: 保存问答为笔记
- **Ask Another Question**: 开始新问题
- **Close**: 关闭面板

---

## 🔄 状态管理

### Hook: `useVideoQAPanel()`
**文件**: `hooks/video/use-video-qa.ts`

```typescript
export function useVideoQAPanel() {
  const [isOpen, setIsOpen] = useState(false);
  
  return {
    isOpen,
    openPanel: () => setIsOpen(true),
    closePanel: () => setIsOpen(false),
    togglePanel: () => setIsOpen(!isOpen)
  };
}
```

### 在 BilibiliVideoPlayer 中使用
```typescript
const qaPanel = useVideoQAPanel();

// 打开面板
qaPanel.openPanel();

// 关闭面板
qaPanel.closePanel();

// 检查状态
qaPanel.isOpen
```

---

## 🎨 样式特点

### 颜色方案
- **背景**: `bg-slate-800` (深灰色)
- **边框**: `border-slate-600`
- **问题区域**: `bg-slate-700`
- **答案区域**: `bg-green-800` (绿色)
- **按钮**: 
  - 主按钮: `bg-blue-600`
  - 保存按钮: `bg-purple-600`
  - 关闭按钮: `bg-slate-600`

### 圆角
- **面板**: `rounded-2xl` (大圆角)
- **内部元素**: `rounded-xl` (中等圆角)
- **按钮**: `rounded-xl` 或 `rounded-lg`

### 阴影
- **面板**: `shadow-xl` (大阴影)

---

## ⚠️ 当前状态

### ❌ 已废弃但未删除

虽然 VideoQAPanel 的 UI 和触发机制都存在，但它已经被新的 **VideoAIAssistant** 系统替代：

**对比**:

| 特性 | VideoQAPanel (旧) | VideoAIAssistant (新) |
|------|------------------|---------------------|
| 位置 | 固定在视频右侧 | Tab 页面中 |
| API | `/api/video/qa` ❌ | `/api/ai/video-assistant` ✅ |
| 响应方式 | 一次性返回 | 流式响应 ✅ |
| RAG 支持 | 无 | 完整 RAG ✅ |
| 上下文感知 | 基础 | 高级 (4 数据源) ✅ |
| 触发方式 | 按钮 + 快捷键 Q | Tab 切换 |

### 实际使用情况

**VideoQAPanel**: 
- ✅ UI 代码存在
- ✅ 触发按钮存在
- ✅ 快捷键存在
- ❌ 但功能已被替代
- ❌ 建议删除

**VideoAIAssistant**:
- ✅ 当前主要使用
- ✅ 功能更强大
- ✅ 用户体验更好

---

## 🧹 清理建议

### 应该删除的部分

1. **组件文件**:
   ```bash
   rm components/video/video-qa-panel.tsx
   ```

2. **触发按钮** (在 BilibiliVideoPlayer 中):
   ```typescript
   // 删除第 2169-2177 行
   {/* AI QA Button */}
   {lessonId && (
     <button onClick={() => qaPanel.openPanel()}>
       <Bot size={20} />
     </button>
   )}
   ```

3. **快捷键** (在 BilibiliVideoPlayer 中):
   ```typescript
   // 删除第 1456-1460 行
   case "KeyQ":
     e.preventDefault();
     if (lessonId) {
       qaPanel.openPanel();
     }
     break;
   ```

4. **面板渲染** (在 BilibiliVideoPlayer 中):
   ```typescript
   // 删除第 3369-3381 行
   {lessonId && (
     <VideoQAPanel ... />
   )}
   ```

5. **Hook 调用**:
   ```typescript
   // 删除
   const qaPanel = useVideoQAPanel();
   ```

### 保留的部分

- ✅ VideoAIAssistant 组件
- ✅ useStreamingVideoAI hook
- ✅ /api/ai/video-assistant API

---

## 📸 视觉示例

### 触发按钮位置
```
视频播放器控制栏 (底部):
┌────────────────────────────────────────────────┐
│ [▶️] ━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                │
│ [⏮️] [▶️] [⏭️]  2:35 / 10:45  [🔊] [⚙️] [🤖] [📚] [🔲] │
│                                      ↑         │
│                                   AI 按钮      │
└────────────────────────────────────────────────┘
```

### 面板打开后
```
┌──────────────────────────────┐  ┌──────────────┐
│                              │  │ 💬 Ask AI  ✕ │
│      视频播放器               │  ├──────────────┤
│                              │  │ ⏰ Time: 2:35│
│                              │  ├──────────────┤
│                              │  │              │
│                              │  │ [问题输入框] │
│                              │  │              │
│                              │  │ [Ask 按钮]   │
│                              │  │              │
│                              │  │ Quick Q:     │
│                              │  │ • Explain... │
│                              │  │ • What is... │
└──────────────────────────────┘  └──────────────┘
```

---

## 总结

VideoQAPanel 是一个**固定定位的侧边面板**，通过以下方式触发：
1. 点击视频控制栏的 **机器人图标** (Bot icon)
2. 按键盘快捷键 **Q**

面板会从右侧滑入，显示在视频播放器旁边，提供问答功能。

但是，这个组件已经被 **VideoAIAssistant** 替代，建议删除以避免混淆。
