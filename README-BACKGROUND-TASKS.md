# 后台任务系统 (Background Tasks System)

这个系统让用户在视频处理和embedding生成时可以继续进行其他操作，所有进度通过 sonner toast 实时显示。

## 🎯 核心特性

### ✨ 非阻塞操作
- 视频上传后立即清空表单，用户可以继续操作
- 所有处理都在后台进行，不影响用户使用其他功能
- 实时进度更新通过 toast 通知显示

### 📊 实时进度反馈
- 上传进度条 (0-100%)
- 视频处理进度 (0-90%)
- Embedding生成进度 (0-100%)
- 成功/失败状态通知

### 🔄 自动重试机制
- 失败的任务可以一键重试
- 支持网络错误和超时自动恢复

## 🚀 使用方式

### 在组件中使用

```typescript
import { useBackgroundTasks } from '@/hooks/background-tasks/use-background-tasks'

function MyComponent() {
  const { startVideoProcessingTask, startEmbeddingTask } = useBackgroundTasks()
  
  const handleUpload = async (file: File) => {
    // 1. 上传文件
    const uploadResult = await uploadFile(file)
    
    // 2. 如果是视频，启动后台处理
    if (file.type.startsWith('video/')) {
      const processingResult = await startVideoProcessing(uploadResult.id)
      
      // 3. 启动后台监控 (非阻塞)
      startVideoProcessingTask(
        uploadResult.id,
        uploadResult.title,
        processingResult.queue_id
      )
      
      // 4. 启动embedding生成监控
      setTimeout(() => {
        startEmbeddingTask(uploadResult.id, uploadResult.title)
      }, 5000)
    }
    
    // 5. 用户可以立即继续其他操作！
    clearForm()
  }
}
```

## 📱 Toast 通知流程

### 视频处理流程
```
🎥 Processing: VideoName.mp4
├─ Loading: "AI analysis in progress - you can continue working"
├─ Progress: "Processing: VideoName.mp4 (45%)"
├─ Success: "🎉 Video processing completed: VideoName.mp4"
└─ Error: "❌ Video processing failed: VideoName.mp4" (with retry button)
```

### Embedding生成流程  
```
🧠 Generating embeddings: VideoName.mp4  
├─ Loading: "Preparing for AI search - you can continue working"
├─ Progress: "Generating embeddings: VideoName.mp4 (75%)"
├─ Success: "🎉 AI embeddings ready: VideoName.mp4"
└─ Error: "❌ Embedding generation failed: VideoName.mp4" (with retry button)
```

## 🛠️ 技术实现

### 核心Hook: `useBackgroundTasks`
```typescript
export const useBackgroundTasks = () => {
  const startVideoProcessingTask = useCallback((
    attachmentId: number,
    title: string, 
    queueId: string
  ) => {
    const taskId = `video_${attachmentId}_${Date.now()}`
    
    // 显示初始toast
    toast.loading(`🎥 Processing: ${title}`, {
      id: taskId,
      description: 'AI analysis in progress - you can continue working',
    })
    
    // 启动监控
    monitorVideoProcessing(taskId, queueId, title)
    
    return taskId
  }, [])
  
  return { startVideoProcessingTask, startEmbeddingTask }
}
```

### 进度监控函数
```typescript
const monitorVideoProcessing = async (taskId: string, queueId: string, title: string) => {
  const checkProgress = async () => {
    try {
      const response = await fetch(`/api/video-processing/status/${queueId}`)
      const data = await response.json()
      
      // 更新toast进度
      toast.loading(`🎥 Processing: ${title} (${progress}%)`, {
        id: taskId,
        description: 'AI analysis in progress - you can continue working'
      })
      
      if (data.status === 'completed') {
        toast.success(`🎉 Video processing completed: ${title}`, {
          id: taskId,
          description: 'AI features are now available',
          duration: 5000
        })
        return
      }
      
      // 继续监控
      setTimeout(checkProgress, 1000)
      
    } catch (error) {
      toast.error(`❌ Processing failed: ${title}`, {
        id: taskId,
        action: { label: 'Retry', onClick: () => retry() }
      })
    }
  }
  
  checkProgress()
}
```

## 📁 文件结构

```
hooks/background-tasks/
├── use-background-tasks.ts           # 主要Hook和监控逻辑
components/background-tasks/
├── background-tasks-indicator.tsx    # 简化版指示器 (现在直接用toast)
components/tutor/storage/
├── storage-dialog.tsx                # 集成后台任务的存储对话框
```

## 🎨 用户体验优势

### ✅ 原来的体验 (阻塞式)
- 用户上传视频后必须等待处理完成
- 显示模态对话框，阻止其他操作
- 处理失败时用户被困在等待状态

### 🚀 现在的体验 (非阻塞式)  
- 用户上传视频后立即可以继续其他操作
- Toast通知提供实时进度反馈
- 后台处理完成时会有成功通知
- 失败时提供重试选项，不影响当前工作流

## 🔧 配置选项

### Toast 配置
- **duration**: 成功消息5秒，错误消息10秒
- **action**: 失败时提供重试按钮
- **description**: 提供详细状态描述
- **id**: 唯一ID确保toast更新而非创建新的

### 监控配置
- **Video Processing**: 最大120次尝试 (2分钟)
- **Embedding Generation**: 最大60次尝试 (1分钟)  
- **检查间隔**: 每秒检查一次状态

## 🎯 集成示例

在`storage-dialog.tsx`中的实际使用：

```typescript
// 上传完成后启动后台处理
if (file.type.startsWith('video/') && uploadResult?.id) {
  toast.success('Video uploaded! Starting background AI processing...', {
    description: 'You can continue working while we process your video'
  })
  
  const processingResult = await startVideoProcessingMutation.mutateAsync(uploadResult.id)
  
  // 启动后台监控 (非阻塞)
  startVideoProcessingTask(
    uploadResult.id,
    uploadResult.title || title.trim(),
    processingResult.queue_id
  )
  
  // 5秒后启动embedding生成
  setTimeout(() => {
    startEmbeddingTask(uploadResult.id, uploadResult.title || title.trim())
  }, 5000)
}

// 立即清空表单，用户可以继续操作
clearForm()
setActiveTab('manage')
```

这个系统完全改变了用户体验，从等待式操作转变为连续式工作流，大大提高了应用的可用性和用户满意度！ 🎉
