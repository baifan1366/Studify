# Requirements Document

## Introduction

本功能为 Studify 视频 AI 助手系统添加三种查询模式（Fast、Normal、Thinking），通过优化 embedding 生成策略来显著提升查询性能。Fast 模式使用客户端 Transformers.js 生成 384 维 embedding，Normal 模式使用服务器端双重 embedding，Thinking 模式采用混合策略并展示推理过程。该优化将 Fast 模式的查询时间从 1600-3000ms 降低至 250-600ms（83% 性能提升）。

## Glossary

- **Video_AI_Assistant**: 视频课程 AI 助手组件，位于 components/course/video-ai-assistant.tsx
- **Video_QA_Panel**: 视频问答面板组件，位于 components/video/video-qa-panel.tsx
- **Transformers_js**: 客户端机器学习库，支持在浏览器中运行 transformer 模型
- **WebGPU**: 浏览器 GPU 加速 API，用于加速客户端 embedding 生成
- **E5_Embedding**: 384 维 embedding 模型（intfloat/multilingual-e5-small 服务器端，Xenova/multilingual-e5-small 客户端），用于初步语义搜索
- **BGE_Embedding**: 1024 维 embedding 模型（BAAI/bge-m3），用于精确重排序
- **HF_Server**: HuggingFace Spaces 托管的 embedding 服务器，可能进入睡眠状态
- **Embedding_Cache**: 客户端 embedding 缓存，使用 IndexedDB 存储
- **Reranking**: 使用 BGE embedding 对 E5 搜索结果进行二次排序的过程
- **Thinking_Process**: AI 推理过程的文本展示，显示模型的思考步骤
- **OPENROUTER_MODEL_THINKING**: 环境变量，指定 Thinking 模式使用的 AI 模型（默认 deepseek/deepseek-r1）
- **Xenova_E5_Small**: 客户端 embedding 模型（Xenova/multilingual-e5-small），384 维量化版本，与服务器端 intfloat/multilingual-e5-small 兼容

## Requirements

### Requirement 1: Fast Mode Client-Side Embedding

**User Story:** 作为学生，我希望在 Fast 模式下获得快速响应（<600ms），以便快速获取视频内容相关答案而无需等待

#### Acceptance Criteria

1. WHEN 用户选择 Fast 模式，THE Video_AI_Assistant SHALL 使用 Transformers.js 在客户端生成 384 维 embedding
2. THE Fast_Mode SHALL 使用 Xenova/multilingual-e5-small 模型（q8 量化版本）生成 embedding
3. **CRITICAL**: THE Client_Model SHALL 使用 Xenova/multilingual-e5-small 以匹配服务器端 intfloat/multilingual-e5-small 模型
4. WHERE WebGPU 可用，THE Transformers_js SHALL 使用 GPU 加速 embedding 生成
5. IF WebGPU 不可用，THEN THE Transformers_js SHALL 回退到 WASM 后端
5. THE Fast_Mode SHALL 仅使用 E5 embedding 进行搜索，不执行 BGE reranking
6. THE Fast_Mode SHALL 在 250-600ms 内完成整个查询流程（embedding + 数据库搜索）
7. THE Fast_Mode SHALL 缓存生成的 embedding 到 IndexedDB，有效期 7 天

### Requirement 2: Normal Mode Server-Side Dual Embedding

**User Story:** 作为学生，我希望在 Normal 模式下获得高质量答案，以便在不需要查看推理过程时获得准确的信息

#### Acceptance Criteria

1. WHEN 用户选择 Normal 模式，THE Video_AI_Assistant SHALL 使用服务器端双重 embedding（E5 + BGE）
2. THE Normal_Mode SHALL 使用 OPENROUTER_MODEL_THINKING 环境变量指定的 AI 模型
3. THE Normal_Mode SHALL 执行两阶段搜索：E5 粗筛（top 30）+ BGE 精排（top 10）
4. THE Normal_Mode SHALL NOT 展示 thinking process 给用户
5. THE Normal_Mode SHALL 在 1600-3000ms 内完成查询流程
6. THE Normal_Mode SHALL 处理 HF 服务器睡眠状态，自动唤醒并重试
7. THE Normal_Mode SHALL 在服务器端缓存 embedding 结果 24 小时

