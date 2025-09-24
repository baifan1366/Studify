# 社区推荐系统实现指南

## 🎯 功能概述

成功实现了基于embedding向量相似度的社区帖子和群组推荐系统，使用**40%的embedding权重**结合其他多种因子进行个性化推荐。

## 📁 创建的文件

### 1. 核心推荐函数
- **`course-recommendation-tool.ts`** (扩展版)
  - `generateCommunityPostRecommendations()` - 社区帖子推荐
  - `generateCommunityGroupRecommendations()` - 社区群组推荐
  - `getUserEmbeddingVectors()` - 获取用户embedding向量

### 2. AI工具集成
- **`community-recommendation-tool.ts`**
  - `communityPostRecommendationTool` - 帖子推荐AI工具
  - `communityGroupRecommendationTool` - 群组推荐AI工具

### 3. 向量相似度计算
- **`utils/embedding/vector-similarity.ts`**
  - `cosineSimilarity()` - 余弦相似度计算
  - `calculateDualEmbeddingSimilarity()` - 双模型embedding相似度
  - `parseEmbeddingVector()` - 向量解析工具

## 🧮 推荐算法权重分配

### 📝 社区帖子推荐 (100%权重分配)

1. **🤖 Embedding相似度 (40%)**
   - E5-Small + BGE-M3 双模型向量相似度
   - 基于用户兴趣和内容语义匹配
   - 使用真实的余弦相似度计算

2. **⏰ 时效性 (20%)**
   - 基于帖子发布时间的衰减函数
   - 30天内的帖子获得更高权重
   - 3天内的帖子标记为"最新帖子"

3. **👥 群组热度 (20%)**
   - 基于群组成员数量和活跃度
   - 50+成员的群组获得热度加成
   - 考虑群组可见性和访问权限

4. **📄 内容质量 (10%)**
   - 基于帖子长度和内容丰富度
   - 200+字符的帖子标记为"详细内容"
   - 考虑标题和正文的完整性

5. **🎯 兴趣匹配 (10%)**
   - 基于文本的关键词匹配
   - 用户兴趣标签与帖子内容匹配
   - 补充embedding相似度的文本匹配

### 🏘️ 社区群组推荐 (100%权重分配)

1. **🤖 Embedding相似度 (40%)**
   - 群组描述与用户兴趣的语义匹配
   - 双模型embedding向量相似度计算

2. **📈 群组活跃度 (25%)**
   - 成员数量权重 (15%)：100成员归一化
   - 帖子数量权重 (10%)：50帖子归一化
   - 20+成员群组标记为"活跃社区"
   - 10+帖子群组标记为"定期讨论"

3. **🎯 兴趣匹配 (20%)**
   - 群组名称和描述的文本匹配
   - 用户学习领域与群组主题匹配

4. **✨ 群组质量 (15%)**
   - 基于群组描述的完整性和长度
   - 100+字符描述标记为"组织完善"
   - 考虑群组设置和管理质量

## 🛠️ 技术实现细节

### Embedding向量处理
```typescript
// 双模型相似度计算
const similarity = calculateDualEmbeddingSimilarity(
  userEmbedding,    // 用户profile embedding
  contentEmbedding, // 帖子/群组embedding
  0.4,              // E5-Small权重
  0.6               // BGE-M3权重
);
```

### 数据库查询优化
```sql
-- 帖子推荐查询
SELECT post.*, embedding.* FROM community_post post
LEFT JOIN embeddings embedding ON (
  embedding.content_type = 'post' 
  AND embedding.content_id = post.id
)
WHERE post.is_deleted = false
ORDER BY post.created_at DESC;
```

### AI工具参数配置
```typescript
// 帖子推荐工具参数
{
  maxResults: 1-20,           // 推荐数量
  excludeOwnPosts: boolean,   // 排除自己的帖子
  groupId: number,            // 特定群组筛选
  includePrivateGroups: boolean // 包含私有群组
}

// 群组推荐工具参数  
{
  maxResults: 1-20,           // 推荐数量
  excludeJoinedGroups: boolean, // 排除已加入群组
  visibility: 'public'|'private' // 可见性筛选
}
```

## 🎮 使用示例

### AI工具调用
```typescript
// 获取帖子推荐
const postRecommendations = await communityPostRecommendationTool.handler({
  maxResults: 10,
  excludeOwnPosts: true,
  includePrivateGroups: false
}, { userId: 123 });

// 获取群组推荐
const groupRecommendations = await communityGroupRecommendationTool.handler({
  maxResults: 5,
  excludeJoinedGroups: true,
  visibility: 'public'
}, { userId: 123 });
```

### 返回数据格式
```typescript
// 帖子推荐结果
{
  success: true,
  userId: 123,
  totalRecommendations: 10,
  recommendations: [{
    id: 456,
    title: "如何学习JavaScript",
    content: "这是一篇关于JavaScript学习的详细指南...",
    score: 0.87,
    embeddingSimilarity: 0.73,
    reasons: ["Similar to your interests based on content analysis", "Recent post"]
  }]
}

// 群组推荐结果
{
  success: true,
  userId: 123,
  recommendations: [{
    id: 789,
    name: "前端开发学习小组",
    description: "专注于前端技术讨论和学习...",
    memberCount: 156,
    postCount: 23,
    score: 0.92,
    embeddingSimilarity: 0.81,
    reasons: ["Matches your learning interests and activity", "Active community with 156 members"]
  }]
}
```

## 🚀 部署和集成

### 1. 工具注册
```typescript
import communityRecommendationTools from '@/lib/langChain/tools/community-recommendation-tool';

const allTools = [
  // ... 现有工具
  ...communityRecommendationTools
];
```

### 2. 数据库准备
确保以下表有对应的embedding数据：
- `embeddings` 表包含 `content_type = 'post'` 的记录
- `embeddings` 表包含 `content_type = 'community_group'` 的记录
- `embeddings` 表包含 `content_type = 'profile'` 的用户记录

### 3. 权限配置
- 确保用户只能访问有权限的群组内容
- 私有群组内容需要成员权限验证
- 已删除的帖子和群组自动排除

## 🎉 功能特性

✅ **智能相似度匹配** - 40%权重基于embedding向量  
✅ **多因子综合评分** - 时效性、热度、质量、兴趣匹配  
✅ **权限感知推荐** - 自动处理私有内容访问控制  
✅ **个性化解释** - 每个推荐都附带推荐理由  
✅ **高性能查询** - 批量embedding查询优化  
✅ **TypeScript类型安全** - 完整的类型定义和验证  
✅ **AI工具集成** - 直接供AI助手调用  

现在你的AI助手可以为用户提供高质量的个性化社区内容推荐了！🎊
