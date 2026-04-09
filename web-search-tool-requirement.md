# Requirements Document

## Introduction

本功能为 Studify 教育平台的 LangChain Agent 系统集成 Google Web Search 能力，使 AI 助手能够在回答问题时获取最新的互联网信息。这将增强 AI 在处理时效性问题、最新技术资讯、以及课程内容之外的通用知识查询时的能力。

## Glossary

- LangChain Agent: 基于 LangChain 框架的 AI 代理系统，能够使用工具（Tools）来增强回答能力
- Tool: LangChain 中的工具接口，Agent 可以调用工具来执行特定任务（如搜索、计算等）
- Google Custom Search API: Google 提供的可编程搜索 API，允许应用程序执行网络搜索
- CSE (Custom Search Engine): Google 自定义搜索引擎，需要配置以搜索整个互联网
- Search Tool: 现有的语义搜索工具，用于搜索课程内容和视频片段
- Web Search Tool: 新增的网络搜索工具，用于搜索互联网内容
- Hybrid Search: 混合搜索策略，结合内部知识库和外部网络搜索
- Upstash Redis: 项目使用的 Redis 缓存服务
- Tool Calling Agent: 现有的 StudifyToolCallingAgent 类，负责管理和执行工具调用

## Requirements

### Requirement 1

User Story: 作为一名学生，我希望 AI 助手能够回答关于最新技术趋势和新闻的问题，以便我能获取课程内容之外的最新信息

#### Acceptance Criteria

1. WHEN 用户询问关于 2024 年后的最新信息时，THE Web Search Tool SHALL 自动触发网络搜索
2. WHEN 网络搜索完成时，THE Tool Calling Agent SHALL 将搜索结果整合到回答中
3. THE Web Search Tool SHALL 返回至少 3 条相关搜索结果，每条包含标题、摘要和链接
4. WHEN 搜索结果可用时，THE AI Assistant SHALL 在回答中引用信息来源的 URL
5. THE Web Search Tool SHALL 在 5 秒内完成搜索请求或返回超时错误

### Requirement 2

User Story: 作为系统管理员，我希望能够配置 Google Search API 密钥和搜索引擎 ID，以便控制搜索功能的访问权限

#### Acceptance Criteria

1. THE System SHALL 从环境变量 GOOGLE_API_KEY 读取 Google API 密钥
2. THE System SHALL 从环境变量 GOOGLE_CX 读取 Custom Search Engine ID
3. IF GOOGLE_API_KEY 或 GOOGLE_CX 未配置，THEN THE Web Search Tool SHALL 禁用并记录警告日志
4. THE System SHALL 验证 API 密钥格式的有效性（非空字符串）
5. WHEN API 配置无效时，THE Tool Calling Agent SHALL 继续使用其他可用工具而不中断服务

### Requirement 3

User Story: 作为开发者，我希望网络搜索结果能够被缓存，以便减少 API 调用次数和提高响应速度

#### Acceptance Criteria

1. THE Web Search Tool SHALL 使用 Upstash Redis 缓存搜索结果
2. THE Cache Key SHALL 使用格式 "web_search:{query_hash}" 生成
3. THE Cached Results SHALL 保留 24 小时后自动过期
4. WHEN 相同查询在缓存有效期内再次执行时，THE Web Search Tool SHALL 直接返回缓存结果
5. THE Web Search Tool SHALL 记录缓存命中率到日志

### Requirement 4

User Story: 作为一名教师，我希望 AI 能够智能判断何时使用网络搜索，以便在需要时获取外部信息而不影响内部课程内容的优先级

#### Acceptance Criteria

1. THE Tool Calling Agent SHALL 优先使用内部 Search Tool 搜索课程内容
2. WHEN 内部搜索结果不足（少于 2 条相关结果）时，THE Agent SHALL 考虑使用 Web Search Tool
3. WHEN 用户查询包含时间关键词（如 "最新"、"2026"、"今年"）时，THE Agent SHALL 优先使用 Web Search Tool
4. THE Agent SHALL 在单次查询中最多调用 Web Search Tool 1 次
5. THE Agent SHALL 在回答中明确区分内部知识库内容和网络搜索内容

### Requirement 5

User Story: 作为系统运维人员，我希望能够监控网络搜索的使用情况和错误，以便及时发现和解决问题

#### Acceptance Criteria

1. THE Web Search Tool SHALL 记录每次搜索请求的查询内容、结果数量和响应时间
2. WHEN API 调用失败时，THE Web Search Tool SHALL 记录错误类型和错误消息
3. THE Web Search Tool SHALL 统计每日 API 调用次数并在接近配额限制（90 次）时发出警告
4. THE System SHALL 在控制台输出搜索工具的使用统计（成功率、平均响应时间）
5. WHEN 连续 3 次 API 调用失败时，THE Web Search Tool SHALL 自动禁用 10 分钟

### Requirement 6

User Story: 作为一名学生，我希望网络搜索结果经过内容过滤，以便获得教育相关且安全的信息

#### Acceptance Criteria

1. THE Web Search Tool SHALL 在搜索查询中添加 "educational" 或 "tutorial" 关键词以提高结果相关性
2. THE Web Search Tool SHALL 过滤掉包含不适当内容的搜索结果
3. THE Web Search Tool SHALL 优先返回来自教育网站（.edu）和知名技术网站的结果
4. THE Web Search Tool SHALL 限制每次搜索返回最多 5 条结果以避免信息过载
5. WHEN 搜索结果为空时，THE Web Search Tool SHALL 返回友好的提示消息而不是错误

### Requirement 7

User Story: 作为开发者，我希望 Web Search Tool 能够与现有的工具系统无缝集成，以便保持代码架构的一致性

#### Acceptance Criteria

1. THE Search Tool SHALL 返回结果数量（result_count）或置信度分数（confidence_score），以供 Agent 判断结果质量
2.WHEN Search Tool 返回结果数量少于 2 条或置信度低于 0.6 时，THE Agent SHOULD consider using Web Search Tool
3. THE Search Tool description SHALL 明确说明：
用于课程内容、视频片段和内部知识查询
4. THE Web Search Tool description SHALL 明确说明：
用于最新信息、新闻、趋势或外部知识查询
不适用于课程内部内容
5. THE System Prompt SHALL 指导 Agent：
优先使用 Search Tool
仅在内部结果不足或问题涉及最新信息时使用 Web Search Tool
6. THE Agent SHOULD 限制在单次查询中最多调用 Web Search Tool 一次（通过 prompt 或执行配置控制）
7. THE System SHALL 确保 Agent 在调用 Web Search Tool 时避免重复查询相同内容