### Requirement 3: Thinking Mode Hybrid Embedding with Reasoning Display

**User Story:** 作为学生，我希望在 Thinking 模式下看到 AI 的推理过程，以便理解答案的生成逻辑和提高学习效果

#### Acceptance Criteria

1. WHEN 用户选择 Thinking 模式，THE Video_AI_Assistant SHALL 使用混合 embedding 策略
2. THE Thinking_Mode SHALL 在客户端生成 E5 embedding（384 维）
3. THE Thinking_Mode SHALL 在服务器端生成 BGE embedding（1024 维）用于 reranking
4. THE Thinking_Mode SHALL 使用 OPENROUTER_MODEL_THINKING 模型并启用 thinking process 输出
5. THE Thinking_Mode SHALL 实时流式展示 thinking process 到 UI
6. THE Thinking_Mode SHALL 在 1050-2100ms 内完成查询流程
7. THE Thinking_Mode SHALL 优雅处理 HF 服务器睡眠，显示唤醒进度给用户

### Requirement 4: Mode Selector UI Integration

**User Story:** 作为学生，我希望能够轻松切换查询模式，以便根据不同场景选择合适的查询策略

#### Acceptance Criteria

1. THE Video_AI_Assistant SHALL 在界面头部显示模式选择器（Fast / Thinking）
2. THE Video_QA_Panel SHALL 在界面头部显示模式选择器（⚡ / 🧠 图标）
3. THE Mode_Selector SHALL 默认选中 Fast 模式
4. WHEN 用户点击模式按钮，THE System SHALL 立即切换模式状态
5. WHEN 查询正在进行时，THE Mode_Selector SHALL 禁用切换功能
6. THE Mode_Selector SHALL 使用视觉反馈区分当前选中模式（蓝色=Fast，紫色=Thinking）
7. THE Mode_Selector SHALL 显示 tooltip 说明每种模式的特点

### Requirement 5: Client-Side Embedding Model Loading and Caching

**User Story:** 作为学生，我希望客户端模型能够快速加载并缓存，以便首次使用后获得流畅体验

#### Acceptance Criteria

1. THE System SHALL 在用户首次选择 Fast 或 Thinking 模式时下载 Xenova/multilingual-e5-small 模型
2. THE Model_Loader SHALL 显示下载进度（百分比和 MB）给用户
3. THE Downloaded_Model SHALL 缓存到浏览器 Cache Storage，有效期 30 天
4. THE Model_Size SHALL 不超过 25MB（q8 量化后）
5. WHEN 模型已缓存，THE System SHALL 在 <100ms 内加载模型到内存
6. IF 模型下载失败，THEN THE System SHALL 回退到 Normal 模式并通知用户
7. THE System SHALL 提供手动清除模型缓存的选项（设置页面）

### Requirement 6: WebGPU Acceleration and Fallback

**User Story:** 作为学生，我希望系统能够自动使用最佳的计算后端，以便在不同设备上获得最优性能

#### Acceptance Criteria

1. THE System SHALL 在页面加载时检测 WebGPU 可用性
2. WHERE WebGPU 可用，THE Transformers_js SHALL 使用 "webgpu" 后端
3. IF WebGPU 不可用，THEN THE Transformers_js SHALL 使用 "wasm" 后端
4. THE System SHALL 记录使用的后端类型到控制台日志
5. THE WebGPU_Backend SHALL 将 embedding 生成时间降低至 50-100ms
6. THE WASM_Backend SHALL 在 150-300ms 内完成 embedding 生成
7. THE System SHALL 在设置页面显示当前使用的计算后端

### Requirement 7: HuggingFace Server Sleep Handling

