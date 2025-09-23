# Studify TSVector 全文搜索系统部署指南

## 📋 概述

这是一个为Studify应用设计的完整全文搜索系统，基于PostgreSQL的tsvector功能，覆盖了项目中100+个数据库表的关键搜索需求。

## 🗂️ 文件结构

```
db/
├── tsvector_search_part1.sql      # 核心表搜索系统 (profiles, course, course_lesson, comments, classroom)
├── tsvector_search_part2.sql      # 扩展表搜索系统 (community, AI, tutoring, reviews等)
├── tsvector_search_functions.sql  # 统一搜索函数和API
├── tsvector_data_update.sql       # 现有数据批量更新脚本
└── TSVECTOR_DEPLOYMENT_GUIDE.md   # 部署指南 (本文件)

lib/langChain/tools/
└── database-search-tool.ts        # AI工具集成
```

## 🎯 系统覆盖的搜索功能

### 高优先级搜索表 (13个主要表)
1. **profiles** - 用户搜索 (姓名、邮箱、简介、角色、兴趣)
2. **course** - 课程搜索 (标题、描述、分类、标签、要求、目标)
3. **course_lesson** - 课程内容搜索 (标题、描述、转录文本)
4. **community_post** - 社区帖子搜索 (标题、内容)
5. **community_comment** - 评论搜索 (内容)
6. **classroom** - 教室搜索 (名称、描述、班级代码)
7. **community_group** - 社区组搜索 (名称、描述)
8. **ai_agent** - AI代理搜索 (名称、用途、配置)
9. **course_notes** - 学习笔记搜索 (内容、AI总结、标签)
10. **tutoring_tutors** - 家教搜索 (标题、资质、学科)
11. **course_reviews** - 课程评价搜索 (评论内容、评分)
12. **announcements** - 公告搜索 (标题、消息)
13. **course_quiz_question** - 试题搜索 (题目、解释、选项)

### 搜索权重策略
- **A权重** (最高): 标题、姓名、主要内容
- **B权重** (高): 描述、分类、重要属性
- **C权重** (中): 标签、需求、补充信息
- **D权重** (低): 状态、类型、元数据

## 🚀 部署步骤

### 第一步：安装必要扩展
```sql
-- 确保PostgreSQL扩展已安装
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
```

### 第二步：部署核心搜索系统
按顺序执行以下SQL文件：

```bash
# 1. 部署核心表搜索功能
psql -d studify -f tsvector_search_part1.sql

# 2. 部署扩展表搜索功能
psql -d studify -f tsvector_search_part2.sql

# 3. 部署统一搜索函数
psql -d studify -f tsvector_search_functions.sql

# 4. 初始化现有数据
psql -d studify -f tsvector_data_update.sql
```

### 第三步：验证部署
运行验证查询检查系统状态：

```sql
-- 检查tsvector数据完整性
SELECT 
  'profiles' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN search_vector IS NOT NULL THEN 1 END) as with_search_vector
FROM profiles WHERE is_deleted = false

UNION ALL

SELECT 
  'course' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN search_vector IS NOT NULL THEN 1 END) as with_search_vector
FROM course WHERE is_deleted = false;
```

### 第四步：测试搜索功能
```sql
-- 测试通用搜索
SELECT table_name, title, rank, content_type
FROM universal_search('javascript programming', ARRAY['course', 'course_lesson'], 5)
ORDER BY rank DESC;

-- 测试用户搜索
SELECT display_name, role, rank
FROM search_users('math teacher', 'tutor', 3)
ORDER BY rank DESC;
```

## 🔧 AI工具集成

### 集成database-search-tool
1. 将 `database-search-tool.ts` 添加到你的LangChain工具集
2. 在工具注册中包含这个工具：

```typescript
import databaseSearchTool from '@/lib/langChain/tools/database-search-tool';

// 在你的工具数组中添加
const tools = [
  // ... 其他工具
  databaseSearchTool,
];
```

