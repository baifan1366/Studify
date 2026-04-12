# 性能优化指南

## 已实施的优化

### 1. Providers 优化
- ✅ 使用 `requestIdleCallback` 延迟加载翻译文件
- ✅ 用加载骨架屏替代 `null` 返回，避免布局偏移
- ✅ 使用 `useMemo` 缓存内容
- ✅ 动态导入 Toaster 组件，减少初始包大小
- ✅ 使用 Suspense 包裹非关键组件

### 2. 字体优化
- ✅ 将 `font-display` 从 `swap` 改为 `optional`，减少布局偏移
- ✅ 在 HTML head 中预加载关键字体
- ✅ 添加 CORS 头部支持字体缓存

### 3. 通知系统优化
- ✅ 延迟初始化通知系统到空闲时间
- ✅ 使用动态导入减少初始包大小

### 4. Next.js 配置优化
- ✅ 启用 `optimizePackageImports` 自动优化大型库
- ✅ 生产环境移除 console.log（保留 error 和 warn）
- ✅ 优化字体文件缓存策略

## 进一步优化建议

### 1. 代码分割
```typescript
// 对大型组件使用动态导入
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false, // 如果不需要 SSR
});
```

### 2. 图片优化
- 使用 Next.js Image 组件
- 启用 WebP 格式
- 实施懒加载

### 3. API 路由优化
- 实施 API 响应缓存
- 使用 Edge Runtime 加速响应
- 添加请求去重

### 4. React Query 优化
```typescript
// 在 ReactQueryProvider 中配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1分钟
      gcTime: 5 * 60 * 1000, // 5分钟
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### 5. 减少客户端 JavaScript
- 将更多组件改为服务端组件
- 使用 Server Actions 替代客户端 API 调用
- 延迟加载非关键功能

### 6. 数据库查询优化
- 添加适当的索引
- 使用连接池
- 实施查询缓存

### 7. 监控和分析
```bash
# 分析包大小
npm run build -- --analyze

# 使用 Lighthouse CI
npm install -g @lhci/cli
lhci autorun
```

## 性能指标目标

- **LCP**: < 2.5s (当前 3.06s)
- **INP**: < 200ms (当前 7,176ms - 需要大幅改进)
- **CLS**: < 0.1 (当前 0.01 - 已达标)
- **FCP**: < 1.8s
- **TTFB**: < 600ms

## 测试命令

```bash
# 本地性能测试
npm run build
npm run start

# 使用 Chrome DevTools
# 1. 打开 DevTools
# 2. 切换到 Lighthouse 标签
# 3. 选择 Performance 模式
# 4. 点击 Analyze page load
```

## INP 优化重点

INP 7,176ms 是最严重的问题，需要：

1. **减少 JavaScript 执行时间**
   - 使用 React Profiler 找出慢组件
   - 避免在渲染期间进行复杂计算
   - 使用 Web Workers 处理重计算

2. **优化事件处理器**
   - 使用防抖和节流
   - 避免在事件处理器中进行同步的重计算
   - 使用 `startTransition` 标记非紧急更新

3. **减少 Provider 嵌套**
   - 考虑合并相关的 Context
   - 使用 `useMemo` 缓存 Context 值

4. **代码分割**
   - 按路由分割代码
   - 延迟加载非关键功能