**User Story:** 作为学生，我希望系统能够优雅处理服务器睡眠状态，以便在服务器唤醒时自动继续查询而不报错

#### Acceptance Criteria

1. WHEN HF 服务器处于睡眠状态，THE System SHALL 检测睡眠指示符（"server is sleeping"）
2. THE System SHALL 自动发送唤醒请求到 HF 服务器（GET / 和 /healthz）
3. THE System SHALL 显示唤醒进度消息给用户（"正在唤醒服务器，预计 30-60 秒"）
4. THE System SHALL 最多重试 3 次，间隔分别为 30s、60s、120s
5. WHEN 服务器唤醒成功，THE System SHALL 自动继续 embedding 生成
6. IF 服务器唤醒失败，THEN THE System SHALL 回退到仅使用 E5 embedding
7. THE System SHALL 记录服务器睡眠事件和唤醒时间到日志

### Requirement 8: Embedding Cache Management

**User Story:** 作为学生，我希望系统能够智能缓存 embedding 结果，以便相同或相似问题能够快速响应

#### Acceptance Criteria

1. THE System SHALL 为每个查询文本生成 SHA-256 哈希作为缓存键
2. THE Client_Cache SHALL 使用 IndexedDB 存储 embedding 向量
3. THE Server_Cache SHALL 使用 Redis 存储 embedding 向量
4. THE Client_Cache SHALL 保留 embedding 7 天后自动过期
5. THE Server_Cache SHALL 保留 embedding 24 小时后自动过期
6. WHEN 缓存命中时，THE System SHALL 跳过 embedding 生成直接使用缓存值
7. THE System SHALL 在控制台记录缓存命中率（每 10 次查询统计一次）

### Requirement 9: Performance Monitoring and Metrics

**User Story:** 作为开发者，我希望能够监控各模式的性能指标，以便优化系统性能和用户体验

#### Acceptance Criteria

1. THE System SHALL 记录每次查询的总耗时（embedding + 搜索 + AI 生成）
2. THE System SHALL 分别记录 embedding 生成时间、数据库搜索时间、AI 响应时间
3. THE System SHALL 在 API 响应中包含性能指标（metadata.processingTimeMs）
4. THE System SHALL 在控制台输出性能摘要（模式、耗时、是否使用缓存）
5. THE System SHALL 统计每种模式的平均响应时间（滑动窗口 100 次查询）
6. THE System SHALL 在响应时间超过预期阈值时记录警告日志
7. THE System SHALL 提供性能对比报告（Fast vs Normal vs Thinking）

### Requirement 10: Error Handling and User Feedback

**User Story:** 作为学生，我希望在查询失败时获得清晰的错误提示，以便了解问题原因并采取相应措施

#### Acceptance Criteria

1. WHEN 客户端模型加载失败，THE System SHALL 显示友好错误消息并回退到 Normal 模式
2. WHEN WebGPU 初始化失败，THE System SHALL 自动回退到 WASM 并通知用户
3. WHEN 服务器 embedding 生成失败，THE System SHALL 显示重试选项
4. WHEN 数据库搜索失败，THE System SHALL 显示错误原因和建议操作
5. THE System SHALL 区分网络错误、服务器错误和客户端错误
6. THE Error_Message SHALL 包含错误类型、简短描述和可能的解决方案
7. THE System SHALL 在连续 3 次失败后建议用户切换模式或刷新页面

### Requirement 11: Thinking Process Display and Interaction

**User Story:** 作为学生，我希望能够查看和理解 AI 的推理过程，以便学习 AI 如何分析问题和生成答案

#### Acceptance Criteria

1. WHEN Thinking 模式返回结果，THE Video_AI_Assistant SHALL 在答案上方显示可折叠的 thinking process 区域
2. THE Thinking_Process SHALL 使用紫色背景和 Brain 图标标识
3. THE Thinking_Process SHALL 默认折叠，用户点击后展开
4. THE Thinking_Process SHALL 使用等宽字体（font-mono）显示推理文本
5. THE Thinking_Process SHALL 实时流式更新（逐字显示）
6. THE Thinking_Process SHALL 保留换行和格式（whitespace-pre-wrap）
7. THE Thinking_Process SHALL 在完成后显示总推理时间