### AI工具使用示例
```typescript
// 通用搜索
const result = await databaseSearchTool.handler({
  query: "机器学习课程",
  searchType: "universal",
  maxResults: 10
});

// 用户搜索
const users = await databaseSearchTool.handler({
  query: "数学老师",
  searchType: "users",
  filters: { role: "tutor" }
});

// 课程搜索
const courses = await databaseSearchTool.handler({
  query: "web开发",
  searchType: "courses",
  filters: { level: "beginner" }
});
```

## 📊 性能优化

### 自动维护的GIN索引
系统已为所有搜索表创建GIN索引，包括：
- `idx_profiles_search_vector`
- `idx_course_search_vector` 
- `idx_course_lesson_search_vector`
- 等等...

### 触发器自动更新
所有表都配置了触发器，在INSERT/UPDATE时自动维护tsvector：
- `profiles_search_vector_trigger`
- `course_search_vector_trigger`
- 等等...

## 🔍 搜索分析

### 搜索日志
系统会自动记录搜索查询到 `audit_log` 表：
```sql
SELECT 
  action,
  meta->>'query' as search_query,
  meta->>'results_count' as results_count,
  created_at
FROM audit_log 
WHERE action = 'search'
ORDER BY created_at DESC
LIMIT 10;
```

### 常用搜索统计
```sql
SELECT 
  meta->>'query' as query,
  meta->>'search_type' as search_type,
  COUNT(*) as search_count,
  AVG((meta->>'results_count')::int) as avg_results
FROM audit_log 
WHERE action = 'search'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY meta->>'query', meta->>'search_type'
ORDER BY search_count DESC
LIMIT 20;
```

## 🛠️ 维护和监控

### 定期维护任务
```sql
-- 重建搜索索引 (如需要)
REINDEX INDEX CONCURRENTLY idx_profiles_search_vector;
REINDEX INDEX CONCURRENTLY idx_course_search_vector;

-- 更新表统计信息
ANALYZE profiles;
ANALYZE course;
ANALYZE course_lesson;
```

### 搜索性能监控
```sql
-- 检查慢查询
SELECT 
  query,
  mean_time,
  calls,
  total_time
FROM pg_stat_statements 
WHERE query LIKE '%search_vector%'
ORDER BY total_time DESC
LIMIT 10;
```

## 🔄 扩展新表

如需为新表添加搜索功能，按以下模式：

```sql
-- 1. 添加tsvector列
ALTER TABLE new_table ADD COLUMN search_vector tsvector;

-- 2. 创建更新函数
CREATE OR REPLACE FUNCTION update_new_table_search_vector()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$;

-- 3. 创建触发器
CREATE TRIGGER new_table_search_vector_trigger
  BEFORE INSERT OR UPDATE ON new_table
  FOR EACH ROW EXECUTE FUNCTION update_new_table_search_vector();

-- 4. 创建索引
CREATE INDEX idx_new_table_search_vector 
ON new_table USING gin(search_vector);

-- 5. 更新现有数据
UPDATE new_table SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(content, '')), 'B');
```

## ⚠️ 注意事项

1. **数据库大小**: tsvector会增加数据库大小约10-30%
2. **写入性能**: 触发器会略微影响INSERT/UPDATE性能
3. **索引维护**: GIN索引需要定期维护
4. **多语言**: 当前配置为英文，如需中文搜索请调整为 `'simple'` 或安装中文词典
5. **权限控制**: 搜索结果会根据可见性和删除状态过滤

## 🎉 部署完成

部署完成后，你的Studify应用将具备：

✅ **全数据库搜索能力** - 覆盖用户、课程、社区、AI等所有内容  
✅ **智能相关性排序** - 基于tsvector权重的智能排序  
✅ **AI工具集成** - 可供AI助手调用的强大搜索工具  
✅ **实时更新** - 自动维护的搜索索引  
✅ **性能优化** - GIN索引确保快速搜索  
✅ **搜索分析** - 内置搜索日志和统计  

现在AI助手可以帮助用户在Studify平台上搜索任何内容！🚀
