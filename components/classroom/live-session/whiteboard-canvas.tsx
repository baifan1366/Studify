'use client';

import type React from 'react';
import { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { toast } from 'sonner';
// Use custom debounce function to avoid lodash dependency
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
};

interface WhiteboardCanvasProps {
  classroomSlug: string;
  sessionId?: string;
  userRole?: 'student' | 'tutor';
  participantName?: string;
  width?: number;
  height?: number;
  // Whiteboard toolbar settings
  currentTool?: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  currentColor?: string;
  currentBrushSize?: number;
  // Additional props for whiteboard-manager compatibility
  whiteboardId?: string;
  isReadOnly?: boolean;
  className?: string;
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
  currentBrushSize = 4,
  whiteboardId,
  isReadOnly = false,
  className
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [tempCanvas, setTempCanvas] = useState<HTMLCanvasElement | null>(null);
  // Drawing layer cache - used to cache all non-text strokes
  const [drawingCanvas, setDrawingCanvas] = useState<HTMLCanvasElement | null>(null);
  
  // Enhanced text box state
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
  const [isComposing, setIsComposing] = useState(false); // IME input state
  const containerRef = useRef<HTMLDivElement>(null);
  const customCursorRef = useRef<HTMLDivElement>(null); // 🎯 Custom cursor reference
  
  // 🎯 Use ref to store latest textBoxes, avoid useEffect dependency array size changes
  const textBoxesRef = useRef<TextBox[]>([]);
  useEffect(() => {
    textBoxesRef.current = textBoxes;
  }, [textBoxes]);
  
  // 🎯 Use ref to store stable props, reduce event listener re-registration
  const propsRef = useRef({ classroomSlug, sessionId, userRole, participantName });
  useEffect(() => {
    propsRef.current = { classroomSlug, sessionId, userRole, participantName };
  }, [classroomSlug, sessionId, userRole, participantName]);
  
  // Detect device pixel ratio
  useEffect(() => {
    const updateDPR = () => {
      setDevicePixelRatio(window.devicePixelRatio || 1);
    };
    updateDPR();
    window.addEventListener('resize', updateDPR);
    return () => window.removeEventListener('resize', updateDPR);
  }, []);
  
  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const drawingCtx = drawingCanvas?.getContext('2d');
    
    // 1. Clear main canvas
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    
    // 2. 🎯 Clear drawing cache canvas
    if (drawingCtx && drawingCanvas) {
      drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      drawingCtx.fillStyle = 'white';
      drawingCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    }
    
    // 3. 🎯 Clear text box state
    setTextBoxes([]);
    setActiveTextBox(null);
    
    toast.success('Canvas completely cleared');
    