### Requirement 12: API Endpoint Mode Parameter Support

**User Story:** 作为开发者，我希望 API 端点能够接收和处理模式参数，以便前端能够控制后端的查询策略

#### Acceptance Criteria

1. THE Video_Assistant_API SHALL 接受 aiMode 参数（'fast' | 'normal' | 'thinking'）
2. THE API SHALL 默认使用 'fast' 模式当 aiMode 参数缺失时
3. WHEN aiMode 为 'fast'，THE API SHALL 跳过服务器端 embedding 生成
4. WHEN aiMode 为 'normal'，THE API SHALL 使用双重 embedding 但不返回 thinking
5. WHEN aiMode 为 'thinking'，THE API SHALL 使用混合 embedding 并返回 thinking process
6. THE API SHALL 在响应 metadata 中包含使用的模式（metadata.aiMode）
7. THE API SHALL 验证 aiMode 参数值，拒绝无效值并返回 400 错误

### Requirement 13: Backward Compatibility and Migration

**User Story:** 作为开发者，我希望新功能能够向后兼容现有代码，以便平滑迁移而不破坏现有功能

#### Acceptance Criteria

1. THE System SHALL 保持现有 API 端点的默认行为（不传 aiMode 时使用 Fast 模式）
2. THE System SHALL 支持现有的 streaming 和 non-streaming 响应格式
3. THE System SHALL 保持现有的 source 格式和 confidence 计算逻辑
4. THE System SHALL 在 Normal 模式下保持与旧版本相同的性能特征
5. THE System SHALL 不修改现有数据库 schema 或存储过程
6. THE System SHALL 保持现有的错误处理和日志格式
7. THE System SHALL 提供配置选项禁用客户端 embedding（回退到纯服务器端）

### Requirement 14: Model Configuration and Environment Variables

**User Story:** 作为系统管理员，我希望能够通过环境变量配置模型选择，以便灵活调整系统行为而无需修改代码

#### Acceptance Criteria

1. THE System SHALL 从 OPENROUTER_MODEL_THINKING 环境变量读取 Thinking 模式使用的模型
2. THE System SHALL 默认使用 "deepseek/deepseek-r1" 当环境变量未设置时
3. THE System SHALL 从 E5_HG_EMBEDDING_SERVER_API_URL 读取 E5 服务器地址
4. THE System SHALL 从 BGE_HG_EMBEDDING_SERVER_API_URL 读取 BGE 服务器地址
5. THE System SHALL 验证环境变量格式的有效性（非空 URL）
6. IF 环境变量配置无效，THEN THE System SHALL 使用默认值并记录警告
7. THE System SHALL 在启动时输出当前使用的模型配置到日志

### Requirement 15: Client-Side Embedding API Design

**User Story:** 作为开发者，我希望有清晰的客户端 embedding API，以便在不同组件中复用 embedding 生成逻辑

#### Acceptance Criteria

1. THE System SHALL 提供 generateClientEmbedding(text: string) 函数
2. THE Function SHALL 返回 Promise<{ embedding: number[], model: string, backend: string, cached: boolean }>
3. THE Function SHALL 自动处理模型加载、缓存查询和错误处理
4. THE Function SHALL 支持批量 embedding 生成（generateClientEmbeddingBatch）
5. THE Function SHALL 提供进度回调（onProgress: (progress: number) => void）
6. THE Function SHALL 提供取消功能（返回 AbortController）
7. THE Function SHALL 导出 TypeScript 类型定义供其他组件使用

### Requirement 16: Search Strategy Optimization for Fast Mode

**User Story:** 作为学生，我希望 Fast 模式能够在不使用 reranking 的情况下仍然返回相关结果，以便快速获得有用答案

#### Acceptance Criteria

