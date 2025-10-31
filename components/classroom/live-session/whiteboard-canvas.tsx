'use client';

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createClient } from '@liveblocks/client';
import { createRoomContext } from '@liveblocks/react';
import { toast } from 'sonner';

// Create a non-suspense client for stable connection
const client = createClient({
  authEndpoint: async (room) => {
    console.log('🔐 [Liveblocks] Requesting auth for room:', room);
    
    const response = await fetch('/api/liveblocks-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ room }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ [Liveblocks] Auth failed:', error);
      throw new Error(error.error || 'Authentication failed');
    }

    const data = await response.json();
    console.log('✅ [Liveblocks] Auth successful');
    return data;
  },
  throttle: 100,
});

type Presence = {
  cursor: { x: number; y: number } | null;
  selectedTool: string | null;
};

// Enhanced storage type to match whiteboard-canvas.tsx
type Storage = {
  drawings: any[];
  textBoxes: any[];
};

const {
  RoomProvider,
  useMyPresence,
  useOthers,
  useMutation,
  useStorage,
  useUndo,
  useRedo,
  useCanUndo,
  useCanRedo,
} = createRoomContext<Presence, Storage>(client);

interface LiveblocksWhiteboardProps {
  classroomSlug: string;
  sessionId: string;
  userId: string;
  userName: string;
  userRole: 'student' | 'tutor' | 'owner';
  currentTool?: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  currentColor?: string;
  currentBrushSize?: number;
  currentFontSize?: number;
  currentTextAlign?: 'left' | 'center' | 'right';
  isReadOnly?: boolean;
  className?: string;
  width?: number;
  height?: number;
}

export interface LiveblocksWhiteboardRef {
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveCanvas: () => Promise<void>;
  downloadCanvas: () => void;
}

// Drawing types
type DrawingType = 'line' | 'rectangle' | 'circle' | 'eraser';

interface BaseDrawing {
  id: string;
  type: DrawingType;
  color: string;
  timestamp: number;
}

interface LineDrawing extends BaseDrawing {
  type: 'line';
  points: { x: number; y: number }[];
  size: number;
}

interface RectangleDrawing extends BaseDrawing {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  size: number;
}

interface CircleDrawing extends BaseDrawing {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
  size: number;
}

interface EraserDrawing extends BaseDrawing {
  type: 'eraser';
  points: { x: number; y: number }[];
  size: number;
}

type Drawing = LineDrawing | RectangleDrawing | CircleDrawing | EraserDrawing;

// Text box type matching whiteboard-canvas.tsx exactly
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

