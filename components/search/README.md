# Universal Search Component

这是一个完整的全文搜索组件，集成了Studify的TSVector搜索功能。

## 🎯 功能特性

### 📊 数据库搜索能力
- **全文搜索**: 使用PostgreSQL TSVector进行高性能搜索
- **多表搜索**: 支持11种内容类型搜索
  - 课程 (course)
  - 课程章节 (lesson) 
  - 社区帖子 (post)
  - 评论 (comment)
  - 用户 (user)
  - 课堂 (classroom)
  - 群组 (group)
  - 笔记 (note)
  - 测验 (quiz)
  - 导师 (tutor)
  - 公告 (announcement)

### 🔍 智能搜索功能
- **实时搜索建议**: 输入时显示搜索建议
- **搜索历史**: 保存最近10次搜索记录
- **高级过滤**: 按内容类型和上下文过滤
- **相关度排序**: 按搜索相关度智能排序
- **上下文感知**: 支持学习、教学、管理等不同上下文

### 🎨 用户界面
- **现代设计**: Glass-morphism风格，与应用整体设计一致
- **响应式布局**: 支持桌面和移动设备
- **动画效果**: 流畅的过渡动画和加载状态
- **黑暗主题**: 完整的暗色主题支持

## 🚀 使用方法

### 1. 基本使用

```tsx
import UniversalSearch from '@/components/search/universal-search';

function MyComponent() {
  const handleResultClick = (result) => {
    // 处理搜索结果点击
    console.log('Selected:', result);
  };

  return (
    <UniversalSearch
      placeholder="搜索课程、用户、帖子..."
      onResultClick={handleResultClick}
    />
  );
}
```

### 2. 在Dashboard中集成

```tsx
// 已集成在dashboard-content.tsx中
<UniversalSearch
  placeholder="Search courses, lessons, posts, users..."
  onResultClick={handleSearchResult}
  className="max-w-2xl"
/>
```

### 3. 高级搜索Hook

```tsx
import { useAdvancedSearch } from '@/hooks/search/use-universal-search';

function AdvancedSearchComponent() {
  const {
    query,
    setQuery,
    searchResults,
    selectedTables,
    setSelectedTables,
    context,
    setContext,
    isLoading,
    error
  } = useAdvancedSearch();

  return (
    <div>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="输入搜索词..."
      />
      
      {searchResults.data && (
        <div>
          {searchResults.data.results.map(result => (
            <div key={result.record_id}>
              <h3>{result.title}</h3>
              <p>{result.snippet}</p>
              <span>相关度: {(result.rank * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 🔧 API端点

### GET /api/search/universal

搜索所有内容类型

**参数:**
- `q` (string): 搜索查询
- `tables` (string[]): 要搜索的表名数组
- `limit` (number): 最大结果数量 (默认: 20)
- `min_rank` (number): 最小相关度 (默认: 0.1)
- `context` (string): 搜索上下文 ('general' | 'learning' | 'teaching' | 'admin')
- `user_role` (string): 用户角色 ('student' | 'tutor' | 'admin')

**响应:**
```json
{
  "success": true,
  "query": "JavaScript",
  "results": [
    {
      "table_name": "course",
      "record_id": 123,
      "title": "JavaScript基础课程",
      "snippet": "学习JavaScript编程语言的基础知识...",
      "rank": 0.85,
      "content_type": "course",
      "created_at": "2024-01-01T00:00:00Z",
      "additional_data": {
        "slug": "javascript-basics",
        "category": "programming",
        "level": "beginner"
      }
    }
  ],
  "grouped_results": {
    "course": [...],
    "lesson": [...],
    "post": [...]
  },
  "stats": {
    "total_results": 25,
    "content_types": 3,
    "max_rank": 0.95,
    "search_time": 1640995200000
  },
  "context": "learning",
  "user_role": "student"
}
```

### POST /api/search/universal

记录搜索查询用于分析

**请求体:**
```json
{
  "query": "JavaScript",
  "search_type": "universal",
  "results_count": 25,
  "user_id": 123
}
```

## 📦 数据库函数

使用的PostgreSQL函数：
- `universal_search_enhanced()`: 增强版通用搜索
- `smart_contextual_search()`: 智能上下文搜索
- `log_search_query()`: 搜索日志记录

## 🎨 样式定制

组件使用Tailwind CSS，支持以下自定义：

```tsx
<UniversalSearch
  className="custom-search-styles"
  placeholder="自定义占位符"
  onResultClick={handleClick}
/>
```

## 🔄 搜索结果导航

组件自动处理不同内容类型的导航：

- **课程**: `/course/{slug}`
- **课程章节**: `/course/lesson/{id}`
- **社区帖子**: `/community/{group}/posts/{slug}`
- **用户**: `/profile/{public_id}`
- **课堂**: `/classroom/{public_id}`
- **群组**: `/community/{slug}`
- **笔记**: `/learning/notes/{id}`
- **测验**: `/community/quizzes/{slug}`
- **导师**: `/tutoring/tutors/{public_id}`
- **公告**: `/announcements/{id}`

## 📋 待办事项

- [ ] 将临时翻译添加到 `messages/en.json`
- [ ] 添加搜索分析和统计功能
- [ ] 实现搜索结果高亮显示
- [ ] 添加键盘导航支持
- [ ] 优化移动端用户体验

## 🐛 已知问题

- 翻译文件编辑被禁止，目前使用临时翻译文件
- 需要手动添加翻译键到主翻译文件中

## 📖 相关文档

- [搜索SQL函数](../../db/tsvector_search_functions.sql)
- [扩展搜索函数](../../db/tsvector_search_functions_extended.sql)
- [搜索Hooks](../../hooks/search/use-universal-search.ts)