    // 4. Trigger auto-save to persist cleared state
    scheduleAutoSave();
  };

  // Save canvas to bucket storage (automatically clear Redis cache)
  const saveCanvas = async () => {
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        console.log('💾 Starting canvas save process...');
        
        // Convert canvas to base64 data
        const imageData = canvas.toDataURL('image/png');
        console.log('📸 Canvas converted to base64, size:', imageData.length);
        
        // 🎯 Use ref to get latest textBoxes, avoid closure issues
        const currentTextBoxes = textBoxesRef.current;
        console.log('🔍 Current textBoxes from ref:', currentTextBoxes.length);
        
        // Prepare text box data (exclude temporary UI state)
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
        
        // Call API to save to bucket storage
        const startTime = performance.now();
        const response = await fetch(`/api/classroom/${classroomSlug}/whiteboard`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: whiteboardId || sessionId,
            imageData,
            width: canvas.width,
            height: canvas.height,
            textBoxes: textBoxData, // 🎯 Critical fix: send complete text box data
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
          toast.success('Whiteboard saved and cache updated');
        } else {
          const errorData = await response.text();
          console.error('❌ Save API failed:', response.status, response.statusText, errorData);
          throw new Error(`Save failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('💥 Failed to save whiteboard:', error);
        const errorMessage = error instanceof Error ? error.message : 'Please try again';
        toast.error(`Save failed: ${errorMessage}`);
      }
    }
  };

  // Download canvas
  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `whiteboard-${classroomSlug}-${sessionId}-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast.success('Whiteboard downloaded');
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    clearCanvas,
    saveCanvas,
    downloadCanvas,
    clearCache: clearWhiteboardCache,
    reloadWhiteboard: loadWhiteboardContent,
  }));

  // Auto-save canvas state
  const autoSaveCanvas = async () => {
    try {
      console.log('🔄 Auto-save triggered');
      await saveCanvas();
      console.log('✅ Auto-saved canvas state successfully');
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      // Don't show error message when auto-save fails, avoid interrupting user
      // Only log error in console
    }
  };

  // Trigger auto-save
  const scheduleAutoSave = () => {
    // Clear previous timer
    if (autoSaveTimer) {
      console.log('⏰ Clearing previous auto-save timer');
      clearTimeout(autoSaveTimer);
    }
    
    // Set new timer, auto-save after 5 seconds
    console.log('⏱️ Scheduling auto-save in 5 seconds...');
    const timer = setTimeout(() => {
      autoSaveCanvas();
    }, 5000);
    
    setAutoSaveTimer(timer);
  };

  // Manual cache clearing function
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
        toast.success('Cache cleared');
      } else {
        console.error('❌ Failed to clear cache:', response.status);
        toast.error('Failed to clear cache');
      }
    } catch (error) {
      console.error('💥 Error clearing cache:', error);
      toast.error('Error occurred while clearing cache');
    }
  };

  // Setup storage buckets function
  const setupStorage = async () => {
    try {
      console.log('🔧 Setting up storage buckets...');
      toast.info('Setting up storage buckets...');
      
      const response = await fetch('/api/storage/setup', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Storage setup completed:', result);
        toast.success(`Storage setup complete! Created ${result.buckets.length} buckets`);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to setup storage:', errorData);
        console.log('📋 Manual setup required. Please:');
        console.log('1. Go to Supabase Dashboard > Storage');
        console.log('2. Create bucket named "classroom-attachment"');
        console.log('3. Set as Private, 10MB limit, allow image/* types');
        toast.error('Storage setup failed - Please manually create buckets in Supabase Dashboard');
      }
    } catch (error) {
      console.error('💥 Error setting up storage:', error);
      toast.error('Error occurred during storage setup');
    }
  };

  // Show setup instructions
  const showSetupInstructions = () => {
    console.log('📋 Manual setup instructions:');
    console.log('1. Login to Supabase Dashboard');
    console.log('2. Go to Storage > Buckets');
    console.log('3. Create bucket: classroom-attachment');
    console.log('4. Settings: Private, 10MB, image/* types');
    toast.info('Please check console for detailed setup instructions');
  };

  // Clean up timer on component unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  // 🎯 Save before page exit - use ref to reduce event listener re-registration
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 🎯 Use sendBeacon API for reliable save before page unload
      const canvas = canvasRef.current;
      if (canvas && navigator.sendBeacon) {
        try {
          const imageData = canvas.toDataURL('image/png');
          
          // Get latest values from ref
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
  }, []); // 🎯 Empty dependency array - listener registered only once

  // 🎯 Core fix: Handle canvas size changes, maintain content proportions (enhanced version)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Save old dimensions for calculating scale ratios
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;

    // If new dimensions equal old dimensions, do nothing
    if (oldWidth === width && oldHeight === height) {
      return;
    }

    // --- If first load (oldWidth is 0), execute initialization logic ---
    if (oldWidth === 0 || oldHeight === 0) {
      console.log(`🎨 Initializing canvas to ${width}x${height}`);
      canvas.width = width;
      canvas.height = height;
      
      // Initialize main canvas background
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
      }

      // Initialize temporary canvas
      const temp = document.createElement('canvas');
      temp.width = width;
      temp.height = height;
      setTempCanvas(temp);
      
      // Initialize drawing cache canvas
      const newDrawingCanvas = document.createElement('canvas');
      newDrawingCanvas.width = width;
      newDrawingCanvas.height = height;
      const drawingCtx = newDrawingCanvas.getContext('2d');
      if (drawingCtx) {
        drawingCtx.fillStyle = 'white';
        drawingCtx.fillRect(0, 0, width, height);
      }
      setDrawingCanvas(newDrawingCanvas);

      // Load server content on first load
      loadWhiteboardContent();
      return;
    }

    // --- If not first load, execute content scaling logic ---
    console.log(`🔄 Resizing canvas from ${oldWidth}x${oldHeight} to ${width}x${height}`);

    // 2. Store current drawing cache (drawingCanvas) in a temporary image
    // This step is async, so we put all subsequent logic in the onload callback
    const tempDrawingImage = new Image();
    if (drawingCanvas) {
      tempDrawingImage.src = drawingCanvas.toDataURL();
    }

    tempDrawingImage.onload = () => {
      // 3. Calculate scale ratios
      const scaleX = width / oldWidth;
      const scaleY = height / oldHeight;
      console.log(`📐 Scale factors: X=${scaleX.toFixed(3)}, Y=${scaleY.toFixed(3)}`);

      // 4. (Vector part) Scale all text boxes' position, size and fonts proportionally
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
          fontSize: tb.fontSize * Math.min(scaleX, scaleY) // Font scales by smaller ratio to maintain appearance
        }));
      });
      
      // 5. Adjust main canvas and cache canvas dimensions (this will clear them)
      canvas.width = width;
      canvas.height = height;
      
      // Create new temporary canvas
      const newTempCanvas = document.createElement('canvas');
      newTempCanvas.width = width;
      newTempCanvas.height = height;
      setTempCanvas(newTempCanvas);
      
      const newDrawingCanvas = document.createElement('canvas');
      newDrawingCanvas.width = width;
      newDrawingCanvas.height = height;
      
      // 6. (Raster part) Draw temporary image back to new cache canvas at scale
      const drawingCtx = newDrawingCanvas.getContext('2d');
      if (drawingCtx) {
        drawingCtx.fillStyle = 'white';
        drawingCtx.fillRect(0, 0, width, height); // Fill background first
        drawingCtx.drawImage(tempDrawingImage, 0, 0, width, height);
        
        console.log('✅ Drawing content scaled and restored');
        
        // Update drawingCanvas state
        setDrawingCanvas(newDrawingCanvas);
        
        // 7. Trigger final redraw
        // Use setTimeout to ensure execution after all React state updates complete
        setTimeout(() => {
          console.log('🎨 Final redraw after resize');
          redrawCanvas();
        }, 0);
      }
    };

    // If drawingCanvas is empty (e.g., user hasn't drawn anything), also need to adjust size
    if (!drawingCanvas || !drawingCanvas.toDataURL()) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
      }
    }

  }, [width, height]); // Dependencies now only care about width and height changes

  // 🎯 Performance optimization: Auto-redraw canvas, but skip redraw during drag/resize
  // Principle: During drag, only update React state, TextBoxOverlay div will move smoothly
  // Old text on Canvas will be covered by div, only redraw on mouseUp
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      // 🎯 Key optimization: Completely skip redraw during drag/resize
      if (isDragging || isResizing) {
        console.log('⏭️ Skipping canvas redraw during drag/resize for performance');
        return;
      }
      
      // Normal case: redraw immediately
      console.log('Redrawing canvas due to textBoxes change, count:', textBoxes.length);
      redrawCanvas();
    }
  }, [textBoxes, isDragging, isResizing, classroomSlug, sessionId]);

  // Load whiteboard content (from Redis cache or bucket storage)
  const loadWhiteboardContent = async () => {
    try {
      // Check if required parameters exist
      const effectiveSessionId = whiteboardId || sessionId;
      if (!classroomSlug || !effectiveSessionId) {
        console.warn('🚫 Missing classroomSlug or sessionId/whiteboardId, skipping whiteboard load');
        return;
      }

      console.log('🔄 Loading whiteboard content for:', { classroomSlug, effectiveSessionId });
      console.log(`📡 Fetching from: /api/classroom/${classroomSlug}/whiteboard?session_id=${effectiveSessionId}`);
      
      // Load whiteboard image from Redis cache or bucket storage
      const startTime = performance.now();
      // 🎯 Critical fix: Force bypass browser cache, always get latest data from server
      // Strategy 1: Add timestamp parameter to ensure URL is different each time
      const timestamp = Date.now();
      const imageResponse = await fetch(
        `/api/classroom/${classroomSlug}/whiteboard?session_id=${effectiveSessionId}&_t=${timestamp}`,
        {
          cache: 'no-store', // Strategy 2: Disable browser cache
          headers: {
            // Strategy 3: Add HTTP headers to tell browser and proxies not to cache
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
          // Load latest canvas data
          const latestData = images[0];
          // 🎯 Critical fix: Support both field name formats (textBoxes and text_boxes)
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
          
          // 1. Load background image
          if (latestData.image_data) {
            console.log('🎨 Loading existing whiteboard image...');
            loadCanvasImage(latestData.image_data);
          }
          
          // 2. 🎯 Critical fix: Restore text box state
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
            
            // Set textBox data retrieved from API to state
            // Need to ensure each textBox is supplemented with client-side temporary states like isEditing and isSelected
            const restoredTextBoxes = textBoxesData.map((tb: any) => ({
              ...tb,
              isEditing: false, // Default not in editing state
              isSelected: false, // Default not in selected state
            }));
            
            console.log('✅ Setting textBoxes state with', restoredTextBoxes.length, 'boxes');
            setTextBoxes(restoredTextBoxes);
            
            // 🎯 Trust useEffect to handle redraw automatically, no need to call manually
            // useEffect will automatically trigger redrawCanvas after textBoxes update
            
            toast.success(`Whiteboard image and ${textBoxesData.length} text boxes loaded`);
          } else {
            console.warn('⚠️ No textBoxes data or invalid format');
            console.warn('Available fields in latestData:', Object.keys(latestData));
            if (latestData.image_data) {
              toast.success('Whiteboard image loaded');
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
      // Don't prevent normal use of whiteboard, even if loading fails
    }
  };

  // Load canvas image
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
    
    // If text tool, default behavior is to deselect all
    // This function should only execute fully when click event is not captured by any text box Overlay
    if (currentTool === 'text') {
      // Delayed execution, give Overlay's stopPropagation some time
      setTimeout(() => {
        // Check if there's still no active text box
        // If activeTextBox was set after Overlay click, don't execute logic here
        if (!activeTextBox) {
          console.log('Canvas clicked in text mode - creating new text box at:', { x, y });
          setTextBoxes(prev => prev.map(tb => ({ ...tb, isSelected: false, isEditing: false })));
          createTextBox(x, y); // Only create when clicking on empty space
        } else {
          console.log('Text box already active, skipping creation');
        }
      }, 0);
      return;
    }

    // Non-text tools: deselect all text boxes
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
        
        // Also start drawing on cache canvas
        if (drawingCtx) {
          drawingCtx.beginPath();
          drawingCtx.moveTo(x, y);
        }
      } else if (currentTool === 'rectangle' || currentTool === 'circle') {
        // Save canvas state before starting to draw
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setSavedImageData(imageData);
      }
    }
  };

  // Create enhanced text box
  const createTextBox = (x: number, y: number) => {
    console.log('🎯 createTextBox called at:', { x, y });
    console.log('📊 Current textBoxes count:', textBoxes.length);
    
    const fontSize = Math.max(12, currentBrushSize * 3);
    const newTextBox: TextBox = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      width: fontSize, // 🎯 Initial width equals one character, autoResize will adjust immediately
      height: fontSize * 1.5, // 🎯 Initial height approximately equals one line
      text: '',
      color: currentColor,
      backgroundColor: undefined,
      fontSize,
      fontFamily: 'monospace', // 🎯 Use monospace font to ensure consistent character width
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
    
    // Create enhanced text input component
    setTimeout(() => createEnhancedTextInput(newTextBox), 10);
  };

  // 🎯 Create enhanced text input component - adaptive size, smooth editing
  const createEnhancedTextInput = useCallback((textBox: TextBox) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // High DPI adaptation
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    
    // Use textarea to support multi-line input
    const textarea = document.createElement('textarea');
    textarea.value = textBox.text || '';
    
    // 🎯 Precise position calculation
    const cssX = textBox.x * scaleX;
    const cssY = textBox.y * scaleY;
    const scaledFontSize = textBox.fontSize * scaleY;
    
    // 🎯 Enhanced style settings - precisely match text size
    Object.assign(textarea.style, {
      position: 'absolute',
      left: `${cssX}px`,
      top: `${cssY}px`,
      minWidth: `${textBox.fontSize * scaleX}px`, // 🎯 Minimum width is one character
      maxWidth: `${canvas.width * scaleX}px`, // 🎯 Maximum width is canvas width
      width: 'auto', // 🎯 Auto width
      height: 'auto', // 🎯 Auto height
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
      resize: 'none', // 🎯 Disable manual resize, use auto-resize instead
      zIndex: '1000',
      padding: '2px', // 🎯 Reduce padding to better fit text
      lineHeight: '1.2', // 🎯 Line height slightly greater than 1, more natural
      overflow: 'hidden',
      whiteSpace: 'nowrap', // 🎯 Default no line wrap
      wordBreak: 'keep-all', // 🎯 Keep words intact
      boxSizing: 'border-box' // 🎯 Include padding and border in width/height
    });
    
    const canvasContainer = canvas.parentElement;
    if (!canvasContainer) return;

    canvasContainer.style.position = 'relative';
    canvasContainer.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    let isFinished = false;
    
    // Enhanced event handling
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent accidental triggering during IME input
      if (isComposing) return;
      
      if (e.key === 'Escape') {
        e.preventDefault();
        finishEditing('');
      } else if (e.key === 'Enter' && e.shiftKey) {
        // Shift+Enter: line break, don't end editing
        return;
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // Enter: end editing
        e.preventDefault();
        finishEditing(textarea.value);
      }
    };

    const handleBlur = () => {
      // Delayed execution, allow user to click resize handle
      setTimeout(() => {
        if (!isFinished) {
          finishEditing(textarea.value);
        }
      }, 100);
    };

    // 🎯 Auto-adjust text box size - precisely match text dimensions
    const autoResize = () => {
      // Temporarily reset to get true content dimensions
      textarea.style.width = 'auto';
      textarea.style.height = 'auto'; // Using 'auto' is more reliable
      
      const scrollWidth = textarea.scrollWidth;
      const scrollHeight = textarea.scrollHeight;
      
      // 🎯 Critical fix: Get textarea's computed styles to obtain real padding and border
      const computedStyle = window.getComputedStyle(textarea);
      const horizontalPadding = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
      const verticalPadding = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
      const horizontalBorder = parseFloat(computedStyle.borderLeftWidth) + parseFloat(computedStyle.borderRightWidth);
      const verticalBorder = parseFloat(computedStyle.borderTopWidth) + parseFloat(computedStyle.borderBottomWidth);
      
      // Calculate final required width and height (box-sizing: border-box automatically handles border)
      let targetWidth = scrollWidth + horizontalPadding;
      let targetHeight = scrollHeight + verticalPadding;
      
      // Check if exceeds canvas width
      const maxWidth = (canvas.width * scaleX) - cssX - 20; // Leave margin
      
      if (targetWidth > maxWidth) {
        // 🎯 Only allow line wrap when exceeding canvas width
        textarea.style.whiteSpace = 'normal';
        targetWidth = maxWidth; // Limit width to maximum width
        
        // After fixing width, need to recalculate height
        textarea.style.width = `${targetWidth}px`;
        targetHeight = textarea.scrollHeight + verticalPadding; // Re-get scrollHeight for multi-line
      } else {
        // 🎯 Keep single line when not exceeding
        textarea.style.whiteSpace = 'nowrap';
      }
      
      // Set final dimensions
      textarea.style.width = `${targetWidth}px`;
      textarea.style.height = `${targetHeight}px`;
      
      // Update text box dimensions to React state
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
        autoResize(); // 🎯 Auto-adjust size on each input
        // Real-time update text box content (optimized with debounce)
        debouncedUpdate(textBox.id, textarea.value);
      }
    };
    
    const debouncedUpdate = debounce((id: string, text: string) => {
      updateTextBoxContent(id, text);
    }, 300);

    // IME input support
    const handleCompositionStart = () => setIsComposing(true);
    const handleCompositionEnd = () => setIsComposing(false);

    const finishEditing = (finalText: string) => {
      if (isFinished) return;
      isFinished = true;
      
      // Clean up event listeners
      textarea.removeEventListener('keydown', handleKeyDown);
      textarea.removeEventListener('blur', handleBlur);
      textarea.removeEventListener('input', handleInput);
      textarea.removeEventListener('compositionstart', handleCompositionStart);
      textarea.removeEventListener('compositionend', handleCompositionEnd);
      
      // Remove DOM element
      if (canvasContainer.contains(textarea)) {
        canvasContainer.removeChild(textarea);
      }
      
      // Complete text editing
      finishTextEditing(textBox.id, finalText);
    };

    // Bind event listeners
    // 🎯 Adjust size once during initialization
    setTimeout(() => autoResize(), 0);
    
    textarea.addEventListener('keydown', handleKeyDown);
    textarea.addEventListener('blur', handleBlur);
    textarea.addEventListener('input', handleInput);
    textarea.addEventListener('compositionstart', handleCompositionStart);
    textarea.addEventListener('compositionend', handleCompositionEnd);

  }, [devicePixelRatio, isComposing]);

  // Real-time update text box content
  const updateTextBoxContent = useCallback((id: string, text: string) => {
    setTextBoxes(prev => prev.map(textBox => 
      textBox.id === id 
        ? { ...textBox, text }
        : textBox
    ));
  }, []);

  // Start editing text box
  const startEditingTextBox = (id: string) => {
    const textBox = textBoxes.find(tb => tb.id === id);
    if (textBox) {
      console.log('Starting edit for text box:', id);
      
      // 1. Update state, set target text box to edit mode
      // This will automatically trigger redrawCanvas, thus "erase" old text on Canvas
      setTextBoxes(prev => prev.map(tb => ({
        ...tb,
        isEditing: tb.id === id,
        isSelected: tb.id === id
      })));
      
      setActiveTextBox(id);
      
      // 2. Create HTML input box
      // Use setTimeout to ensure DOM creation after state update completion
      setTimeout(() => {
        const currentTextBox = textBoxes.find(tb => tb.id === id);
        if (currentTextBox) {
          const updatedTextBox = { ...currentTextBox, isEditing: true, isSelected: true };
          createEnhancedTextInput(updatedTextBox);
        }
      }, 0);
    }
  };

  // Complete text editing
  const finishTextEditing = (id: string, text: string) => {
    console.log('🏁 finishTextEditing called:', { id, text, isEmpty: !text.trim() });
    
    // 1. If text is empty, directly delete the text box
    if (!text.trim()) {
      console.log('❌ Text is empty, removing text box');
      setTextBoxes(prev => {
        const filtered = prev.filter(tb => tb.id !== id);
        console.log('📝 After removal:', filtered.length, 'boxes remaining');
        return filtered;
      });
    } else {
      // 2. Update state, exit edit mode
      // This will trigger redrawCanvas again, thus "draw" new text to Canvas
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
    
    // 3. Trigger auto-save
    console.log('💾 Scheduling auto-save...');
    scheduleAutoSave();
  };
  
  // Mobile touch event support
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
        // Handle touch events for other drawing tools
        setIsDrawing(true);
        setStartPoint({ x, y });
      }
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    // Mobile drawing logic
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
    setStartPoint(null);
  };

  // Redraw canvas (use cache layer to optimize performance) - only responsible for final rendering
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

    // 1. Clear entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 2. First draw cached drawing content (all strokes, shapes, etc.)
    if (drawingCanvas) {
      ctx.drawImage(drawingCanvas, 0, 0);
    } else {
      // If no cache canvas, set white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // 3. Then draw all static text boxes (overlay on top of drawing layer)
    textBoxes.forEach(textBox => {
      // Key change: only draw non-editing text boxes
      if (textBox.text.trim() && !textBox.isEditing) {
        ctx.fillStyle = textBox.color;
        ctx.font = `${textBox.fontWeight} ${textBox.fontStyle} ${textBox.fontSize}px ${textBox.fontFamily}`;
        ctx.textBaseline = 'top'; // Change to top, easier to align with div coordinates
        ctx.textAlign = textBox.alignment;
        
        // Adjust x coordinate based on alignment
        let drawX = textBox.x;
        if (textBox.alignment === 'center') {
          drawX = textBox.x + textBox.width / 2;
        } else if (textBox.alignment === 'right') {
          drawX = textBox.x + textBox.width;
        }
        
        // Draw background color (if any) - draw background first
        if (textBox.backgroundColor) {
          ctx.save();
          ctx.fillStyle = textBox.backgroundColor;
          ctx.fillRect(textBox.x, textBox.y, textBox.width, textBox.height);
          ctx.restore();
          // Reset text color
          ctx.fillStyle = textBox.color;
        }
        
        // Handle multi-line text drawing
        const lines = textBox.text.split('\n');
        const lineHeight = textBox.fontSize * 1.2; // 1.2x line height
        
        lines.forEach((line, lineIndex) => {
          if (line.trim()) { // Only draw non-empty lines
            ctx.fillText(line, drawX, textBox.y + (lineIndex * lineHeight));
          }
        });
        
        // Draw selected state border (only show on Canvas, don't depend on React components)
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
          ctx.setLineDash([]); // Reset dash pattern
          ctx.restore();
        }
      }
    });
  };

  // 🎯 Delete unused dead code: syncTextBoxToServer function was never called
  // Text box synchronization now handled uniformly through saveCanvas function

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 🎯 Handle text box dragging - only update state, don't redraw Canvas
    if (isDragging && activeTextBox) {
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;
      
      setTextBoxes(prev => prev.map(tb => 
        tb.id === activeTextBox 
          ? { ...tb, x: newX, y: newY }
          : tb
      ));
      
      // 🚀 Performance optimization: remove redrawCanvas() call
      // TextBoxOverlay's div will move smoothly through React state updates
      return;
    }

    // 🎯 Handle text box resizing - only update state, don't redraw Canvas
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
        
        // 🚀 Performance optimization: remove redrawCanvas() call
        // TextBoxOverlay's div will scale smoothly through React state updates
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
          // Also draw on cache canvas
          if (drawingCtx) {
            drawingCtx.lineTo(x, y);
            drawingCtx.strokeStyle = currentColor;
            drawingCtx.lineWidth = currentBrushSize;
            drawingCtx.lineCap = 'round';
            drawingCtx.stroke();
          }
          break;
          
        case 'eraser':
          // 🎯 Key fix: eraser uses white drawing instead of clearRect
          // This avoids creating transparent holes in cache layer
          const eraseOnContext = (context: CanvasRenderingContext2D) => {
            context.save();
            context.fillStyle = 'white';
            context.beginPath();
            // Use clipping area to ensure drawing only within circle
            context.arc(x, y, currentBrushSize / 2, 0, 2 * Math.PI);
            context.clip();
            // Fill area with white
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
          // For shape tools, we need real-time preview
          drawShapePreview(startPoint.x, startPoint.y, x, y);
          break;
          
        default:
          ctx.lineTo(x, y);
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = currentBrushSize;
          ctx.lineCap = 'round';
          ctx.stroke();
          
          // Also draw on cache canvas
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

  // Store canvas state before drawing
  const [savedImageData, setSavedImageData] = useState<ImageData | null>(null);

  // Draw shape preview
  const drawShapePreview = (startX: number, startY: number, currentX: number, currentY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If original state not saved yet, save it
    if (!savedImageData) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setSavedImageData(imageData);
    }

    // Restore to state before starting to draw
    if (savedImageData) {
      ctx.putImageData(savedImageData, 0, 0);
    }
    
    // Draw preview shape
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
    // 🎯 End dragging - now redraw Canvas to solidify final position
    if (isDragging) {
      setIsDragging(false);
      // Redraw to solidify text box final position
      setTimeout(() => redrawCanvas(), 0);
      scheduleAutoSave();
      return;
    }

    // 🎯 End resizing - now redraw Canvas to solidify final dimensions
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      // Redraw to solidify text box final dimensions
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
          // Restore to state before starting to draw, then draw final shape
          if (savedImageData) {
            ctx.putImageData(savedImageData, 0, 0);
          }
          
          // Draw final shape to main canvas and cache canvas
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
          
          // Draw on main canvas
          drawShape(ctx);
          
          // Draw on cache canvas
          if (drawingCtx) {
            drawShape(drawingCtx);
          }
          
          // Redraw text boxes
          redrawCanvas();
          
          // Trigger auto-save
          scheduleAutoSave();
        }
      }
    }
    
    // Also trigger auto-save for pen and eraser tools
    if (isDrawing && (currentTool === 'pen' || currentTool === 'eraser')) {
      scheduleAutoSave();
    }
    
    // Clean up state
    setIsDrawing(false);
    setStartPoint(null);
    setSavedImageData(null);
  };

  // Text box interaction layer component (React layer) - clear single responsibility interaction
  const TextBoxOverlay = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    // 🎯 Key fix: unified positioning strategy, use pixels instead of percentages
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
              // 🎯 Key fix: use pixel positioning, consistent with createEnhancedTextInput
              position: 'absolute',
              left: '0',
              top: '0',
              transform: `translate(${textBox.x * scaleX}px, ${textBox.y * scaleY}px)`,
              width: `${textBox.width * scaleX}px`,
              height: `${textBox.height * scaleY}px`,
              cursor: currentTool === 'text' ? 'pointer' : 'default',
              zIndex: textBox.zIndex,
              // Transparent background, purely as interaction hotspot
              backgroundColor: 'transparent',
              // 🎯 Performance optimization: disable transition animations during dragging
              transition: isDragging || isResizing ? 'none' : 'all 0.2s'
            }}
          
          // Single click: only select, no drag, no edit
          onClick={(e) => {
            e.stopPropagation();
            if (currentTool === 'text') {
              console.log('TextBox clicked - selecting:', textBox.id);
              setActiveTextBox(textBox.id);
              setTextBoxes(prev => prev.map(tb => ({
                ...tb,
                isSelected: tb.id === textBox.id,
                isEditing: false // Ensure single click doesn't enter edit mode
              })));
            }
          }}
          
          // Double click: enter edit mode
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (currentTool === 'text') {
              console.log('TextBox double-clicked - starting edit:', textBox.id);
              startEditingTextBox(textBox.id);
            }
          }}
        >
          {/* 
            Important: No longer render text content here!
            Final text display is completely handled by Canvas's redrawCanvas function.
            This div is just a transparent interaction layer.
          */}

          {/* Only show control handles when selected and not in edit mode */}
          {textBox.isSelected && !textBox.isEditing && (
            <>
              {/* Drag button: only set isDragging when mousedown on this handle */}
              <div 
                className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-move"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  console.log('Drag handle clicked for textBox:', textBox.id);
                  setIsDragging(true);
                  
                  // Move dragOffset setting logic here
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
              
              {/* Resize button: precise control of resize behavior */}
              <div 
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  console.log('Resize handle clicked for textBox:', textBox.id);
                  setIsResizing(true);
                  setResizeHandle('se');
                  
                  // Set resize starting point
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

  // 🎯 Helper function to get custom cursor style
  const getCustomCursorStyle = (): React.CSSProperties => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container) return { display: 'none' };
    
    // Calculate actual pixel size of brush on screen
    const containerRect = container.getBoundingClientRect();
    const scale = containerRect.width / canvas.width;
    const displaySize = currentBrushSize * scale;

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      borderRadius: '50%',
      pointerEvents: 'none',
      // 🎯 Key: move div center to mouse pointer position via transform
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
          // Simulate crosshair
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

  // 🎯 Handle mouse movement to update custom cursor position
  const handleCustomCursorMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (customCursorRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Use transform to move, best performance
      customCursorRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full relative flex items-center justify-center bg-white ${className || ''} ${isReadOnly ? 'pointer-events-none' : ''}`}
      onMouseMove={!isReadOnly ? handleCustomCursorMove : undefined}
      onMouseEnter={!isReadOnly ? () => {
        if (customCursorRef.current) customCursorRef.current.style.display = 'block';
      } : undefined}
      onMouseLeave={!isReadOnly ? () => {
        if (customCursorRef.current) customCursorRef.current.style.display = 'none';
      } : undefined}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={!isReadOnly ? handleMouseDown : undefined}
        onMouseMove={!isReadOnly ? handleMouseMove : undefined}
        onMouseUp={!isReadOnly ? handleMouseUp : undefined}
        onMouseLeave={!isReadOnly ? handleMouseUp : undefined}
        onTouchStart={!isReadOnly ? handleTouchStart : undefined}
        onTouchMove={!isReadOnly ? handleTouchMove : undefined}
        onTouchEnd={!isReadOnly ? handleTouchEnd : undefined}
        style={{ 
          maxWidth: '100%', 
          maxHeight: '100%', 
          objectFit: 'contain',
          cursor: 'none' // 🎯 Hide default cursor
        }}
      />
      
      {/* Text box overlay layer */}
      <TextBoxOverlay />
      
      {/* 🎯 Custom cursor element */}
      <div
        ref={customCursorRef}
        style={getCustomCursorStyle()}
      />
      
      {/* User information */}
      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {participantName} ({userRole})
      </div>
    </div>
  );
});

WhiteboardCanvas.displayName = 'WhiteboardCanvas';