// Inner component that uses Liveblocks hooks
const WhiteboardCanvas = forwardRef<LiveblocksWhiteboardRef, Omit<LiveblocksWhiteboardProps, 'classroomSlug' | 'sessionId' | 'userId' | 'userName' | 'userRole'>>(({
  currentTool = 'pen',
  currentColor = '#000000',
  currentBrushSize = 4,
  currentFontSize = 16,
  currentTextAlign = 'left',
  isReadOnly = false,
  width = 1280,
  height = 720,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const customCursorRef = useRef<HTMLDivElement>(null); // 🎯 Custom cursor reference
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [, updateMyPresence] = useMyPresence();
  const others = useOthers();

  // Drawing state
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  
  // Text box state
  const [activeTextBox, setActiveTextBox] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Undo/Redo
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  // Mutations
  const addDrawing = useMutation(({ storage }, drawing: Drawing) => {
    const drawings = storage.get('drawings') as any[];
    if (drawings) {
      storage.set('drawings', [...drawings, drawing]);
    }
  }, []);

  const addTextBox = useMutation(({ storage }, textBox: TextBox) => {
    const textBoxes = storage.get('textBoxes') as any[];
    if (textBoxes) {
      // Remove temporary UI state before storing
      const { isEditing, isSelected, ...persistentData } = textBox;
      storage.set('textBoxes', [...textBoxes, persistentData]);
    }
  }, []);

  const updateTextBox = useMutation(({ storage }, id: string, updates: Partial<TextBox>) => {
    const textBoxes = storage.get('textBoxes') as TextBox[];
    if (textBoxes) {
      // Remove temporary UI state before storing
      const { isEditing, isSelected, ...persistentUpdates } = updates as any;
      const updated = textBoxes.map(tb => 
        tb.id === id ? { ...tb, ...persistentUpdates } : tb
      );
      storage.set('textBoxes', updated);
    }
  }, []);

  const deleteTextBox = useMutation(({ storage }, id: string) => {
    const textBoxes = storage.get('textBoxes') as TextBox[];
    if (textBoxes) {
      storage.set('textBoxes', textBoxes.filter(tb => tb.id !== id));
    }
  }, []);

  const clearAllDrawings = useMutation(({ storage }) => {
    storage.set('drawings', []);
    storage.set('textBoxes', []);
  }, []);

  // Get data from storage and add UI state
  const drawings = (useStorage((root) => root.drawings) as Drawing[]) || [];
  const storedTextBoxes = (useStorage((root) => root.textBoxes) as any[]) || [];
  
  // Check if storage is loaded by checking if root exists
  const isStorageLoaded = useStorage((root) => root !== null);
  
  // Add temporary UI state to stored text boxes
  const textBoxes: TextBox[] = storedTextBoxes.map(tb => ({
    ...tb,
    isEditing: false,
    isSelected: false,
  }));

  // Only log once on mount
  useEffect(() => {
    console.log('🖌️ [WhiteboardCanvas] Component mounted and ready');
    return () => {
      console.log('🖌️ [WhiteboardCanvas] Component unmounting');
    };
  }, []);

  // Create text box
  const createTextBox = useCallback((x: number, y: number) => {
    console.log('🎯 createTextBox called at:', { x, y });
    console.log('📐 Current font settings:', { currentFontSize, currentColor, currentTextAlign });

    const fontSize = currentFontSize || 16;
    const newTextBox: TextBox = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      width: fontSize * 3,
      height: fontSize * 1.5,
      text: '',
      color: currentColor,
      fontSize,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      alignment: currentTextAlign,
      isEditing: true,
      isSelected: true,
      zIndex: textBoxes.length + 1,
    };

    console.log('✅ New textBox created:', newTextBox.id);
    addTextBox(newTextBox);
    setActiveTextBox(newTextBox.id);

    // Create enhanced text input component
    setTimeout(() => createEnhancedTextInput(newTextBox), 10);
  }, [currentFontSize, currentColor, currentTextAlign, textBoxes.length, addTextBox]);

  // Create contentEditable input for text editing
  const createEnhancedTextInput = useCallback((textBox: TextBox) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    console.log('🖊️ Creating contentEditable input for textBox:', {
      id: textBox.id,
      fontSize: textBox.fontSize,
      x: textBox.x,
      y: textBox.y
    });

    const canvasContainer = containerRef.current;
    if (!canvasContainer) return;

    // Remove old editor
    const existing = document.getElementById(`text-edit-${textBox.id}`);
    if (existing) existing.remove();

    // High DPI adaptation
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const cssX = textBox.x * scaleX;
    const cssY = textBox.y * scaleY;
    const scaledFontSize = textBox.fontSize * scaleY;

    // Create contentEditable div
    const editor = document.createElement('div');
    editor.id = `text-edit-${textBox.id}`;
    editor.contentEditable = 'true';
    editor.innerText = textBox.text || '';
    
    Object.assign(editor.style, {
      position: 'absolute',
      left: `${cssX}px`,
      top: `${cssY}px`,
      minWidth: `${textBox.fontSize * scaleX * 2}px`,
      maxWidth: `${canvas.width * scaleX - cssX - 20}px`,
      fontSize: `${scaledFontSize}px`,
      fontFamily: textBox.fontFamily,
      fontWeight: textBox.fontWeight,
      fontStyle: textBox.fontStyle,
      textDecoration: textBox.textDecoration,
      textAlign: textBox.alignment,
      color: textBox.color,
      backgroundColor: textBox.backgroundColor || 'rgba(255, 255, 255, 0.9)',
      outline: '2px dashed #3b82f6',
      whiteSpace: 'pre-wrap',
      overflowWrap: 'break-word',
      zIndex: '1000',
      padding: '4px',
      borderRadius: '4px',
      lineHeight: '1.2',
      minHeight: `${textBox.fontSize * scaleY * 1.2}px`,
      boxSizing: 'border-box'
    });

    canvasContainer.style.position = 'relative';
    canvasContainer.appendChild(editor);

    // Scroll into view and focus
    editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
    editor.focus();

    // Move cursor to end
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    let isFinished = false;
    let composing = false;

    // Real-time sync input
    const handleInput = () => {
      if (!composing && !isFinished) {
        const newText = editor.innerText;
        updateTextBox(textBox.id, { text: newText });
      }
    };

    // IME event handlers
    const handleCompositionStart = () => {
      composing = true;
    };

    const handleCompositionEnd = () => {
      composing = false;
      handleInput();
    };

    // Finish editing
    const finishEditing = () => {
      if (isFinished) return;
      isFinished = true;

      const finalText = editor.innerText.trim();
      
      // Clean up event listeners
      editor.removeEventListener('input', handleInput);
      editor.removeEventListener('compositionstart', handleCompositionStart);
      editor.removeEventListener('compositionend', handleCompositionEnd);
      editor.removeEventListener('keydown', handleKeyDown);
      editor.removeEventListener('blur', handleBlur);

      // Remove DOM
      if (canvasContainer.contains(editor)) {
        canvasContainer.removeChild(editor);
      }

      // Delete if empty, otherwise update
      if (!finalText) {
        console.log('❌ Text is empty, removing text box');
        deleteTextBox(textBox.id);
      } else {
        console.log('✅ Saving text:', finalText);
        updateTextBox(textBox.id, { text: finalText });
      }

      setActiveTextBox(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (composing) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        editor.innerText = '';
        finishEditing();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        finishEditing();
      }
      // Shift+Enter allows line breaks
    };

    const handleBlur = () => {
      setTimeout(() => {
        if (!isFinished) {
          finishEditing();
        }
      }, 100);
    };

    editor.addEventListener('input', handleInput);
    editor.addEventListener('compositionstart', handleCompositionStart);
    editor.addEventListener('compositionend', handleCompositionEnd);
    editor.addEventListener('keydown', handleKeyDown);
    editor.addEventListener('blur', handleBlur);
  }, [updateTextBox, deleteTextBox]);



  // Get canvas coordinates
  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isReadOnly) return;
    
    // Wait for storage to be loaded before allowing drawing
    if (!isStorageLoaded) {
      console.log('⏳ Storage not ready yet');
      return;
    }

    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    console.log('🖱️ Mouse down:', { tool: currentTool, coords });

    // Text tool
    if (currentTool === 'text') {
      // Delay execution to avoid conflicts
      setTimeout(() => {
        if (!activeTextBox) {
          console.log('📄 Creating new text box at:', coords);
          createTextBox(coords.x, coords.y);
        } else {
          console.log('🔸 Text box already active — skip creating new one');
        }
      }, 0);
      return;
    }

    setIsDrawing(true);
    setStartPoint(coords);

    if (currentTool === 'pen' || currentTool === 'eraser') {
      setCurrentPoints([coords]);
    }

    updateMyPresence({ cursor: coords, selectedTool: currentTool });
  }, [isReadOnly, currentTool, activeTextBox, getCanvasCoordinates, updateMyPresence, isStorageLoaded]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    updateMyPresence({ cursor: coords });

    if (!isDrawing || isReadOnly || !startPoint) return;

    if (currentTool === 'pen' || currentTool === 'eraser') {
      setCurrentPoints(prev => [...prev, coords]);
      
      // Draw preview on temp canvas
      const tempCanvas = tempCanvasRef.current;
      if (tempCanvas) {
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
          
          if (currentTool === 'pen') {
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentBrushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            currentPoints.forEach((point, index) => {
              if (index === 0) {
                ctx.moveTo(point.x, point.y);
              } else {
                ctx.lineTo(point.x, point.y);
              }
            });
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
          } else if (currentTool === 'eraser') {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = currentBrushSize * 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            currentPoints.forEach((point, index) => {
              if (index === 0) {
                ctx.moveTo(point.x, point.y);
              } else {
                ctx.lineTo(point.x, point.y);
              }
            });
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
          }
        }
      }
    } else if (currentTool === 'rectangle' || currentTool === 'circle') {
      // Draw preview on temp canvas
      const tempCanvas = tempCanvasRef.current;
      if (tempCanvas) {
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = currentBrushSize;

          if (currentTool === 'rectangle') {
            const width = coords.x - startPoint.x;
            const height = coords.y - startPoint.y;
            ctx.strokeRect(startPoint.x, startPoint.y, width, height);
          } else if (currentTool === 'circle') {
            const radius = Math.sqrt(
              Math.pow(coords.x - startPoint.x, 2) + Math.pow(coords.y - startPoint.y, 2)
            );
            ctx.beginPath();
            ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
      }
    }
  }, [isDrawing, isReadOnly, startPoint, currentTool, currentColor, currentBrushSize, currentPoints, getCanvasCoordinates, updateMyPresence]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isReadOnly || !startPoint) return;
    
    // Check storage status before saving
    if (!isStorageLoaded) {
      console.log('⏳ Storage not ready, cannot save drawing');
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoints([]);
      return;
    }

    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    let drawing: Drawing | null = null;

    if (currentTool === 'pen') {
      drawing = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'line',
        points: [...currentPoints, coords],
        color: currentColor,
        size: currentBrushSize,
        timestamp: Date.now(),
      };
    } else if (currentTool === 'eraser') {
      drawing = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'eraser',
        points: [...currentPoints, coords],
        color: 'white',
        size: currentBrushSize * 2,
        timestamp: Date.now(),
      };
    } else if (currentTool === 'rectangle') {
      drawing = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'rectangle',
        x: startPoint.x,
        y: startPoint.y,
        width: coords.x - startPoint.x,
        height: coords.y - startPoint.y,
        color: currentColor,
        size: currentBrushSize,
        timestamp: Date.now(),
      };
    } else if (currentTool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(coords.x - startPoint.x, 2) + Math.pow(coords.y - startPoint.y, 2)
      );
      drawing = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'circle',
        x: startPoint.x,
        y: startPoint.y,
        radius,
        color: currentColor,
        size: currentBrushSize,
        timestamp: Date.now(),
      };
    }

    if (drawing) {
      addDrawing(drawing);
    }

    // Clear temp canvas
    const tempCanvas = tempCanvasRef.current;
    if (tempCanvas) {
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      }
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoints([]);
  }, [isDrawing, isReadOnly, startPoint, currentTool, currentColor, currentBrushSize, currentPoints, getCanvasCoordinates, addDrawing, isStorageLoaded]);

  // Render drawings
  const renderDrawings = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !drawings) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all stored drawings
    drawings.forEach((drawing) => {
      if (drawing.type === 'line') {
        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = drawing.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        drawing.points.forEach((point: any, index: number) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      } else if (drawing.type === 'eraser') {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = drawing.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        drawing.points.forEach((point: any, index: number) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      } else if (drawing.type === 'rectangle') {
        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = drawing.size;
        ctx.strokeRect(drawing.x, drawing.y, drawing.width, drawing.height);
      } else if (drawing.type === 'circle') {
        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = drawing.size;
        ctx.beginPath();
        ctx.arc(drawing.x, drawing.y, drawing.radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });

    // Draw text boxes (only non-editing ones)
    textBoxes.forEach((textBox) => {
      if (textBox.text.trim() && !textBox.isEditing) {
        ctx.save();

        // Draw background color (if any)
        if (textBox.backgroundColor) {
          ctx.fillStyle = textBox.backgroundColor;
          ctx.fillRect(textBox.x, textBox.y, textBox.width, textBox.height);
        }

        // Text styling
        ctx.fillStyle = textBox.color;
        ctx.font = `${textBox.fontWeight} ${textBox.fontStyle} ${textBox.fontSize}px ${textBox.fontFamily}`;
        ctx.textAlign = textBox.alignment;
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
        lines.forEach((line: string, lineIndex: number) => {
          if (line.trim()) {
            ctx.fillText(line, drawX, textBox.y + (lineIndex * lineHeight));
          }
        });

        // Draw selected state border
        if (textBox.isSelected && !textBox.isEditing) {
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
        }

        ctx.restore();
      }
    });
  }, [drawings, textBoxes]);

  // Re-render when drawings or textBoxes change
  useEffect(() => {
    renderDrawings();
  }, [renderDrawings]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    clearCanvas: () => {
      console.log('🗑️ Clearing canvas');
      clearAllDrawings();
      toast.success('Canvas cleared');
    },
    undo: () => {
      console.log('↩️ Undo');
      undo();
    },
    redo: () => {
      console.log('↪️ Redo');
      redo();
    },
    canUndo,
    canRedo,
    saveCanvas: async () => {
      console.log('💾 Saving canvas (not implemented yet)');
      toast.info('Save feature coming soon');
    },
    downloadCanvas: () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        toast.error('Canvas not ready');
        return;
      }

      try {
        // Create a temporary canvas to merge both layers
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (!tempCtx) {
          toast.error('Failed to create download canvas');
          return;
        }

        // Draw white background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw main canvas content
        tempCtx.drawImage(canvas, 0, 0);

        // Convert to blob and download
        tempCanvas.toBlob((blob) => {
          if (!blob) {
            toast.error('Failed to generate image');
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          link.download = `whiteboard-${timestamp}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          
          console.log('✅ Canvas downloaded');
          toast.success('Canvas downloaded');
        }, 'image/png');
      } catch (error) {
        console.error('❌ Download failed:', error);
        toast.error('Failed to download canvas');
      }
    },
  }), [canUndo, canRedo, undo, redo, clearAllDrawings]);

  // 🎯 Get custom cursor style based on current tool
  const getCustomCursorStyle = useCallback((): React.CSSProperties => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { display: 'none' };
    }

    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / canvas.width;
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
  }, [currentTool, currentColor, currentBrushSize, currentFontSize]);

  // 🎯 Handle mouse movement to update custom cursor position
  const handleCustomCursorMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (customCursorRef.current && containerRef.current && canvasRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      // 🎯 FIX: Calculate position relative to the actual canvas element, not container
      const x = e.clientX - canvasRect.left;
      const y = e.clientY - canvasRect.top;

      // Position cursor relative to canvas
      customCursorRef.current.style.left = `${canvasRect.left - containerRect.left + x}px`;
      customCursorRef.current.style.top = `${canvasRect.top - containerRect.top + y}px`;
      customCursorRef.current.style.transform = 'translate(-50%, -50%)';
    }
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full"
      onMouseMove={!isReadOnly ? handleCustomCursorMove : undefined}
      onMouseEnter={!isReadOnly ? () => {
        if (customCursorRef.current) customCursorRef.current.style.display = 'block';
      } : undefined}
      onMouseLeave={!isReadOnly ? () => {
        if (customCursorRef.current) customCursorRef.current.style.display = 'none';
      } : undefined}
    >
      {/* Loading indicator */}
      {!isStorageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            <p className="text-sm text-slate-600">Loading whiteboard...</p>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0 w-full h-full bg-white rounded-lg"
        style={{ touchAction: 'none' }}
      />
      <canvas
        ref={tempCanvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0 w-full h-full"
        style={{ 
          touchAction: 'none', 
          cursor: 'none' // 🎯 Hide default cursor
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* 🎯 Custom cursor element */}
      <div
        ref={customCursorRef}
        style={getCustomCursorStyle()}
      />
    </div>
  );
});

WhiteboardCanvas.displayName = 'WhiteboardCanvas';

// Main component with RoomProvider
export const LiveblocksWhiteboard = forwardRef<LiveblocksWhiteboardRef, LiveblocksWhiteboardProps>(({
  classroomSlug,
  sessionId,
  userId,
  userName,
  userRole,
  ...props
}, ref) => {
  // Memoize roomId to prevent unnecessary re-renders
  const roomId = React.useMemo(
    () => `classroom:${classroomSlug}:session:${sessionId}:whiteboard`,
    [classroomSlug, sessionId]
  );

  // Only log on mount and when roomId changes
  React.useEffect(() => {
    console.log('🎨 [LiveblocksWhiteboard] Mounted with roomId:', roomId);
    return () => {
      console.log('🎨 [LiveblocksWhiteboard] Unmounting');
    };
  }, [roomId]);

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ cursor: null, selectedTool: null }}
      initialStorage={{ drawings: [], textBoxes: [] }}
    >
      <WhiteboardCanvas ref={ref} {...props} />
    </RoomProvider>
  );
});

LiveblocksWhiteboard.displayName = 'LiveblocksWhiteboard';
