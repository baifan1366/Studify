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
  currentTool?: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  currentColor?: string;
  currentBrushSize?: number;
  currentFontSize?: number; // Add font size prop
  currentTextAlign?: 'left' | 'center' | 'right';
  whiteboardId?: string;
  isReadOnly?: boolean;
  className?: string;
  // Add preserveDrawing prop to control clearing behavior
  preserveDrawing?: boolean // Default to preserving drawings
  registerCanvasRef?: (key: string, ref: any) => void;
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
  currentFontSize = 16, // Add font size prop with default
  currentTextAlign = 'left',
  whiteboardId,
  isReadOnly = false,
  className,
  preserveDrawing = true, // Default to preserving drawings
  registerCanvasRef, // ✅ 新增这一行：
}, ref) => {
  console.log('WhiteboardCanvas props:', { classroomSlug, sessionId, currentTool, currentColor, currentBrushSize, currentFontSize, currentTextAlign });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  // Use refs instead of state for canvas layers - more reliable and immediate access
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Add canvas cache state for persistence
  const [canvasCache, setCanvasCache] = useState<ImageData | null>(null);
  // 🔧 Initialize drawing and temp canvases on mount
  useEffect(() => {
    console.log('🎯 WhiteboardCanvas mounted', { id: Math.random().toString(36).slice(2, 6) });
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('⚠️ Canvas ref not available on mount');
      return;
    }

    // Initialize drawingCanvas if it doesn't exist
    if (!drawingCanvasRef.current) {
      const newDrawingCanvas = document.createElement('canvas');
      newDrawingCanvas.width = canvas.width || width;
      newDrawingCanvas.height = canvas.height || height;
      const ctx = newDrawingCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, newDrawingCanvas.width, newDrawingCanvas.height);
      }
      drawingCanvasRef.current = newDrawingCanvas;
      console.log('✅ Initialized drawingCanvas on mount', {
        width: newDrawingCanvas.width,
        height: newDrawingCanvas.height
      });
    }

    // Initialize tempCanvas if it doesn't exist
    if (!tempCanvasRef.current) {
      const newTempCanvas = document.createElement('canvas');
      newTempCanvas.width = canvas.width || width;
      newTempCanvas.height = canvas.height || height;
      tempCanvasRef.current = newTempCanvas;
      console.log('✅ Initialized tempCanvas on mount', {
        width: newTempCanvas.width,
        height: newTempCanvas.height
      });
    }

    return () => {
      console.log('🧹 WhiteboardCanvas unmounted');
    };
  }, []);
 
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
   
  useEffect(() => {
    if (registerCanvasRef && canvasRef.current) {
      registerCanvasRef(sessionId || 'default', canvasRef.current);
    }
  }, [registerCanvasRef, sessionId]);
  
  // 🧠 Clear canvas - clears all layers
  const clearCanvas = () => {
    console.log('🎯 clearCanvas function executed');
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    
    // Clear main canvas
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Update cache with cleared state
      if (preserveDrawing) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setCanvasCache(imageData);
      }
    }
    
    // Clear drawing cache canvas (permanent layer)
    const drawingCtx = drawingCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (drawingCtx && drawingCanvasRef.current) {
      drawingCtx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
      drawingCtx.fillStyle = 'white';
      drawingCtx.fillRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
    }
    
    // Clear temporary canvas
    const tempCtx = tempCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (tempCtx && tempCanvasRef.current) {
      tempCtx.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
    }
    
    // Clear text box state
    setTextBoxes([]);
    setActiveTextBox(null);
    
    toast.success('Canvas completely cleared');
    
    // Trigger auto-save to persist cleared state
    scheduleAutoSave();
  };

  // ☁️ Save to cloud - simplified layer composition
  const saveCanvas = async () => {
    console.log('🎯 saveCanvas function executed');
    
    const canvas = canvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    const tempCanvas = tempCanvasRef.current;
    
    if (!canvas) {
      toast.error('❌ Main canvas not found');
      return;
    }

    // Determine final export dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    console.log('📐 Canvas dimensions:', { width: canvasWidth, height: canvasHeight });

    // Create final composite canvas for export
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    const ctx = exportCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      toast.error('❌ Failed to create export canvas');
      return;
    }

    // Step 1️⃣: Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    console.log('✅ Step 1: White background drawn');

    // Step 2️⃣: Check which layers have content
    
    const checkHasContent = (canvasToCheck: HTMLCanvasElement | null) => {
      if (!canvasToCheck) return false;
      const testCtx = canvasToCheck.getContext('2d', { willReadFrequently: true });
      if (!testCtx) return false;
      const pixels = testCtx.getImageData(0, 0, Math.min(50, canvasToCheck.width), Math.min(50, canvasToCheck.height)).data;
      
      // Check both RGB values AND alpha channel
      // A pixel has content if: (RGB is not white) AND (alpha > 0)
      const hasContent = Array.from(pixels).some((v, i) => {
        const channel = i % 4;
        const pixelIndex = Math.floor(i / 4);
        const alpha = pixels[pixelIndex * 4 + 3];
        
        // Only consider pixels with non-zero alpha
        if (channel !== 3 && alpha > 0 && v < 250) {
          return true;
        }
        return false;
      });
      
      return hasContent;
    };

    const hasMain = checkHasContent(canvas);
    const hasDrawing = checkHasContent(drawingCanvas);
    const hasTemp = checkHasContent(tempCanvas);

    console.log('📊 Layer content detected:', { hasMain, hasDrawing, hasTemp });

    // Step 3️⃣: Composite all layers (order: main → drawing)
    // Note: tempCanvas is not included as it's only for temporary preview
    if (hasMain && canvas) {
      ctx.drawImage(canvas, 0, 0);
      console.log('✓ Main canvas composited');
    }
    if (hasDrawing && drawingCanvas) {
      ctx.drawImage(drawingCanvas, 0, 0);
      console.log('✓ Drawing canvas composited');
    }
    console.log('✅ All layers composited');

    // Step 4️⃣: Draw text boxes
    const currentTextBoxes = textBoxesRef.current || [];
    currentTextBoxes.forEach((textBox) => {
      if (textBox.text.trim()) {
        ctx.save();
        
        // Draw background color (if any)
        if (textBox.backgroundColor) {
          ctx.fillStyle = textBox.backgroundColor;
          ctx.fillRect(textBox.x, textBox.y, textBox.width, textBox.height);
        }
        
        // Text styling
        ctx.fillStyle = textBox.color || '#000';
        ctx.font = `${textBox.fontWeight || 'normal'} ${textBox.fontStyle || 'normal'} ${textBox.fontSize || 16}px ${textBox.fontFamily || 'Arial'}`;
        ctx.textAlign = textBox.alignment || 'left';
        ctx.textBaseline = 'top';
        
        // Compute base X position for alignment
        let drawX = textBox.x;
        if (textBox.alignment === 'center') {
          drawX = textBox.x + textBox.width / 2;
        } else if (textBox.alignment === 'right') {
          drawX = textBox.x + textBox.width;
        }
        
        // Draw text lines
        const lines = textBox.text.split('\n');
        const lineHeight = textBox.fontSize * 1.2;
        lines.forEach((line, lineIndex) => {
          if (line.trim()) {
            ctx.fillText(line, drawX, textBox.y + (lineIndex * lineHeight));
          }
        });
        
        ctx.restore();
      }
    });
    if (currentTextBoxes.length > 0) {
      console.log(`✓ ${currentTextBoxes.length} text boxes composited`);
    }

    // Step 5️⃣: Export to data URL
    const dataUrl = exportCanvas.toDataURL('image/png');
    console.log('✅ Canvas exported:', dataUrl.length, 'bytes');
    
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
    
    try {
      // Call API to save to bucket storage
      const response = await fetch(`/api/classroom/${classroomSlug}/whiteboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: whiteboardId || sessionId,
          imageData: dataUrl,
          width: canvasWidth,
          height: canvasHeight,
          textBoxes: textBoxData,
          metadata: {
            userRole,
            participantName,
            timestamp: new Date().toISOString(),
            textBoxCount: currentTextBoxes.length
          }
        }),
      });

      if (response.ok) {
        toast.success("✅ Canvas saved to cloud!");
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
  };

  // 💾 Download to local - captures complete canvas with all layers
  const downloadCanvas = () => {
    console.log('🎯 downloadCanvas function executed');
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('❌ No canvas ref available');
      toast.error('Canvas not available');
      return;
    }

    // Initialize drawingCanvas if it doesn't exist
    if (!drawingCanvasRef.current) {
      console.warn('⚠️ drawingCanvas not initialized, creating now...');
      const newDrawingCanvas = document.createElement('canvas');
      newDrawingCanvas.width = canvas.width || width;
      newDrawingCanvas.height = canvas.height || height;
      const newDrawingCtx = newDrawingCanvas.getContext('2d', { willReadFrequently: true });
      if (newDrawingCtx) {
        newDrawingCtx.fillStyle = 'white';
        newDrawingCtx.fillRect(0, 0, newDrawingCanvas.width, newDrawingCanvas.height);
        // Copy current canvas content
        newDrawingCtx.drawImage(canvas, 0, 0);
      }
      drawingCanvasRef.current = newDrawingCanvas;
    }
    
    // Use drawingCanvas as the source of truth
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) {
      console.error('❌ Failed to initialize drawing canvas');
      toast.error('Canvas initialization failed');
      return;
    }

    const canvasWidth = drawingCanvas.width || canvas.width || width;
    const canvasHeight = drawingCanvas.height || canvas.height || height;
    
    if (canvasWidth === 0 || canvasHeight === 0) {
      console.error('❌ Invalid canvas dimensions:', { canvasWidth, canvasHeight });
      toast.error('Invalid canvas size');
      return;
    }

    // Create final composite canvas for download
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    const exportCtx = exportCanvas.getContext('2d', { willReadFrequently: true });
    
    if (!exportCtx) {
      console.error('❌ Failed to get export context');
      return;
    }

    // 🔧 CRITICAL FIX: Merge ALL canvases before download
    const mainCtx = canvas.getContext('2d', { willReadFrequently: true });
    const drawingCtx = drawingCanvas.getContext('2d', { willReadFrequently: true });
    
    if (mainCtx && drawingCtx) {
      console.log('🔄 Merging main canvas into drawingCanvas before download');
      drawingCtx.drawImage(canvas, 0, 0);
    }
    
    if (tempCanvasRef.current) {
      const tempCtx = tempCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (tempCtx && drawingCtx) {
        drawingCtx.drawImage(tempCanvasRef.current, 0, 0);
        tempCtx.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
        console.log('🔄 Also merged tempCanvas into drawingCanvas before download');
      }
    }
    
    // 1️⃣ Draw white background
    exportCtx.fillStyle = 'white';
    exportCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 2️⃣ Draw all completed drawings from base layer
    exportCtx.drawImage(drawingCanvas, 0, 0);
    
    // 3️⃣ Draw all text boxes
    const currentTextBoxes = textBoxesRef.current || [];
    currentTextBoxes.forEach(textBox => {
      if (textBox.text.trim()) {
        exportCtx.save();
        
        // Draw background color (if any)
        if (textBox.backgroundColor) {
          exportCtx.fillStyle = textBox.backgroundColor;
          exportCtx.fillRect(textBox.x, textBox.y, textBox.width, textBox.height);
        }
        
        // Text styling
        exportCtx.fillStyle = textBox.color;
        exportCtx.font = `${textBox.fontWeight || 'normal'} ${textBox.fontStyle || 'normal'} ${textBox.fontSize || 16}px ${textBox.fontFamily || 'Arial'}`;
        exportCtx.textBaseline = 'top';
        exportCtx.textAlign = textBox.alignment || 'left';
        
        // Compute base X position for alignment
        let drawX = textBox.x;
        if (textBox.alignment === 'center') {
          drawX = textBox.x + textBox.width / 2;
        } else if (textBox.alignment === 'right') {
          drawX = textBox.x + textBox.width;
        }
        
        // Draw text lines
        const lines = textBox.text.split('\n');
        const lineHeight = textBox.fontSize * 1.2;
        lines.forEach((line, lineIndex) => {
          if (line.trim()) {
            exportCtx.fillText(line, drawX, textBox.y + (lineIndex * lineHeight));
          }
        });
        
        exportCtx.restore();
      }
    });

    // 4️⃣ Download the complete image
    const link = document.createElement("a");
    link.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
    
    console.log('✅ Whiteboard downloaded successfully');
    toast.success('Whiteboard downloaded');
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

  // 🎯 Update active or selected text box when font size changes
  useEffect(() => {
    console.log("🧩 currentFontSize received:", currentFontSize);
    if (currentTool === 'text') {
      setTextBoxes(prev => prev.map(tb => {
        // Update text box if it's active OR selected (and not currently being edited)
        if (tb.id === activeTextBox || (tb.isSelected && !tb.isEditing)) {
          console.log(`✅ Updating fontSize for textBox ${tb.id} to ${currentFontSize}px`);
          return { ...tb, fontSize: currentFontSize || 16 };
        }
        return tb;
      }));
      
      // Trigger redraw to show changes immediately
      if (activeTextBox || textBoxes.some(tb => tb.isSelected && !tb.isEditing)) {
        setTimeout(() => redrawCanvas(), 0);
      }
    }
  }, [currentFontSize, currentTool, activeTextBox]);

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
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        // Save initial state to cache
        if (preserveDrawing) {
          const imageData = ctx.getImageData(0, 0, width, height);
          setCanvasCache(imageData);
        }
      }

      // Initialize temporary canvas
      const temp = document.createElement('canvas');
      temp.width = width;
      temp.height = height;
      tempCanvasRef.current = temp;
      
      // Initialize drawing cache canvas
      const newDrawingCanvas = document.createElement('canvas');
      newDrawingCanvas.width = width;
      newDrawingCanvas.height = height;
      const drawingCtx = newDrawingCanvas.getContext('2d', { willReadFrequently: true });
      if (drawingCtx) {
        drawingCtx.fillStyle = 'white';
        drawingCtx.fillRect(0, 0, width, height);
      }
      drawingCanvasRef.current = newDrawingCanvas;
      console.log('✅ drawingCanvas initialized in useEffect (first load)', {
        width: newDrawingCanvas.width,
        height: newDrawingCanvas.height,
        refExists: !!drawingCanvasRef.current
      });

      // Load server content on first load
      loadWhiteboardContent();
      return;
    }

    // --- If not first load, execute content scaling logic ---
    console.log(`🔄 Resizing canvas from ${oldWidth}x${oldHeight} to ${width}x${height}`);

    // 2. Store current drawing cache (drawingCanvasRef) in a temporary image
    // This step is async, so we put all subsequent logic in the onload callback
    const tempDrawingImage = new Image();
    if (drawingCanvasRef.current) {
      tempDrawingImage.src = drawingCanvasRef.current.toDataURL();
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
      tempCanvasRef.current = newTempCanvas;
      
      const newDrawingCanvas = document.createElement('canvas');
      newDrawingCanvas.width = width;
      newDrawingCanvas.height = height;
      
      // 6. (Raster part) Draw temporary image back to new cache canvas at scale
      const drawingCtx = newDrawingCanvas.getContext('2d', { willReadFrequently: true });
      if (drawingCtx) {
        drawingCtx.fillStyle = 'white';
        drawingCtx.fillRect(0, 0, width, height); // Fill background first
        drawingCtx.drawImage(tempDrawingImage, 0, 0, width, height);
        
        console.log('✅ Drawing content scaled and restored');
        
        // Update drawingCanvasRef.current ref
        drawingCanvasRef.current = newDrawingCanvas;
        console.log('✅ drawingCanvas updated in useEffect (resize)', {
          width: newDrawingCanvas.width,
          height: newDrawingCanvas.height,
          refExists: !!drawingCanvasRef.current
        });
        
        // 7. Trigger final redraw
        // Use setTimeout to ensure execution after all React state updates complete
        setTimeout(() => {
          console.log('🎨 Final redraw after resize');
          redrawCanvas();
        }, 0);
      }
    };

    // If drawingCanvasRef is empty (e.g., user hasn't drawn anything), also need to adjust size
    if (!drawingCanvasRef.current || !drawingCanvasRef.current.toDataURL()) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        // Save state to cache
        if (preserveDrawing) {
          const imageData = ctx.getImageData(0, 0, width, height);
          setCanvasCache(imageData);
        }
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

  // Restore canvas from cache when available
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (ctx && canvasCache && preserveDrawing) {
      console.log('Restoring canvas from cache');
      ctx.putImageData(canvasCache, 0, 0);
    }
  }, [canvasCache, preserveDrawing]);
  
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

  // Load canvas image into drawing layer
  const loadCanvasImage = (imageData: string) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('⚠️ No canvas ref available for loading');
      return;
    }

    // Initialize drawingCanvas if it doesn't exist
    if (!drawingCanvasRef.current) {
      console.log('🔧 Initializing drawingCanvas for loading');
      const newDrawingCanvas = document.createElement('canvas');
      newDrawingCanvas.width = canvas.width;
      newDrawingCanvas.height = canvas.height;
      drawingCanvasRef.current = newDrawingCanvas;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const drawingCtx = drawingCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    
    if (!ctx || !drawingCtx) {
      console.error('❌ Failed to get contexts for loading');
      return;
    }

    const img = new Image();
    img.onload = () => {
      console.log('🎨 Loading image into canvas layers');
      
      // Load into drawing cache canvas (permanent layer) - this is the source of truth
      if (drawingCtx && drawingCanvasRef.current) {
        drawingCtx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
        drawingCtx.fillStyle = 'white';
        drawingCtx.fillRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
        drawingCtx.drawImage(img, 0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
        console.log('✅ Image loaded into drawingCanvas');
      }
      
      // Also update main canvas for immediate display
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      console.log('✅ Image loaded into main canvas');
      
      // Save loaded image state to cache
      if (preserveDrawing) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setCanvasCache(imageData);
      }
      
      // Redraw text boxes on top
      setTimeout(() => {
        console.log('🔄 Redrawing canvas after image load');
        redrawCanvas();
      }, 50);
    };
    
    img.onerror = (error) => {
      console.error('❌ Failed to load image:', error);
      toast.error('Failed to load whiteboard image');
    };
    
    img.src = imageData;
  };

// 在组件顶层添加：
const activeTextBoxRef = useRef(activeTextBox);
useEffect(() => {
  activeTextBoxRef.current = activeTextBox;
}, [activeTextBox]);

let lastMouseDownTime = 0;
let mouseDownCount = 0;
const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  


  // 统一输出事件入口日志（不会被任何 return 提前跳过）
  console.log("🖱️ handleMouseDown triggered", { tool: currentTool, x, y });

  const now = performance.now();
  if (now - lastMouseDownTime < 100) {
    console.warn('⚠️ Ignored duplicate handleMouseDown within 100ms');
    return;
  }
  lastMouseDownTime = now;

  console.log('🖱️ handleMouseDown triggered', { tool: currentTool, x: e.clientX, y: e.clientY });

  // =============== 文本模式 ===============
  if (currentTool === "text") {
    // 延迟执行逻辑以避免冲突
    setTimeout(() => {
      if (!activeTextBox) {
        console.log("📄 Creating new text box at:", { x, y });
        setTextBoxes((prev) =>
          prev.map((tb) => ({ ...tb, isSelected: false, isEditing: false }))
        );
        createTextBox(x, y);
      } else {
        console.log("🔸 Text box already active — skip creating new one");
      }
    }, 0);
    return;
  }

  // =============== 非文本模式：通用绘制逻辑 ===============
  setTextBoxes((prev) =>
    prev.map((tb) => ({ ...tb, isSelected: false, isEditing: false }))
  );
  setActiveTextBox(null);

  setIsDrawing(true);
  setStartPoint({ x, y });

  const ctx = canvas.getContext("2d");
  
  if (!ctx) return;

  // 🔧 Initialize drawingCanvas if it doesn't exist
  if (!drawingCanvasRef.current) {
    console.warn('⚠️ drawingCanvas not initialized in handleMouseDown, creating now...');
    const newDrawingCanvas = document.createElement('canvas');
    newDrawingCanvas.width = canvas.width;
    newDrawingCanvas.height = canvas.height;
    const newDrawingCtx = newDrawingCanvas.getContext('2d', { willReadFrequently: true });
    if (newDrawingCtx) {
      newDrawingCtx.fillStyle = 'white';
      newDrawingCtx.fillRect(0, 0, canvas.width, canvas.height);
      // Copy current canvas content if any
      newDrawingCtx.drawImage(canvas, 0, 0);
      console.log('✅ drawingCanvas initialized in handleMouseDown', {
        width: newDrawingCanvas.width,
        height: newDrawingCanvas.height
      });
    }
    drawingCanvasRef.current = newDrawingCanvas;
  } else {
    console.log('✅ drawingCanvas already exists', {
      width: drawingCanvasRef.current.width,
      height: drawingCanvasRef.current.height
    });
  }

  const drawingCtx = drawingCanvasRef.current?.getContext("2d");
  
  if (!drawingCtx) {
    console.error('❌ Failed to get drawingCtx in handleMouseDown!');
  }

  switch (currentTool) {
    case "pen":
      console.log("✏️ Pen mode started at", { x, y });
      ctx.beginPath();
      ctx.moveTo(x, y);
      if (drawingCtx) {
        drawingCtx.beginPath();
        drawingCtx.moveTo(x, y);
        console.log('✅ Pen path initialized on both canvases');
      } else {
        console.error('❌ Failed to initialize drawingCtx for pen');
      }
      break;

    case "eraser":
      console.log("🧹 Eraser mode started at", { x, y });
      // Eraser doesn't need path initialization
      break;

    case "rectangle":
    case "circle":
      console.log(`🟦 ${currentTool} mode started at`, { x, y });
      // No need to save imageData - using dual-canvas buffering instead
      break;

    default:
      console.warn("⚠️ Unknown tool:", currentTool);
  }

  // 自动保存调度逻辑放在这里以确保绘制事件被捕获后执行
  scheduleAutoSave();

  if (!(window as any).__mousedown_count) {
    (window as any).__mousedown_count = 0;
  }
  (window as any).__mousedown_count++;

    e.stopPropagation();
  e.preventDefault();

  if (!(e.target instanceof HTMLCanvasElement)) {
    console.warn('⚠️ Ignored MouseDown from non-canvas element:', e.target);
    return;
  }

  mouseDownCount++;
  const targetEl = e.target as HTMLElement;
  const sourceId = targetEl?.id || '(no id)';
  const sourceClass = targetEl?.className || '(no class)';
  const timestamp = new Date().toISOString();

  console.groupCollapsed(`🖱️ MouseDown #${mouseDownCount} [${timestamp}]`);
  console.log('Triggered by:', { id: sourceId, class: sourceClass });
  console.log('Stack trace:\n', new Error().stack);
  console.groupEnd();

};

  // Create enhanced text box
  const createTextBox = (x: number, y: number) => {
    console.log('🎯 createTextBox called at:', { x, y });
    console.log('📊 Current textBoxes count:', textBoxes.length);
    console.log('📐 Current font settings:', { currentFontSize, currentColor, currentTextAlign });
    
    // Directly use currentFontSize - simplified logic
    const fontSize = currentFontSize || 16;
    const newTextBox: TextBox = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      width: fontSize * 3, // Increased width for more space
      height: fontSize * 1.5, // 🎯 Initial height
      text: '',
      color: currentColor,
      backgroundColor: undefined,
      fontSize,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      alignment: currentTextAlign || 'left',
      isEditing: true,
      isSelected: true,
      zIndex: textBoxes.length + 1
    };
    
    console.log('✅ New textBox created:', newTextBox.id);
    console.log('✨ Creating textBox with fontSize:', fontSize);
    
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

    console.log('🖊️ Creating text input for textBox:', { 
      id: textBox.id, 
      fontSize: textBox.fontSize, 
      x: textBox.x, 
      y: textBox.y 
    });

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
    
    console.log('📏 Calculated text input dimensions:', { 
      originalFontSize: textBox.fontSize, 
      scaledFontSize, 
      scaleX, 
      scaleY,
      cssX,
      cssY
    });
    
    // 🎯 Enhanced style settings - precisely match text size
    Object.assign(textarea.style, {
      position: 'absolute',
      left: `${cssX}px`,
      top: `${cssY}px`,
      minWidth: `${textBox.fontSize * scaleX * 2}px`, // Increased minWidth for better UX
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
      padding: '4px', // Increased padding for better UX
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

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      console.warn('redrawCanvas: context not available');
      return;
    }

    console.log('redrawCanvas: Using cached drawing layer + rendering', textBoxes.filter(tb => !tb.isEditing).length, 'static text boxes');

    // Only clear canvas if preserveDrawing is false
    if (!preserveDrawing) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // First draw cached drawing content (all strokes, shapes, etc.)
    if (drawingCanvasRef.current) {
      ctx.drawImage(drawingCanvasRef.current, 0, 0);
    } else if (!preserveDrawing) {
      // If no cache canvas and not preserving, set white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Then draw all static text boxes (overlay on top of drawing layer)
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
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Initialize drawingCanvas if it doesn't exist
    if (!drawingCanvasRef.current) {
      console.warn('⚠️ drawingCanvas not initialized in handleMouseMove, creating now...');
      const newDrawingCanvas = document.createElement('canvas');
      newDrawingCanvas.width = canvas.width;
      newDrawingCanvas.height = canvas.height;
      const newDrawingCtx = newDrawingCanvas.getContext('2d', { willReadFrequently: true });
      if (newDrawingCtx) {
        newDrawingCtx.fillStyle = 'white';
        newDrawingCtx.fillRect(0, 0, canvas.width, canvas.height);
        // Copy current canvas content
        newDrawingCtx.drawImage(canvas, 0, 0);
        console.log('✅ drawingCanvas initialized in handleMouseMove');
      }
      drawingCanvasRef.current = newDrawingCanvas;
    }
    
    const drawingCtx = drawingCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    
    if (ctx) {
      switch (currentTool) {
        case 'pen':
          // Draw on main canvas (for immediate visual feedback)
          ctx.lineTo(x, y);
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = currentBrushSize;
          ctx.lineCap = 'round';
          ctx.stroke();
          
          // CRITICAL: Also draw on permanent storage canvas
          if (drawingCtx) {
            drawingCtx.lineTo(x, y);
            drawingCtx.strokeStyle = currentColor;
            drawingCtx.lineWidth = currentBrushSize;
            drawingCtx.lineCap = 'round';
            drawingCtx.stroke();
            
            // Log first stroke to verify it's working
            if (!(window as any).__penStrokeLogged) {
              console.log('✅ First pen stroke drawn to drawingCanvas', { x, y, color: currentColor, size: currentBrushSize });
              
              // Verify the stroke actually appeared
              const verifyPixels = drawingCtx.getImageData(Math.floor(x) - 5, Math.floor(y) - 5, 10, 10).data;
              let hasNonWhite = false;
              for (let i = 0; i < verifyPixels.length; i += 4) {
                if (verifyPixels[i] < 250 || verifyPixels[i+1] < 250 || verifyPixels[i+2] < 250) {
                  hasNonWhite = true;
                  break;
                }
              }
              console.log('🔍 Stroke verification on drawingCanvas:', hasNonWhite ? 'VISIBLE' : 'NOT VISIBLE');
              
              (window as any).__penStrokeLogged = true;
            }
          } else {
            console.error('❌ drawingCtx not available during pen drawing!');
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
          console.log('🔄 Shape tool mouse move, calling drawShapePreview');
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
      
      // Update canvas cache during drawing for persistence
      if (preserveDrawing) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setCanvasCache(imageData);
      }
    }
  };

  // Draw shape preview using temporary canvas (dual-canvas buffering)
  const drawShapePreview = (startX: number, startY: number, currentX: number, currentY: number) => {
    const canvas = canvasRef.current;
    
    if (!canvas) {
      console.warn('⚠️ drawShapePreview: No canvas');
      return;
    }

    // Initialize tempCanvas if it doesn't exist
    if (!tempCanvasRef.current) {
      console.warn('⚠️ tempCanvas not initialized, creating now...');
      const temp = document.createElement('canvas');
      temp.width = canvas.width;
      temp.height = canvas.height;
      tempCanvasRef.current = temp;
    }

    // Initialize drawingCanvas if it doesn't exist
    if (!drawingCanvasRef.current) {
      console.warn('⚠️ drawingCanvas not initialized, creating now...');
      const newDrawingCanvas = document.createElement('canvas');
      newDrawingCanvas.width = canvas.width;
      newDrawingCanvas.height = canvas.height;
      const newDrawingCtx = newDrawingCanvas.getContext('2d', { willReadFrequently: true });
      if (newDrawingCtx) {
        newDrawingCtx.fillStyle = 'white';
        newDrawingCtx.fillRect(0, 0, canvas.width, canvas.height);
        // Copy current canvas content to drawing canvas
        newDrawingCtx.drawImage(canvas, 0, 0);
      }
      drawingCanvasRef.current = newDrawingCanvas;
    }

    const tempCtx = tempCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx || !tempCtx) {
      console.warn('⚠️ drawShapePreview: No context available');
      return;
    }

    console.log('🎨 Drawing shape preview:', { 
      tool: currentTool, 
      startX, 
      startY, 
      currentX, 
      currentY,
      color: currentColor,
      brushSize: currentBrushSize
    });

    // Clear temporary canvas for fresh preview
    tempCtx.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
    
    // Draw preview shape on temporary canvas
    tempCtx.strokeStyle = currentColor;
    tempCtx.lineWidth = currentBrushSize;
    tempCtx.lineCap = 'round';
    
    if (currentTool === 'rectangle') {
      const width = currentX - startX;
      const height = currentY - startY;
      console.log('📐 Drawing rectangle preview:', { width, height });
      tempCtx.strokeRect(startX, startY, width, height);
    } else if (currentTool === 'circle') {
      const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
      console.log('⭕ Drawing circle preview:', { radius });
      tempCtx.beginPath();
      tempCtx.arc(startX, startY, radius, 0, 2 * Math.PI);
      tempCtx.stroke();
    }

    // Composite: draw base layer (drawingCanvasRef.current) + temp preview to main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // First draw the base layer with all completed drawings
    if (drawingCanvasRef.current) {
      ctx.drawImage(drawingCanvasRef.current, 0, 0);
    } else {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Then overlay the temporary preview
    ctx.drawImage(tempCanvasRef.current, 0, 0);
    
    // Finally redraw text boxes on top
    textBoxes.forEach(textBox => {
      if (textBox.text.trim() && !textBox.isEditing) {
        ctx.fillStyle = textBox.color;
        ctx.font = `${textBox.fontWeight} ${textBox.fontStyle} ${textBox.fontSize}px ${textBox.fontFamily}`;
        ctx.textBaseline = 'top';
        ctx.textAlign = textBox.alignment;
        
        let drawX = textBox.x;
        if (textBox.alignment === 'center') {
          drawX = textBox.x + textBox.width / 2;
        } else if (textBox.alignment === 'right') {
          drawX = textBox.x + textBox.width;
        }
        
        if (textBox.backgroundColor) {
          ctx.save();
          ctx.fillStyle = textBox.backgroundColor;
          ctx.fillRect(textBox.x, textBox.y, textBox.width, textBox.height);
          ctx.restore();
          ctx.fillStyle = textBox.color;
        }
        
        const lines = textBox.text.split('\n');
        const lineHeight = textBox.fontSize * 1.2;
        
        lines.forEach((line, lineIndex) => {
          if (line.trim()) {
            ctx.fillText(line, drawX, textBox.y + (lineIndex * lineHeight));
          }
        });
      }
    });
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
      console.log('✅ Finalizing shape:', currentTool);
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('❌ No canvas available');
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        console.error('❌ No main context available');
        return;
      }

      // Initialize drawingCanvas if it doesn't exist
      if (!drawingCanvasRef.current) {
        console.warn('⚠️ drawingCanvas not initialized, creating now...');
        const newDrawingCanvas = document.createElement('canvas');
        newDrawingCanvas.width = canvas.width;
        newDrawingCanvas.height = canvas.height;
        const newDrawingCtx = newDrawingCanvas.getContext('2d', { willReadFrequently: true });
        if (newDrawingCtx) {
          newDrawingCtx.fillStyle = 'white';
          newDrawingCtx.fillRect(0, 0, canvas.width, canvas.height);
          // Copy current canvas content to drawing canvas
          newDrawingCtx.drawImage(canvas, 0, 0);
        }
        drawingCanvasRef.current = newDrawingCanvas;
      }

      const drawingCtx = drawingCanvasRef.current?.getContext('2d', { willReadFrequently: true });
      const tempCtx = tempCanvasRef.current?.getContext('2d', { willReadFrequently: true });
      
      if (!drawingCtx) {
        console.error('❌ No drawingCtx available for finalizing shape!');
        return;
      }
      
      console.log('🎨 Drawing final shape to permanent layer');
      console.log('🎨 drawingCanvas before drawing:', {
        width: drawingCanvasRef.current.width,
        height: drawingCanvasRef.current.height,
        hasContext: !!drawingCtx
      });
      
      // Draw final shape to drawing cache canvas (permanent layer)
      drawingCtx.strokeStyle = currentColor;
      drawingCtx.lineWidth = currentBrushSize;
      drawingCtx.lineCap = 'round';
      
      console.log('🎨 Drawing settings:', {
        strokeStyle: drawingCtx.strokeStyle,
        lineWidth: drawingCtx.lineWidth,
        lineCap: drawingCtx.lineCap
      });
      
      if (currentTool === 'rectangle') {
        const width = x - startPoint.x;
        const height = y - startPoint.y;
        console.log('📐 Final rectangle:', { startX: startPoint.x, startY: startPoint.y, width, height });
        drawingCtx.strokeRect(startPoint.x, startPoint.y, width, height);
        console.log('✅ strokeRect called on drawingCanvas');
        
        // Verify the drawing actually happened
        const testPixel = drawingCtx.getImageData(startPoint.x, startPoint.y, 1, 1).data;
        console.log('🧪 Test pixel at start point:', Array.from(testPixel));
      } else if (currentTool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        console.log('⭕ Final circle:', { centerX: startPoint.x, centerY: startPoint.y, radius });
        drawingCtx.beginPath();
        drawingCtx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        drawingCtx.stroke();
        console.log('✅ arc and stroke called on drawingCanvas');
      }
      
      // Clear temporary canvas
      if (tempCtx && tempCanvasRef.current) {
        console.log('🧹 Clearing temp canvas');
        tempCtx.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
      }
      
      // Redraw main canvas with finalized shape
      console.log('🔄 Redrawing main canvas');
      redrawCanvas();
      
      // Save canvas state to cache after drawing
      if (preserveDrawing) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setCanvasCache(imageData);
      }
      
      // Trigger auto-save
      scheduleAutoSave();
    }
    
    // Also trigger auto-save for pen and eraser tools
    if (isDrawing && (currentTool === 'pen' || currentTool === 'eraser')) {
      // Save canvas state to cache after drawing
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (ctx && canvas && preserveDrawing) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setCanvasCache(imageData);
      }
      
      scheduleAutoSave();
    }
    
    // Clean up state
    setIsDrawing(false);
    setStartPoint(null);
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
          
          // Single click: select AND set as active
          onClick={(e) => {
            e.stopPropagation();
            if (currentTool === 'text') {
              console.log('TextBox clicked - selecting:', textBox.id);
              setActiveTextBox(textBox.id); // ✅ 设置为活动文本框
              setTextBoxes(prev => prev.map(tb => ({
                ...tb,
                isSelected: tb.id === textBox.id,
                isEditing: false
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
    
    // Use font size for text tool, brush size for other tools
    const effectiveSize = currentTool === 'text' ? currentFontSize : currentBrushSize;
    const displaySize = effectiveSize * scale;

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

