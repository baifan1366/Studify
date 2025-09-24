'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useWhiteboardManager, WhiteboardEvent } from '@/hooks/classroom/use-whiteboard';

interface WhiteboardCanvasProps {
  classroomSlug: string;
  whiteboardId: string;
  isReadOnly?: boolean;
  className?: string;
}

interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: 'pen' | 'eraser';
}

export default function WhiteboardCanvas({
  classroomSlug,
  whiteboardId,
  isReadOnly = false,
  className = ''
}: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  
  const { events, sendEvent, handleNewEvents, isLoading } = useWhiteboardManager(
    classroomSlug, 
    whiteboardId
  );

  // Handle new events from other users
  useEffect(() => {
    if (events?.data) {
      handleNewEvents(events.data);
      processEvents(events.data);
    }
  }, [events?.data, handleNewEvents]);

  const processEvents = useCallback((eventList: WhiteboardEvent[]) => {
    eventList.forEach(event => {
      switch (event.kind) {
        case 'draw_start':
          const newPath: DrawingPath = {
            id: event.payload.id,
            points: [event.payload.point],
            color: event.payload.color,
            width: event.payload.width,
            tool: event.payload.tool
          };
          setPaths(prev => [...prev, newPath]);
          break;

        case 'draw_move':
          setPaths(prev => prev.map(path => 
            path.id === event.payload.id 
              ? { ...path, points: [...path.points, event.payload.point] }
              : path
          ));
          break;

        case 'draw_end':
          // Path is already updated via draw_move events
          break;

        case 'clear_canvas':
          setPaths([]);
          break;

        case 'undo':
          setPaths(prev => prev.slice(0, -1));
          break;
      }
    });
  }, []);

  const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isReadOnly) return;

    const point = getCanvasPoint(e);
    const pathId = `${Date.now()}-${Math.random()}`;
    
    const newPath: DrawingPath = {
      id: pathId,
      points: [point],
      color,
      width: strokeWidth,
      tool
    };

    setCurrentPath(newPath);
    setIsDrawing(true);

    // Send draw_start event
    sendEvent('draw_start', {
      id: pathId,
      point,
      color,
      width: strokeWidth,
      tool
    });
  }, [isReadOnly, getCanvasPoint, color, strokeWidth, tool, sendEvent]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentPath || isReadOnly) return;

    const point = getCanvasPoint(e);
    const updatedPath = {
      ...currentPath,
      points: [...currentPath.points, point]
    };

    setCurrentPath(updatedPath);

    // Send draw_move event
    sendEvent('draw_move', {
      id: currentPath.id,
      point
    });
  }, [isDrawing, currentPath, isReadOnly, getCanvasPoint, sendEvent]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !currentPath) return;

    setPaths(prev => [...prev, currentPath]);
    setIsDrawing(false);

    // Send draw_end event
    sendEvent('draw_end', {
      id: currentPath.id
    });

    setCurrentPath(null);
  }, [isDrawing, currentPath, sendEvent]);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all completed paths
    paths.forEach(path => {
      if (path.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = path.tool === 'eraser' ? '#FFFFFF' : path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (path.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });

    // Draw current path being drawn
    if (currentPath && currentPath.points.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = currentPath.tool === 'eraser' ? '#FFFFFF' : currentPath.color;
      ctx.lineWidth = currentPath.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentPath.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.moveTo(currentPath.points[0].x, currentPath.points[0].y);
      currentPath.points.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
  }, [paths, currentPath]);

  const clearCanvas = useCallback(() => {
    if (isReadOnly) return;
    
    setPaths([]);
    setCurrentPath(null);
    sendEvent('clear_canvas', {});
  }, [isReadOnly, sendEvent]);

  const undo = useCallback(() => {
    if (isReadOnly || paths.length === 0) return;
    
    setPaths(prev => prev.slice(0, -1));
    sendEvent('undo', {});
  }, [isReadOnly, paths.length, sendEvent]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-white border rounded-lg ${className}`}>
        <div className="text-gray-500">Loading whiteboard...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      {!isReadOnly && (
        <div className="flex items-center gap-2 p-2 bg-gray-100 border-b">
          <button
            onClick={() => setTool('pen')}
            className={`px-3 py-1 rounded ${tool === 'pen' ? 'bg-blue-500 text-white' : 'bg-white'}`}
          >
            Pen
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`px-3 py-1 rounded ${tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-white'}`}
          >
            Eraser
          </button>
          
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
            disabled={tool === 'eraser'}
          />
          
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-20"
          />
          
          <button
            onClick={undo}
            disabled={paths.length === 0}
            className="px-3 py-1 rounded bg-yellow-500 text-white disabled:bg-gray-300"
          >
            Undo
          </button>
          
          <button
            onClick={clearCanvas}
            className="px-3 py-1 rounded bg-red-500 text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full border bg-white cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </div>
  );
}
