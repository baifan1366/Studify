// interface/community/recommendation-interface.ts
import { Post } from "./post-interface";
import { Group } from "./group-interface";
import { Hashtag } from "./post-interface";

export interface RecommendedPost extends Omit<Post, 'comments'> {
  // Recommendation specific fields
  recommendation_score: number;       // 0-100 综合推荐分数
  recommendation_reasons: string[];   // 推荐理由，最多 2-3 条
  
  // Enhanced metadata for recommendations
  interaction_score?: number;         // 互动热度分数
  freshness_score?: number;          // 新鲜度分数
  relevance_score?: number;          // 相关性分数
  
  // Additional computed fields
  total_reactions?: number;           // 总反应数
  recent_activity?: boolean;          // 是否为近期活跃内容
}

export interface CommunityRecommendations {
  recommendations: RecommendedPost[];
  categories: {
    from_groups: RecommendedPost[];      // 来自用户加入的群组
    authors_you_like: RecommendedPost[]; // 用户喜欢的作者
    trending: RecommendedPost[];         // 热门内容
    for_you: RecommendedPost[];         // 个性化推荐
  };
  debug_info?: {
    user_profile_id: number;
    user_interests: string[];
    user_groups: number[];
    candidate_posts_count: number;
    processing_time_ms: number;
    scoring_breakdown: {
      interest_matches: number;
      group_matches: number;
      author_affinity: number;
      trending_boost: number;
      query_matches?: number;
      hashtag_matches?: number;
      // Hybrid scoring debug info
      taste_vector_posts?: number;
      embedding_search_results?: number;
      rules_weight?: number;
      embedding_weight?: number;
      avg_rules_score?: number;
      avg_embedding_score?: number;
      avg_hybrid_score?: number;
    };
  };
}

export interface UserActivitySignals {
  // 用户行为信号
  liked_posts: number[];              // 点赞过的帖子 ID
  commented_posts: number[];          // 评论过的帖子 ID
  authored_posts: number[];           // 发布的帖子 ID
  frequent_authors: number[];         // 经常互动的作者 ID
  joined_groups: number[];            // 加入的群组 ID
  used_hashtags: string[];           // 使用过的标签
  interests: string[];               // 个人兴趣
}

export interface PostScoringFactors {
  // 打分因子
  interest_overlap: number;          // 兴趣重叠度 (0-1)
  group_membership: boolean;         // 是否来自用户群组
  author_affinity: number;          // 作者亲和度 (0-1)
  hashtag_relevance: number;        // 标签相关性 (0-1)
  interaction_count: number;        // 互动总数
  freshness_factor: number;         // 新鲜度因子 (0-1)
  semantic_similarity?: number;     // 语义相似度 (0-1, 可选)
  // Hybrid scoring components
  rules_based_score?: number;       // 规则基础分数 (0-1, 归一化后)
  embedding_score?: number;         // 嵌入相似度分数 (0-1)
  hybrid_score?: number;            // 混合分数 (0-1)
}

export interface RecommendationFilters {
  limit?: number;                    // 返回数量限制，默认 20
  since?: string;                    // 时间筛选，ISO 字符串
  groups_only?: boolean;             // 仅推荐所在群组内容
  exclude_own_posts?: boolean;       // 排除自己的帖子
  min_score?: number;               // 最低推荐分数
  q?: string;                       // 搜索关键词（标题/正文/标签）
  hashtags?: string[];              // 指定标签过滤（名称数组）
}
