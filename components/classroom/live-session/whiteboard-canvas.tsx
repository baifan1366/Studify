'use client';

import type React from 'react';
import { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { toast } from 'sonner';
// 使用自定义debounce函数避免lodash依赖
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
};

interface WhiteboardCanvasProps {
  classroomSlug: string;
  sessionId: string;
  userRole?: 'student' | 'tutor';
  participantName?: string;
  width?: number;
  height?: number;
  // 白板工具栏设定
  currentTool?: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  currentColor?: string;
  currentBrushSize?: number;
}

export interface WhiteboardCanvasRef {
  clearCanvas: () => void;
  saveCanvas: () => Promise<void>;
  downloadCanvas: () => void;
  clearCache: () => Promise<void>;
  reloadWhiteboard: () => Promise<void>;
}

export const WhiteboardCanvas = forwardRef<WhiteboardCanvasRef, WhiteboardCanvasProps>(({ 
  classroomSlug, 
  sessionId, 
  userRole = 'student', 
  participantName = 'User',
  width = 800,
  height = 600,
  currentTool = 'pen',
  currentColor = '#000000',
  currentBrushSize = 4
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [tempCanvas, setTempCanvas] = useState<HTMLCanvasElement | null>(null);
  // 绘图层缓存 - 用于缓存所有非文本的笔触
  const [drawingCanvas, setDrawingCanvas] = useState<HTMLCanvasElement | null>(null);
  
  // 增强的文本框状态
  interface TextBox {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    color: string;
    backgroundColor?: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline';
    alignment: 'left' | 'center' | 'right';
    isEditing: boolean;
    isSelected: boolean;
    zIndex: number;
  }
  
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  
  const [activeTextBox, setActiveTextBox] = useState<string | null>(null);
  const [isTextMode, setIsTextMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [devicePixelRatio, setDevicePixelRatio] = useState(1);
  const [isComposing, setIsComposing] = useState(false); // IME输入状态
  const containerRef = useRef<HTMLDivElement>(null);
  const customCursorRef = useRef<HTMLDivElement>(null); // 🎯 自定义光标引用
  
  // 🎯 使用 ref 存储最新的 textBoxes，避免 useEffect 依赖数组大小变化
  const textBoxesRef = useRef<TextBox[]>([]);
  useEffect(() => {
    textBoxesRef.current = textBoxes;
  }, [textBoxes]);
  
  // 🎯 使用 ref 存储稳定的 props，减少事件监听器重新注册
  const propsRef = useRef({ classroomSlug, sessionId, userRole, participantName });
  useEffect(() => {
    propsRef.current = { classroomSlug, sessionId, userRole, participantName };
  }, [classroomSlug, sessionId, userRole, participantName]);
  
  // 检测设备像素比
  useEffect(() => {
    const updateDPR = () => {
      setDevicePixelRatio(window.devicePixelRatio || 1);
    };
    updateDPR();
    window.addEventListener('resize', updateDPR);
    return () => window.removeEventListener('resize', updateDPR);
  }, []);
  
  // 清除画布
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const drawingCtx = drawingCanvas?.getContext('2d');
    
    // 1. 清空主画布
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    
    // 2. 🎯 清空绘图缓存画布
    if (drawingCtx && drawingCanvas) {
      drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      drawingCtx.fillStyle = 'white';
      drawingCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    }
    
    // 3. 🎯 清空文本框状态
    setTextBoxes([]);
    setActiveTextBox(null);
    
    toast.success('画布已彻底清空');
    
    // 4. 触发自动保存以持久化清空状态
    scheduleAutoSave();
  };

  // 保存画布到bucket存储（自动清除Redis缓存）
  const saveCanvas = async () => {
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        console.log('💾 Starting canvas save process...');
        
        // 将画布转换为base64数据
        const imageData = canvas.toDataURL('image/png');
        console.log('📸 Canvas converted to base64, size:', imageData.length);
        
        // 🎯 使用 ref 获取最新的 textBoxes，避免闭包问题
        const currentTextBoxes = textBoxesRef.current;
        console.log('🔍 Current textBoxes from ref:', currentTextBoxes.length);
        
        // 准备文本框数据（排除临时的UI状态）
        const textBoxData = currentTextBoxes.map(tb => ({
          id: tb.id,
          x: tb.x,
          y: tb.y,
          width: tb.width,
          height: tb.height,
          text: tb.text,
          color: tb.color,
          backgroundColor: tb.backgroundColor,
          fontSize: tb.fontSize,
          fontFamily: tb.fontFamily,
          fontWeight: tb.fontWeight,
          fontStyle: tb.fontStyle,
          textDecoration: tb.textDecoration,
          alignment: tb.alignment,
          zIndex: tb.zIndex
        }));
        
        console.log('📋 Preparing to save', textBoxData.length, 'text boxes');
        if (textBoxData.length > 0) {
          console.log('📝 Text box data sample:', textBoxData[0]);
        }
        
        // 调用API保存到bucket存储
        const startTime = performance.now();
        const response = await fetch(`/api/classroom/${classroomSlug}/whiteboard`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            imageData,
            width: canvas.width,
            height: canvas.height,
            textBoxes: textBoxData, // 🎯 关键修复：发送完整的文本框数据
            metadata: {
              userRole,
              participantName,
              timestamp: new Date().toISOString(),
              textBoxCount: textBoxes.length
            }
          }),
        });
        
        const saveTime = performance.now() - startTime;

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Canvas saved successfully in ${saveTime.toFixed(2)}ms:`, result);
          console.log('🗑️ Redis cache should be automatically invalidated');
          toast.success('白板已保存并缓存已更新');
        } else {
          const errorData = await response.text();
          console.error('❌ Save API failed:', response.status, response.statusText, errorData);
          throw new Error(`保存失败: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('💥 保存白板失败:', error);
        const errorMessage = error instanceof Error ? error.message : '请重试';
        toast.error(`保存失败: ${errorMessage}`);
      }
    }
  };

  // 下载画布
  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `whiteboard-${classroomSlug}-${sessionId}-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast.success('白板已下载');
    }
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    clearCanvas,
    saveCanvas,
    downloadCanvas,
    clearCache: clearWhiteboardCache,
    reloadWhiteboard: loadWhiteboardContent,
  }));

  // 自动保存画布状态
  const autoSaveCanvas = async () => {
    try {
      console.log('🔄 Auto-save triggered');
      await saveCanvas();
      console.log('✅ Auto-saved canvas state successfully');
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      // 自动保存失败时不显示错误提示，避免干扰用户
      // 只在控制台记录错误
    }
  };

  // 触发自动保存
  const scheduleAutoSave = () => {
    // 清除之前的定时器
    if (autoSaveTimer) {
      console.log('⏰ Clearing previous auto-save timer');
      clearTimeout(autoSaveTimer);
    }
    
    // 设置新的定时器，5秒后自动保存
    console.log('⏱️ Scheduling auto-save in 5 seconds...');
    const timer = setTimeout(() => {
      autoSaveCanvas();
    }, 5000);
    
    setAutoSaveTimer(timer);
  };

  // 手动清除缓存的函数
  const clearWhiteboardCache = async () => {
    try {
      console.log('🗑️ Manually clearing whiteboard cache...');
      const timestamp = Date.now();
      const response = await fetch(
        `/api/classroom/${classroomSlug}/whiteboard?session_id=${sessionId}&_t=${timestamp}`,
        {
          method: 'DELETE',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Cache cleared successfully:', result);
        toast.success('缓存已清除');
      } else {
        console.error('❌ Failed to clear cache:', response.status);
        toast.error('清除缓存失败');
      }
    } catch (error) {
      console.error('💥 Error clearing cache:', error);
      toast.error('清除缓存时发生错误');
    }
  };

  // 设置存储桶的函数
  const setupStorage = async () => {
    try {
      console.log('🔧 Setting up storage buckets...');
      toast.info('正在设置存储桶...');
      
      const response = await fetch('/api/storage/setup', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Storage setup completed:', result);
        toast.success(`存储设置完成！创建了 ${result.buckets.length} 个桶`);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to setup storage:', errorData);
        console.log('📋 Manual setup required. Please:');
        console.log('1. Go to Supabase Dashboard > Storage');
        console.log('2. Create bucket named "classroom-attachment"');
        console.log('3. Set as Private, 10MB limit, allow image/* types');
        toast.error('存储设置失败 - 请手动在 Supabase 控制台创建桶');
      }
    } catch (error) {
      console.error('💥 Error setting up storage:', error);
      toast.error('存储设置时发生错误');
    }
  };

  // 显示设置说明
  const showSetupInstructions = () => {
    console.log('📋 手动设置说明：');
    console.log('1. 登录 Supabase Dashboard');
    console.log('2. 进入 Storage > Buckets');
    console.log('3. 创建桶：classroom-attachment');
    console.log('4. 设置：Private, 10MB, image/* types');
    toast.info('请查看控制台中的详细设置说明');
  };

  // 在组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  // 🎯 页面离开前保存 - 使用 ref 减少事件监听器重新注册
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 🎯 使用 sendBeacon API 进行可靠的页面卸载前保存
      const canvas = canvasRef.current;
      if (canvas && navigator.sendBeacon) {
        try {
          const imageData = canvas.toDataURL('image/png');
          
          // 从 ref 获取最新的值
          const currentTextBoxes = textBoxesRef.current;
          const { classroomSlug, sessionId, userRole, participantName } = propsRef.current;
          
          const textBoxData = currentTextBoxes.map(tb => ({
            id: tb.id,
            x: tb.x,
            y: tb.y,
            width: tb.width,
            height: tb.height,
            text: tb.text,
            color: tb.color,
            backgroundColor: tb.backgroundColor,
            fontSize: tb.fontSize,
            fontFamily: tb.fontFamily,
            fontWeight: tb.fontWeight,
            fontStyle: tb.fontStyle,
            textDecoration: tb.textDecoration,
            alignment: tb.alignment,
            zIndex: tb.zIndex
          }));
          
          const payload = JSON.stringify({
            sessionId,
            imageData,
            width: canvas.width,
            height: canvas.height,
            textBoxes: textBoxData,
            metadata: {
              userRole,
              participantName,
              timestamp: new Date().toISOString(),
              textBoxCount: currentTextBoxes.length,
              saveType: 'beforeunload'
            }
          });
          
          const blob = new Blob([payload], { type: 'application/json' });
          const sent = navigator.sendBeacon(
            `/api/classroom/${classroomSlug}/whiteboard`,
            blob
          );
          
          if (sent) {
            console.log('✅ Whiteboard saved via sendBeacon before unload');
          } else {
            console.warn('⚠️ sendBeacon failed, data might be lost');
          }
        } catch (error) {
          console.error('❌ Error in beforeunload save:', error);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        autoSaveCanvas();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // 🎯 空依赖数组 - 监听器只注册一次

  // 🎯 核心修复：处理画布尺寸变化，保持内容比例（完善版）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. 保存旧的尺寸，用于计算缩放比例
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;

    // 如果新尺寸与旧尺寸相同，则不执行任何操作
    if (oldWidth === width && oldHeight === height) {
      return;
    }

    // --- 如果是首次加载 (oldWidth 为 0)，则执行初始化逻辑 ---
    if (oldWidth === 0 || oldHeight === 0) {
      console.log(`🎨 Initializing canvas to ${width}x${height}`);
      canvas.width = width;
      canvas.height = height;
      
      // 初始化主画布背景
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
      }

      // 初始化临时画布
      const temp = document.createElement('canvas');
      temp.width = width;
      temp.height = height;
      setTempCanvas(temp);
      
      // 初始化绘图缓存画布
      const newDrawingCanvas = document.createElement('canvas');
      newDrawingCanvas.width = width;
      newDrawingCanvas.height = height;
      const drawingCtx = newDrawingCanvas.getContext('2d');
      if (drawingCtx) {
        drawingCtx.fillStyle = 'white';
        drawingCtx.fillRect(0, 0, width, height);
      }
      setDrawingCanvas(newDrawingCanvas);

      // 首次加载时获取服务器内容
      loadWhiteboardContent();
      return;
    }

    // --- 如果不是首次加载，执行内容缩放逻辑 ---
    console.log(`🔄 Resizing canvas from ${oldWidth}x${oldHeight} to ${width}x${height}`);

    // 2. 将当前的绘制缓存 (drawingCanvas) 存入一个临时图像
    // 这一步是异步的，所以我们将所有后续逻辑放在 onload 回调中
    const tempDrawingImage = new Image();
    if (drawingCanvas) {
      tempDrawingImage.src = drawingCanvas.toDataURL();
    }

    tempDrawingImage.onload = () => {
      // 3. 计算缩放比例
      const scaleX = width / oldWidth;
      const scaleY = height / oldHeight;
      console.log(`📐 Scale factors: X=${scaleX.toFixed(3)}, Y=${scaleY.toFixed(3)}`);

      // 4. (矢量部分) 按比例更新所有文本框的位置、大小和字体
      setTextBoxes(prevTextBoxes => {
        if (prevTextBoxes.length > 0) {
          console.log(`📝 Scaling ${prevTextBoxes.length} text boxes`);
        }
        return prevTextBoxes.map(tb => ({
          ...tb,
          x: tb.x * scaleX,
          y: tb.y * scaleY,
          width: tb.width * scaleX,
          height: tb.height * scaleY,
          fontSize: tb.fontSize * Math.min(scaleX, scaleY) // 字体按较小比例缩放以保持观感
        }));
      });
      
      // 5. 调整主画布和缓存画布的尺寸（这将清空它们）
      canvas.width = width;
      canvas.height = height;
      
      // 创建新的临时画布
      const newTempCanvas = document.createElement('canvas');
      newTempCanvas.width = width;
      newTempCanvas.height = height;
      setTempCanvas(newTempCanvas);
      
      const newDrawingCanvas = document.createElement('canvas');
      newDrawingCanvas.width = width;
      newDrawingCanvas.height = height;
      
      // 6. (光栅部分) 将临时图像按比例绘制回新的缓存画布
      const drawingCtx = newDrawingCanvas.getContext('2d');
      if (drawingCtx) {
        drawingCtx.fillStyle = 'white';
        drawingCtx.fillRect(0, 0, width, height); // 先填充背景
        drawingCtx.drawImage(tempDrawingImage, 0, 0, width, height);
        
        console.log('✅ Drawing content scaled and restored');
        
        // 更新 drawingCanvas state
        setDrawingCanvas(newDrawingCanvas);
        
        // 7. 触发一次最终的重绘
        // 使用 setTimeout 确保在 React 的所有状态更新都完成后再执行
        setTimeout(() => {
          console.log('🎨 Final redraw after resize');
          redrawCanvas();
        }, 0);
      }
    };

    // 如果 drawingCanvas 为空（例如，用户还没画任何东西），也需要调整尺寸
    if (!drawingCanvas || !drawingCanvas.toDataURL()) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
      }
    }

  }, [width, height]); // 依赖项现在只关心 width 和 height 的变化

  // 🎯 性能优化：自动重绘画布，但在拖拽/缩放时跳过重绘
  // 原理：拖拽时只更新 React 状态，TextBoxOverlay 的 div 会流畅移动
  // Canvas 上的旧文本会被 div 覆盖，直到 mouseUp 时才重绘
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      // 🎯 关键优化：拖拽/缩放时完全跳过重绘
      if (isDragging || isResizing) {
        console.log('⏭️ Skipping canvas redraw during drag/resize for performance');
        return;
      }
      
      // 正常情况下立即重绘
      console.log('Redrawing canvas due to textBoxes change, count:', textBoxes.length);
      redrawCanvas();
    }
  }, [textBoxes, isDragging, isResizing]);

  // 加载白板内容（从Redis缓存或bucket存储）
  const loadWhiteboardContent = async () => {
    try {
      // 检查必要参数是否存在
      if (!classroomSlug || !sessionId) {
        console.warn('🚫 Missing classroomSlug or sessionId, skipping whiteboard load');
        return;
      }

      console.log('🔄 Loading whiteboard content for:', { classroomSlug, sessionId });
      console.log(`📡 Fetching from: /api/classroom/${classroomSlug}/whiteboard?session_id=${sessionId}`);
      
      // 从Redis缓存或bucket存储加载白板图像
      const startTime = performance.now();
      // 🎯 关键修复：强制绕过浏览器缓存，每次都从服务器获取最新数据
      // 策略1: 添加时间戳参数确保 URL 每次都不同
      const timestamp = Date.now();
      const imageResponse = await fetch(
        `/api/classroom/${classroomSlug}/whiteboard?session_id=${sessionId}&_t=${timestamp}`,
        {
          cache: 'no-store', // 策略2: 禁用浏览器缓存
          headers: {
            // 策略3: 添加 HTTP 头告诉浏览器和中间代理不要缓存
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
      const loadTime = performance.now() - startTime;
      
      if (imageResponse.ok) {
        const images = await imageResponse.json();
        console.log(`⚡ Load completed in ${loadTime.toFixed(2)}ms`);
        
        if (images.length > 0) {
          // 加载最新的画布数据
          const latestData = images[0];
          // 🎯 关键修复：支持两种字段名格式（textBoxes 和 text_boxes）
          const textBoxesData = latestData.textBoxes || latestData.text_boxes;
          
          console.log('📊 Retrieved whiteboard data:', {
            hasImageData: !!latestData.image_data,
            hasTextBoxes: !!textBoxesData,
            textBoxCount: textBoxesData?.length || 0,
            fieldUsed: latestData.textBoxes ? 'textBoxes' : 'text_boxes',
            bucket: latestData.bucket,
            createdAt: latestData.created_at,
            size: latestData.image_data ? latestData.image_data.length : 0
          });
          
          // 1. 加载背景图像
          if (latestData.image_data) {
            console.log('🎨 Loading existing whiteboard image...');
            loadCanvasImage(latestData.image_data);
          }
          
          // 2. 🎯 关键修复：恢复文本框状态
          console.log('🔍 Debug text_boxes data:', {
            hasTextBoxesField: 'textBoxes' in latestData,
            hasTextBoxesSnakeCase: 'text_boxes' in latestData,
            isArray: Array.isArray(textBoxesData),
            value: textBoxesData,
            type: typeof textBoxesData
          });
          
          if (textBoxesData && Array.isArray(textBoxesData)) {
            console.log(`📝 Restoring ${textBoxesData.length} text boxes...`);
            
            if (textBoxesData.length > 0) {
              console.log('📋 First text box sample:', textBoxesData[0]);
            }
            
            // 将从API获取的textBox数据设置到state中
            // 需要确保为每个textBox补充isEditing和isSelected等客户端临时状态
            const restoredTextBoxes = textBoxesData.map((tb: any) => ({
              ...tb,
              isEditing: false, // 默认不是编辑状态
              isSelected: false, // 默认不是选中状态
            }));
            
            console.log('✅ Setting textBoxes state with', restoredTextBoxes.length, 'boxes');
            setTextBoxes(restoredTextBoxes);
            
            // 🎯 信任 useEffect 自动处理重绘，不需要手动调用
            // useEffect 会在 textBoxes 更新后自动触发 redrawCanvas
            
            toast.success(`白板图像和 ${textBoxesData.length} 个文本框均已加载`);
          } else {
            console.warn('⚠️ No textBoxes data or invalid format');
            console.warn('Available fields in latestData:', Object.keys(latestData));
            if (latestData.image_data) {
              toast.success('白板图像已加载');
            }
          }
        } else {
          console.log('🆕 No existing whiteboard found, starting fresh');
        }
      } else {
        console.warn('❌ Failed to load whiteboard:', imageResponse.status, imageResponse.statusText);
        const errorText = await imageResponse.text();
        console.error('Error details:', errorText);
      }
    } catch (error) {
      console.error('💥 Failed to load whiteboard content:', error);
      // 不要阻止白板的正常使用，即使加载失败
    }
  };

  // 加载画布图像
  const loadCanvasImage = (imageData: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // 重新绘制文本框
      setTimeout(() => {
        redrawCanvas();
      }, 50);
    };
    img.src = imageData;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // 如果是文本工具，默认行为是取消所有选中
    // 只有当点击事件没有被任何一个文本框的 Overlay 捕获时，这个函数才应该完全执行
    if (currentTool === 'text') {
      // 延迟执行，给 Overlay 的 stopPropagation 一点时间
      setTimeout(() => {
        // 检查是否仍然没有激活的文本框
        // 如果 activeTextBox 在 Overlay 点击后被设置了，就不执行这里的逻辑
        if (!activeTextBox) {
          console.log('Canvas clicked in text mode - creating new text box at:', { x, y });
          setTextBoxes(prev => prev.map(tb => ({ ...tb, isSelected: false, isEditing: false })));
          createTextBox(x, y); // 只在点击空白处时创建
        } else {
          console.log('Text box already active, skipping creation');
        }
      }, 0);
      return;
    }

    // 非文本工具：取消所有文本框的选中状态
    setTextBoxes(prev => prev.map(tb => ({ ...tb, isSelected: false, isEditing: false })));
    setActiveTextBox(null);

    // 普通绘制模式
    setIsDrawing(true);
    setStartPoint({ x, y });
    
    const ctx = canvas.getContext('2d');
    const drawingCtx = drawingCanvas?.getContext('2d');
    
    if (ctx) {
      if (currentTool === 'pen') {
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        // 同时在缓存画布上开始绘制
        if (drawingCtx) {
          drawingCtx.beginPath();
          drawingCtx.moveTo(x, y);
        }
      } else if (currentTool === 'rectangle' || currentTool === 'circle') {
        // 保存开始绘制前的画布状态
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setSavedImageData(imageData);
      }
    }
  };

  // 创建增强的文本框
  const createTextBox = (x: number, y: number) => {
    console.log('🎯 createTextBox called at:', { x, y });
    console.log('📊 Current textBoxes count:', textBoxes.length);
    
    const fontSize = Math.max(12, currentBrushSize * 3);
    const newTextBox: TextBox = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      width: fontSize, // 🎯 初始宽度等于一个字符，autoResize 会立即调整
      height: fontSize * 1.5, // 🎯 初始高度约等于一行
      text: '',
      color: currentColor,
      backgroundColor: undefined,
      fontSize,
      fontFamily: 'monospace', // 🎯 使用等宽字体确保字符宽度一致
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      alignment: 'left',
      isEditing: true,
      isSelected: true,
      zIndex: textBoxes.length + 1
    };
    
    console.log('✅ New textBox created:', newTextBox.id);
    
    setTextBoxes(prev => {
      const updated = [...prev, newTextBox];
      console.log('📝 Updated textBoxes array:', updated.length, 'boxes');
      return updated;
    });
    setActiveTextBox(newTextBox.id);
    
    // 创建增强的文本输入组件
    setTimeout(() => createEnhancedTextInput(newTextBox), 10);
  };

  // 🎯 创建增强的文本输入组件 - 自适应大小、流畅编辑
  const createEnhancedTextInput = useCallback((textBox: TextBox) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 高DPI适配
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    
    // 使用textarea支持多行输入
    const textarea = document.createElement('textarea');
    textarea.value = textBox.text || '';
    
    // 🎯 精确的位置计算
    const cssX = textBox.x * scaleX;
    const cssY = textBox.y * scaleY;
    const scaledFontSize = textBox.fontSize * scaleY;
    
    // 🎯 增强的样式设置 - 精确匹配文字大小
    Object.assign(textarea.style, {
      position: 'absolute',
      left: `${cssX}px`,
      top: `${cssY}px`,
      minWidth: `${textBox.fontSize * scaleX}px`, // 🎯 最小宽度为一个字符
      maxWidth: `${canvas.width * scaleX}px`, // 🎯 最大宽度为画布宽度
      width: 'auto', // 🎯 自动宽度
      height: 'auto', // 🎯 自动高度
      fontSize: `${scaledFontSize}px`,
      fontFamily: textBox.fontFamily,
      fontWeight: textBox.fontWeight,
      fontStyle: textBox.fontStyle,
      textDecoration: textBox.textDecoration,
      textAlign: textBox.alignment,
      color: textBox.color,
      backgroundColor: textBox.backgroundColor || 'rgba(255, 255, 255, 0.9)',
      border: '2px solid rgba(59, 130, 246, 0.5)',
      borderRadius: '4px',
      outline: 'none',
      resize: 'none', // 🎯 禁用手动调整大小，改用自动调整
      zIndex: '1000',
      padding: '2px', // 🎯 减小 padding 以更贴合文字
      lineHeight: '1.2', // 🎯 行高稍微大于1，更自然
      overflow: 'hidden',
      whiteSpace: 'nowrap', // 🎯 默认不换行
      wordBreak: 'keep-all', // 🎯 保持单词完整
      boxSizing: 'border-box' // 🎯 包含 padding 和 border 在宽高中
    });
    
    const canvasContainer = canvas.parentElement;
    if (!canvasContainer) return;

    canvasContainer.style.position = 'relative';
    canvasContainer.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    let isFinished = false;
    
    // 增强的事件处理
    const handleKeyDown = (e: KeyboardEvent) => {
      // 防止在IME输入过程中误触发
      if (isComposing) return;
      
      if (e.key === 'Escape') {
        e.preventDefault();
        finishEditing('');
      } else if (e.key === 'Enter' && e.shiftKey) {
        // Shift+Enter: 换行，不结束编辑
        return;
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // Enter: 结束编辑
        e.preventDefault();
        finishEditing(textarea.value);
      }
    };

    const handleBlur = () => {
      // 延迟执行，允许用户点击resize handle
      setTimeout(() => {
        if (!isFinished) {
          finishEditing(textarea.value);
        }
      }, 100);
    };

    // 🎯 自动调整文本框大小 - 精确匹配文字尺寸
    const autoResize = () => {
      // 临时重置，以获取内容的真实尺寸
      textarea.style.width = 'auto';
      textarea.style.height = 'auto'; // 使用 'auto' 更可靠
      
      const scrollWidth = textarea.scrollWidth;
      const scrollHeight = textarea.scrollHeight;
      
      // 🎯 关键修复：获取 textarea 的计算样式，以得到真实的 padding 和 border
      const computedStyle = window.getComputedStyle(textarea);
      const horizontalPadding = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
      const verticalPadding = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
      const horizontalBorder = parseFloat(computedStyle.borderLeftWidth) + parseFloat(computedStyle.borderRightWidth);
      const verticalBorder = parseFloat(computedStyle.borderTopWidth) + parseFloat(computedStyle.borderBottomWidth);
      
      // 计算最终需要的宽度和高度（box-sizing: border-box 会自动处理 border）
      let targetWidth = scrollWidth + horizontalPadding;
      let targetHeight = scrollHeight + verticalPadding;
      
      // 检查是否超过画布宽度
      const maxWidth = (canvas.width * scaleX) - cssX - 20; // 留出边距
      
      if (targetWidth > maxWidth) {
        // 🎯 超过画布宽度时才允许换行
        textarea.style.whiteSpace = 'normal';
        targetWidth = maxWidth; // 宽度限制为最大宽度
        
        // 宽度固定后，需要重新计算高度
        textarea.style.width = `${targetWidth}px`;
        targetHeight = textarea.scrollHeight + verticalPadding; // 重新获取多行下的 scrollHeight
      } else {
        // 🎯 未超过时保持单行
        textarea.style.whiteSpace = 'nowrap';
      }
      
      // 设置最终的尺寸
      textarea.style.width = `${targetWidth}px`;
      textarea.style.height = `${targetHeight}px`;
      
      // 更新文本框尺寸到 React 状态
      const newWidth = targetWidth / scaleX;
      const newHeight = targetHeight / scaleY;
      
      setTextBoxes(prev => prev.map(tb => 
        tb.id === textBox.id 
          ? { ...tb, width: newWidth, height: newHeight }
          : tb
      ));
    };
    
    const handleInput = () => {
      if (!isFinished) {
        autoResize(); // 🎯 每次输入时自动调整大小
        // 实时更新文本框内容（使用debounce优化）
        debouncedUpdate(textBox.id, textarea.value);
      }
    };
    
    const debouncedUpdate = debounce((id: string, text: string) => {
      updateTextBoxContent(id, text);
    }, 300);

    // IME输入支持
    const handleCompositionStart = () => setIsComposing(true);
    const handleCompositionEnd = () => setIsComposing(false);

    const finishEditing = (finalText: string) => {
      if (isFinished) return;
      isFinished = true;
      
      // 清理事件监听器
      textarea.removeEventListener('keydown', handleKeyDown);
      textarea.removeEventListener('blur', handleBlur);
      textarea.removeEventListener('input', handleInput);
      textarea.removeEventListener('compositionstart', handleCompositionStart);
      textarea.removeEventListener('compositionend', handleCompositionEnd);
      
      // 移除DOM元素
      if (canvasContainer.contains(textarea)) {
        canvasContainer.removeChild(textarea);
      }
      
      // 完成文本编辑
      finishTextEditing(textBox.id, finalText);
    };

    // 绑定事件监听器
    // 🎯 初始化时调整一次大小
    setTimeout(() => autoResize(), 0);
    
    textarea.addEventListener('keydown', handleKeyDown);
    textarea.addEventListener('blur', handleBlur);
    textarea.addEventListener('input', handleInput);
    textarea.addEventListener('compositionstart', handleCompositionStart);
    textarea.addEventListener('compositionend', handleCompositionEnd);

  }, [devicePixelRatio, isComposing]);

  // 实时更新文本框内容
  const updateTextBoxContent = useCallback((id: string, text: string) => {
    setTextBoxes(prev => prev.map(textBox => 
      textBox.id === id 
        ? { ...textBox, text }
        : textBox
    ));
  }, []);

  // 开始编辑文本框
  const startEditingTextBox = (id: string) => {
    const textBox = textBoxes.find(tb => tb.id === id);
    if (textBox) {
      console.log('Starting edit for text box:', id);
      
      // 1. 更新状态，将目标文本框设为编辑模式
      // 这会自动触发 redrawCanvas，从而"擦除"Canvas 上的旧文本
      setTextBoxes(prev => prev.map(tb => ({
        ...tb,
        isEditing: tb.id === id,
        isSelected: tb.id === id
      })));
      
      setActiveTextBox(id);
      
      // 2. 创建 HTML 输入框
      // 使用 setTimeout 确保状态更新完成后再创建 DOM
      setTimeout(() => {
        const currentTextBox = textBoxes.find(tb => tb.id === id);
        if (currentTextBox) {
          const updatedTextBox = { ...currentTextBox, isEditing: true, isSelected: true };
          createEnhancedTextInput(updatedTextBox);
        }
      }, 0);
    }
  };

  // 完成文本编辑
  const finishTextEditing = (id: string, text: string) => {
    console.log('🏁 finishTextEditing called:', { id, text, isEmpty: !text.trim() });
    
    // 1. 如果文本为空，则直接删除该文本框
    if (!text.trim()) {
      console.log('❌ Text is empty, removing text box');
      setTextBoxes(prev => {
        const filtered = prev.filter(tb => tb.id !== id);
        console.log('📝 After removal:', filtered.length, 'boxes remaining');
        return filtered;
      });
    } else {
      // 2. 更新状态，退出编辑模式
      // 这会再次触发 redrawCanvas，从而将新文本"绘制"到 Canvas 上
      console.log('✅ Saving text and exiting edit mode');
      setTextBoxes(prev => {
        const updated = prev.map(tb => 
          tb.id === id 
            ? { ...tb, text, isEditing: false, isSelected: false }
            : tb
        );
        console.log('📝 After update:', updated.length, 'boxes, text saved:', text);
        return updated;
      });
    }
    
    setActiveTextBox(null);
    
    // 3. 触发自动保存
    console.log('💾 Scheduling auto-save...');
    scheduleAutoSave();
  };
  
  // 移动端触摸事件支持
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
      const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
      
      if (currentTool === 'text') {
        createTextBox(x, y);
      } else {
        // 处理其他绘图工具的触摸事件
        setIsDrawing(true);
        setStartPoint({ x, y });
      }
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    // 移动端绘图逻辑
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
    setStartPoint(null);
  };

  // 重新绘制画布（使用缓存层优化性能）- 只负责最终渲染
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('redrawCanvas: canvas not available');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('redrawCanvas: context not available');
      return;
    }

    console.log('redrawCanvas: Using cached drawing layer + rendering', textBoxes.filter(tb => !tb.isEditing).length, 'static text boxes');

    // 1. 清除整个画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 2. 首先绘制缓存的绘图内容（所有笔触、形状等）
    if (drawingCanvas) {
      ctx.drawImage(drawingCanvas, 0, 0);
    } else {
      // 如果没有缓存画布，设置白色背景
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // 3. 然后绘制所有静态文本框（覆盖在绘图层上方）
    textBoxes.forEach(textBox => {
      // 关键改动：只绘制非编辑状态的文本框
      if (textBox.text.trim() && !textBox.isEditing) {
        ctx.fillStyle = textBox.color;
        ctx.font = `${textBox.fontWeight} ${textBox.fontStyle} ${textBox.fontSize}px ${textBox.fontFamily}`;
        ctx.textBaseline = 'top'; // 改为 top，更容易与 div 的坐标对齐
        ctx.textAlign = textBox.alignment;
        
        // 根据对齐方式调整 x 坐标
        let drawX = textBox.x;
        if (textBox.alignment === 'center') {
          drawX = textBox.x + textBox.width / 2;
        } else if (textBox.alignment === 'right') {
          drawX = textBox.x + textBox.width;
        }
        
        // 绘制背景色（如果有）- 先绘制背景
        if (textBox.backgroundColor) {
          ctx.save();
          ctx.fillStyle = textBox.backgroundColor;
          ctx.fillRect(textBox.x, textBox.y, textBox.width, textBox.height);
          ctx.restore();
          // 重新设置文字颜色
          ctx.fillStyle = textBox.color;
        }
        
        // 处理多行文本绘制
        const lines = textBox.text.split('\n');
        const lineHeight = textBox.fontSize * 1.2; // 1.2倍行高
        
        lines.forEach((line, lineIndex) => {
          if (line.trim()) { // 只绘制非空行
            ctx.fillText(line, drawX, textBox.y + (lineIndex * lineHeight));
          }
        });
        
        // 绘制选中状态的边框（仅在Canvas上显示，不依赖React组件）
        if (textBox.isSelected && !textBox.isEditing) {
          ctx.save();
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(
            textBox.x - 2, 
            textBox.y - 2, 
            textBox.width + 4, 
            textBox.height + 4
          );
          ctx.setLineDash([]); // 重置虚线
          ctx.restore();
        }
      }
    });
  };

  // 🎯 删除未使用的死代码：syncTextBoxToServer 函数从未被调用
  // 文本框同步现在通过 saveCanvas 函数统一处理

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 🎯 处理文本框拖拽 - 只更新状态，不重绘 Canvas
    if (isDragging && activeTextBox) {
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;
      
      setTextBoxes(prev => prev.map(tb => 
        tb.id === activeTextBox 
          ? { ...tb, x: newX, y: newY }
          : tb
      ));
      
      // 🚀 性能优化：移除 redrawCanvas() 调用
      // TextBoxOverlay 的 div 会通过 React 状态更新流畅移动
      return;
    }

    // 🎯 处理文本框缩放 - 只更新状态，不重绘 Canvas
    if (isResizing && activeTextBox) {
      const textBox = textBoxes.find(tb => tb.id === activeTextBox);
      if (textBox) {
        const newWidth = Math.max(50, x - textBox.x);
        const newHeight = Math.max(20, y - textBox.y);
        
        setTextBoxes(prev => prev.map(tb => 
          tb.id === activeTextBox 
            ? { ...tb, width: newWidth, height: newHeight }
            : tb
        ));
        
        // 🚀 性能优化：移除 redrawCanvas() 调用
        // TextBoxOverlay 的 div 会通过 React 状态更新流畅缩放
      }
      return;
    }

    // 普通绘制模式
    if (!isDrawing || !startPoint) return;
    
    const ctx = canvas.getContext('2d');
    const drawingCtx = drawingCanvas?.getContext('2d');
    
    if (ctx) {
      switch (currentTool) {
        case 'pen':
          ctx.lineTo(x, y);
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = currentBrushSize;
          ctx.lineCap = 'round';
          ctx.stroke();
          
          // 同时在缓存画布上绘制
          if (drawingCtx) {
            drawingCtx.lineTo(x, y);
            drawingCtx.strokeStyle = currentColor;
            drawingCtx.lineWidth = currentBrushSize;
            drawingCtx.lineCap = 'round';
            drawingCtx.stroke();
          }
          break;
          
        case 'eraser':
          // 🎯 关键修复：橡皮擦使用白色绘制而不是clearRect
          // 这样避免了在缓存层产生透明洞
          const eraseOnContext = (context: CanvasRenderingContext2D) => {
            context.save();
            context.beginPath();
            // 使用剪切区域来确保只在圆形内绘制
            context.arc(x, y, currentBrushSize / 2, 0, 2 * Math.PI);
            context.clip();
            // 用白色填充该区域
            context.fillStyle = 'white';
            context.fillRect(
              x - currentBrushSize / 2, 
              y - currentBrushSize / 2, 
              currentBrushSize, 
              currentBrushSize
            );
            context.restore();
          };
          
          eraseOnContext(ctx);
          if (drawingCtx) {
            eraseOnContext(drawingCtx);
          }
          break;
          
        case 'rectangle':
        case 'circle':
          // 对于形状工具，我们需要实时预览
          drawShapePreview(startPoint.x, startPoint.y, x, y);
          break;
          
        default:
          ctx.lineTo(x, y);
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = currentBrushSize;
          ctx.lineCap = 'round';
          ctx.stroke();
          
          // 同时在缓存画布上绘制
          if (drawingCtx) {
            drawingCtx.lineTo(x, y);
            drawingCtx.strokeStyle = currentColor;
            drawingCtx.lineWidth = currentBrushSize;
            drawingCtx.lineCap = 'round';
            drawingCtx.stroke();
          }
          break;
      }
    }
  };

  // 存储绘制前的画布状态
  const [savedImageData, setSavedImageData] = useState<ImageData | null>(null);

  // 绘制形状预览
  const drawShapePreview = (startX: number, startY: number, currentX: number, currentY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 如果还没有保存原始状态，保存它
    if (!savedImageData) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setSavedImageData(imageData);
    }

    // 恢复到开始绘制前的状态
    if (savedImageData) {
      ctx.putImageData(savedImageData, 0, 0);
    }
    
    // 绘制预览形状
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentBrushSize;
    ctx.lineCap = 'round';
    
    if (currentTool === 'rectangle') {
      const width = currentX - startX;
      const height = currentY - startY;
      ctx.strokeRect(startX, startY, width, height);
    } else if (currentTool === 'circle') {
      const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 🎯 结束拖动 - 现在重绘 Canvas 固化最终位置
    if (isDragging) {
      setIsDragging(false);
      // 重绘以固化文本框的最终位置
      setTimeout(() => redrawCanvas(), 0);
      scheduleAutoSave();
      return;
    }

    // 🎯 结束缩放 - 现在重绘 Canvas 固化最终尺寸
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      // 重绘以固化文本框的最终尺寸
      setTimeout(() => redrawCanvas(), 0);
      scheduleAutoSave();
      return;
    }

    if (isDrawing && startPoint && (currentTool === 'rectangle' || currentTool === 'circle')) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        const ctx = canvas.getContext('2d');
        const drawingCtx = drawingCanvas?.getContext('2d');
        
        if (ctx) {
          // 恢复到开始绘制前的状态，然后绘制最终形状
          if (savedImageData) {
            ctx.putImageData(savedImageData, 0, 0);
          }
          
          // 绘制最终形状到主画布和缓存画布
          const drawShape = (context: CanvasRenderingContext2D) => {
            context.strokeStyle = currentColor;
            context.lineWidth = currentBrushSize;
            context.lineCap = 'round';
            
            if (currentTool === 'rectangle') {
              const width = x - startPoint.x;
              const height = y - startPoint.y;
              context.strokeRect(startPoint.x, startPoint.y, width, height);
            } else if (currentTool === 'circle') {
              const radius = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
              context.beginPath();
              context.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
              context.stroke();
            }
          };
          
          // 在主画布上绘制
          drawShape(ctx);
          
          // 在缓存画布上绘制
          if (drawingCtx) {
            drawShape(drawingCtx);
          }
          
          // 重新绘制文本框
          redrawCanvas();
          
          // 触发自动保存
          scheduleAutoSave();
        }
      }
    }
    
    // 对于pen和eraser工具，也触发自动保存
    if (isDrawing && (currentTool === 'pen' || currentTool === 'eraser')) {
      scheduleAutoSave();
    }
    
    // 清理状态
    setIsDrawing(false);
    setStartPoint(null);
    setSavedImageData(null);
  };

  // 文本框交互层组件（React层）- 清晰的单一职责交互
  const TextBoxOverlay = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    // 🎯 关键修复：统一定位策略，使用像素而非百分比
    if (!canvas || !container) return null;
    
    const containerRect = container.getBoundingClientRect();
    const scaleX = containerRect.width / canvas.width;
    const scaleY = containerRect.height / canvas.height;
    
    return (
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 999 }}>
        {textBoxes.filter(tb => !tb.isEditing).map(textBox => (
          <div
            key={textBox.id}
            className={`absolute pointer-events-auto ${
              textBox.isSelected ? 'ring-2 ring-blue-400 shadow-lg' : ''
            }`}
            style={{
              // 🎯 关键修复：使用像素定位，与 createEnhancedTextInput 保持一致
              position: 'absolute',
              left: '0',
              top: '0',
              transform: `translate(${textBox.x * scaleX}px, ${textBox.y * scaleY}px)`,
              width: `${textBox.width * scaleX}px`,
              height: `${textBox.height * scaleY}px`,
              cursor: currentTool === 'text' ? 'pointer' : 'default',
              zIndex: textBox.zIndex,
              // 透明背景，纯粹作为交互热区
              backgroundColor: process.env.NODE_ENV === 'development' ? 'rgba(255,0,0,0.1)' : 'transparent',
              // 🎯 性能优化：拖拽时禁用过渡动画
              transition: isDragging || isResizing ? 'none' : 'all 0.2s'
            }}
          
          // 单击：只选中，不拖拽，不编辑
          onClick={(e) => {
            e.stopPropagation();
            if (currentTool === 'text') {
              console.log('TextBox clicked - selecting:', textBox.id);
              setActiveTextBox(textBox.id);
              setTextBoxes(prev => prev.map(tb => ({
                ...tb,
                isSelected: tb.id === textBox.id,
                isEditing: false // 确保单击不会进入编辑模式
              })));
            }
          }}
          
          // 双击：进入编辑模式
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (currentTool === 'text') {
              console.log('TextBox double-clicked - starting edit:', textBox.id);
              startEditingTextBox(textBox.id);
            }
          }}
        >
          {/* 
            重要：这里不再渲染文本内容！
            文本的最终显示完全交给 Canvas 的 redrawCanvas 函数。
            这个 div 只是一个透明的交互层。
          */}

          {/* 只在选中且非编辑状态下显示控制手柄 */}
          {textBox.isSelected && !textBox.isEditing && (
            <>
              {/* 拖拽按钮：只有 mousedown 在这个手柄上时，才设置 isDragging */}
              <div 
                className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-move"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  console.log('Drag handle clicked for textBox:', textBox.id);
                  setIsDragging(true);
                  
                  // 设置 dragOffset 的逻辑移到这里
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                    setDragOffset({ 
                      x: x - textBox.x, 
                      y: y - textBox.y 
                    });
                  }
                }}
              />
              
              {/* 缩放按钮：精确控制缩放行为 */}
              <div 
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  console.log('Resize handle clicked for textBox:', textBox.id);
                  setIsResizing(true);
                  setResizeHandle('se');
                  
                  // 设置缩放起始点
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                    setDragOffset({ 
                      x: x - (textBox.x + textBox.width), 
                      y: y - (textBox.y + textBox.height) 
                    });
                  }
                }}
              />
            </>
          )}
          </div>
        ))}
      </div>
    );
  };

  // 🎯 获取自定义光标样式的辅助函数
  const getCustomCursorStyle = (): React.CSSProperties => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container) return { display: 'none' };
    
    // 计算画笔在屏幕上的实际像素大小
    const containerRect = container.getBoundingClientRect();
    const scale = containerRect.width / canvas.width;
    const displaySize = currentBrushSize * scale;

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      borderRadius: '50%',
      pointerEvents: 'none',
      // 🎯 关键：通过 transform 将 div 的中心移动到鼠标指针位置
      transform: 'translate(-50%, -50%)',
      transition: 'width 0.1s, height 0.1s',
      display: 'none',
      zIndex: 10000,
    };

    switch (currentTool) {
      case 'pen':
        return {
          ...baseStyle,
          width: `${displaySize}px`,
          height: `${displaySize}px`,
          backgroundColor: currentColor,
          opacity: 0.5,
        };
      case 'eraser':
        return {
          ...baseStyle,
          width: `${displaySize}px`,
          height: `${displaySize}px`,
          border: '2px solid #000',
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
        };
      case 'rectangle':
      case 'circle':
      case 'text':
        return {
          ...baseStyle,
          width: '20px',
          height: '20px',
          border: '1px solid #000',
          // 模拟十字准星
          backgroundImage: `
            linear-gradient(to right, #000 0%, #000 100%),
            linear-gradient(to bottom, #000 0%, #000 100%)`,
          backgroundSize: '1px 100%, 100% 1px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center, center center',
        };
      default:
        return { display: 'none' };
    }
  };

  // 🎯 处理鼠标移动更新自定义光标位置
  const handleCustomCursorMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (customCursorRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 使用 transform 来移动，性能最好
      customCursorRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative flex items-center justify-center bg-white"
      onMouseMove={handleCustomCursorMove}
      onMouseEnter={() => {
        if (customCursorRef.current) customCursorRef.current.style.display = 'block';
      }}
      onMouseLeave={() => {
        if (customCursorRef.current) customCursorRef.current.style.display = 'none';
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          maxWidth: '100%', 
          maxHeight: '100%', 
          objectFit: 'contain',
          cursor: 'none' // 🎯 隐藏默认光标
        }}
      />
      
      {/* 文本框覆盖层 */}
      <TextBoxOverlay />
      
      {/* 🎯 自定义光标元素 */}
      <div
        ref={customCursorRef}
        style={getCustomCursorStyle()}
      />
      
      {/* 用户信息 */}
      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {participantName} ({userRole})
      </div>

      {/* 开发调试面板 - 仅在开发环境显示 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-gray-800/90 text-white text-xs p-3 rounded-lg max-w-xs">
          <div className="font-bold mb-2">🔧 缓存调试面板</div>
          <div className="space-y-1">
            <div>📊 Classroom: <code>{classroomSlug}</code></div>
            <div>🔑 Session: <code>{sessionId}</code></div>
            <div>📝 Text Boxes: {textBoxes.length}</div>
            <div>⏰ Auto-save: {autoSaveTimer ? '⏳ Scheduled' : '⭕ None'}</div>
          </div>
          <div className="mt-2 space-x-1">
            <button
              onClick={() => saveCanvas()}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
            >
              💾 Save
            </button>
            <button
              onClick={() => loadWhiteboardContent()}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
            >
              🔄 Reload
            </button>
            <button
              onClick={clearWhiteboardCache}
              className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
            >
              🗑️ Cache
            </button>
          </div>
          <div className="mt-1 space-y-1">
            <button
              onClick={setupStorage}
              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs w-full"
            >
              🔧 Auto Setup
            </button>
            <button
              onClick={showSetupInstructions}
              className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs w-full"
            >
              📋 Manual Guide
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-300">
            <div>Cache Key: <code>whiteboard:{classroomSlug}:{sessionId}</code></div>
            <div>Storage Path: <code>private/whiteboard/{classroomSlug}/{sessionId}/canvas.png</code></div>
          </div>
        </div>
      )}
    </div>
  );
});

WhiteboardCanvas.displayName = 'WhiteboardCanvas';