1. THE Fast_Mode SHALL 使用 E5 embedding 搜索时返回 top 15 结果（而非 top 10）
2. THE Fast_Mode SHALL 调整相似度阈值至 0.45（从 0.5）以增加召回率
3. THE Fast_Mode SHALL 优先返回时间窗口内的视频片段（currentTime ± 180s）
4. THE Fast_Mode SHALL 在时间窗口结果不足时自动扩展到全视频搜索
5. THE Fast_Mode SHALL 使用简化的相关性评分（仅基于 E5 相似度）
6. THE Fast_Mode SHALL 在结果中标注是否来自时间窗口（metadata.fromTimeWindow）
7. THE Fast_Mode SHALL 保持至少 70% 的答案质量（相比 Normal 模式）

### Requirement 17: Progressive Enhancement and Feature Detection

**User Story:** 作为学生，我希望系统能够根据我的浏览器能力自动启用最佳功能，以便在不同设备上获得最优体验

#### Acceptance Criteria

1. THE System SHALL 在页面加载时检测 WebGPU、WASM、IndexedDB 可用性
2. THE System SHALL 在不支持 WebGPU 的浏览器中隐藏 Fast 模式或显示降级提示
3. THE System SHALL 在不支持 IndexedDB 的浏览器中禁用客户端缓存
4. THE System SHALL 在移动设备上默认使用 Normal 模式（避免客户端计算）
5. THE System SHALL 在低内存设备（<4GB）上禁用客户端 embedding
6. THE System SHALL 提供手动启用/禁用客户端 embedding 的设置选项
7. THE System SHALL 在设置页面显示当前浏览器的功能支持情况

### Requirement 18: Internationalization and Localization

**User Story:** 作为国际学生，我希望模式选择器和错误消息能够显示我的语言，以便更好地理解和使用系统

#### Acceptance Criteria

1. THE Mode_Selector SHALL 使用 i18n 翻译键显示模式名称
2. THE System SHALL 提供英文、中文、日文的模式描述翻译
3. THE Error_Messages SHALL 使用 i18n 翻译键显示本地化错误信息
4. THE Thinking_Process_Label SHALL 根据用户语言显示（"Thinking Process" / "思考过程"）
5. THE Performance_Metrics SHALL 使用本地化的时间单位（ms / 毫秒）
6. THE Model_Loading_Progress SHALL 显示本地化的进度文本
7. THE System SHALL 在 en.json 和 zh.json 中添加所有新增的翻译键

### Requirement 19: Testing and Quality Assurance

**User Story:** 作为开发者，我希望有完整的测试覆盖，以便确保三种模式在各种场景下都能正常工作

#### Acceptance Criteria

1. THE System SHALL 提供单元测试覆盖客户端 embedding 生成逻辑
2. THE System SHALL 提供集成测试覆盖三种模式的端到端流程
3. THE System SHALL 提供性能测试验证各模式的响应时间目标
4. THE System SHALL 提供错误场景测试（网络失败、模型加载失败、服务器睡眠）
5. THE System SHALL 提供浏览器兼容性测试（Chrome、Firefox、Safari、Edge）
6. THE System SHALL 提供移动设备测试（iOS Safari、Android Chrome）
7. THE System SHALL 在 CI/CD 流程中自动运行所有测试

### Requirement 20: Documentation and Developer Guide

**User Story:** 作为开发者，我希望有清晰的文档说明如何使用和扩展三模式查询系统，以便快速上手和维护

#### Acceptance Criteria

1. THE System SHALL 提供 README.md 文档说明三种模式的区别和使用场景
2. THE System SHALL 提供 API 文档说明 aiMode 参数和响应格式
3. THE System SHALL 提供架构图展示 embedding 生成和搜索流程
4. THE System SHALL 提供性能优化指南说明如何调优各模式
5. THE System SHALL 提供故障排查指南说明常见问题和解决方案
6. THE System SHALL 提供代码示例展示如何在新组件中集成三模式查询
7. THE System SHALL 在代码中添加 JSDoc 注释说明关键函数和类型

