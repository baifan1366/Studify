# 全文搜索组件设置指南

## 🚀 快速开始

全文搜索组件已经集成到Dashboard中，可以立即使用！

## 📋 待办事项

### 1. 添加翻译键到 `messages/en.json`

**需要添加到 `Dashboard` 部分：**
```json
"Dashboard": {
  // ... existing keys ...
  "search_title": "Quick Search",
  "search_description": "Search across courses, lessons, posts, users, and more",  
  "search_placeholder": "Search courses, lessons, posts, users..."
}
```

**需要添加新的 `UniversalSearch` 部分：**
```json
"UniversalSearch": {
  "placeholder": "Search courses, lessons, posts, users...",
  "searching": "Searching...",
  "search_error": "Search failed. Please try again.",
  "recent_searches": "Recent Searches", 
  "clear": "Clear",
  "no_results": "No results found",
  "results_count": "{count} results",
  "types": "types",
  "relevance": "relevance",
  "view_all": "View {count} more results",
  "filters": "Filters",
  "context": "Context", 
  "content_types": "Content Types",
  "clear_filters": "Clear Filters"
}
```

### 2. 数据库设置验证

确保以下SQL文件已经在数据库中执行：
- `db/tsvector_search_functions.sql`
- `db/tsvector_search_functions_extended.sql`
- `db/tsvector_data_update.sql`

### 3. 环境变量

确保Supabase环境变量配置正确：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🧪 测试组件

### 方法1: 使用演示页面
创建一个临时页面来测试搜索功能：

```tsx
// app/test-search/page.tsx
import SearchDemo from '@/components/search/search-demo';

export default function TestSearchPage() {
  return <SearchDemo />;
}
```

访问 `/test-search` 来测试组件功能。

### 方法2: 直接在Dashboard使用
搜索组件已经集成在Dashboard中，登录后即可在首页使用。

## 🔍 功能验证清单

- [ ] 基本搜索功能工作正常
- [ ] 搜索结果正确显示
- [ ] 过滤器功能正常
- [ ] 搜索历史保存和显示
- [ ] 点击结果正确导航
- [ ] 加载状态显示正确
- [ ] 错误处理工作正常
- [ ] 翻译显示正确

## 🛠️ 故障排除

### 搜索无结果
1. 检查数据库中是否有数据
2. 确认搜索函数已正确安装
3. 检查API端点是否返回数据

### TypeScript错误
1. 确认所有导入路径正确
2. 检查接口定义是否匹配
3. 重启TypeScript服务器

### 翻译显示问题
1. 添加翻译键到messages/en.json
2. 或使用临时翻译文件（已创建）

### API错误
1. 检查控制台错误信息
2. 确认数据库连接正常
3. 验证Supabase权限设置

## 📝 使用示例

### 基本搜索
```tsx
import UniversalSearch from '@/components/search/universal-search';

<UniversalSearch
  placeholder="Search anything..."
  onResultClick={(result) => {
    console.log('Result clicked:', result);
  }}
/>
```

### 高级搜索
```tsx
import { useAdvancedSearch } from '@/hooks/search/use-universal-search';

const {
  query,
  setQuery,
  searchResults,
  selectedTables,
  setSelectedTables,
  context,
  setContext
} = useAdvancedSearch();
```

## 🔗 相关文件

- **组件**: `components/search/universal-search.tsx`
- **Hooks**: `hooks/search/use-universal-search.ts`
- **API**: `app/api/search/universal/route.ts`
- **类型**: `hooks/search/use-universal-search.ts#SearchResult`
- **演示**: `components/search/search-demo.tsx`
- **临时翻译**: `components/search/search-translations.ts`

## 🎯 下一步优化

1. **性能优化**
   - 实现搜索结果缓存
   - 添加搜索建议预加载

2. **功能增强**
   - 添加键盘导航
   - 实现搜索结果高亮
   - 添加搜索分析统计

3. **用户体验**
   - 优化移动端界面
   - 添加搜索快捷键
   - 实现搜索结果排序选项

4. **国际化**
   - 添加多语言搜索支持
   - 优化翻译文本

## ✅ 完成状态

- [x] API端点实现
- [x] React组件创建
- [x] Hooks集成
- [x] Dashboard集成
- [x] 类型定义
- [x] 错误处理
- [x] 加载状态
- [x] 响应式设计
- [ ] 翻译键添加
- [ ] 生产环境测试

搜索组件已准备就绪，只需添加翻译键即可完全正常使用！
