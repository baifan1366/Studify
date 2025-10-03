'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { 
  useMyPresence, 
  useOthers, 
  useMutation,
  useStorage,
  useBroadcastEvent,
  useEventListener,
  RoomProvider,
  useHistory,
  useCanUndo,
  useCanRedo,
  useUndo,
  useRedo,
} from '@/lib/liveblocks';
import { LiveMap } from '@liveblocks/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Pencil, 
  Eraser, 
  Square, 
  Circle, 
  Undo, 
  Redo, 
  Trash2,
  Palette,
  Users,
  MousePointer
} from 'lucide-react';
import { COLORS, Tool, initialStorage } from '@/lib/liveblocks';

interface CollaborativeWhiteboardProps {
  roomId: string;
  userInfo: {
    id: string;
    name: string;
    avatar: string;
    role: 'student' | 'tutor';
  };
}

function WhiteboardCanvas() {
  const [myPresence, updateMyPresence] = useMyPresence();
  const others = useOthers();
  const shapes = useStorage((root) => root.shapes);
  const history = useHistory();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const undo = useUndo();
  const redo = useRedo();
  
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const broadcast = useBroadcastEvent();

  const insertShape = useMutation(({ storage }, shape: any) => {
    const shapes = storage.get('shapes');
    if (shapes) {
      shapes.set(shape.id, shape);
    }
  }, []);

  const deleteShape = useMutation(({ storage }, shapeId: string) => {
    const shapes = storage.get('shapes');
    if (shapes) {
      shapes.delete(shapeId);
    }
  }, []);

  const clearCanvas = useMutation(({ storage }) => {
    const shapes = storage.get('shapes');
    // LiveMap doesn't have clear(), need to delete all keys
    if (shapes) {
      Array.from(shapes.keys()).forEach(key => {
        shapes.delete(key);
      });
    }
  }, []);

  // Handle mouse movement
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    updateMyPresence({
      ...myPresence,
      cursor: { x, y },
      isDrawing,
    });

    // If currently drawing
    if (isDrawing && tool === 'pen') {
      setCurrentPath(prev => [...prev, { x, y }]);
    }
  }, [myPresence, updateMyPresence, isDrawing, tool]);

  // Handle mouse leave
  const handlePointerLeave = useCallback(() => {
    updateMyPresence({
      ...myPresence,
      cursor: null,
      isDrawing: false,
    });
  }, [myPresence, updateMyPresence]);

  // Start drawing
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    
    if (tool === 'pen') {
      setCurrentPath([{ x, y }]);
      broadcast({ type: 'DRAWING_START', data: { x, y } });
    } else if (tool === 'rectangle' || tool === 'circle') {
      // Create shape
      const shape = {
        id: `${Date.now()}-${Math.random()}`,
        type: tool,
        x,
        y,
        width: tool === 'rectangle' ? 0 : undefined,
        height: tool === 'rectangle' ? 0 : undefined,
        radius: tool === 'circle' ? 0 : undefined,
        fill: 'transparent',
        stroke: color,
        strokeWidth,
        userId: myPresence.userName,
        timestamp: Date.now(),
      };
      insertShape(shape);
    }
  }, [tool, color, strokeWidth, myPresence.userName, insertShape, broadcast]);

  // End drawing
  const handlePointerUp = useCallback(() => {
    if (isDrawing && tool === 'pen' && currentPath.length > 1) {
      const shape = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'path' as const,
        x: 0,
        y: 0,
        points: currentPath,
        fill: 'transparent',
        stroke: color,
        strokeWidth,
        userId: myPresence.userName,
        timestamp: Date.now(),
      };
      insertShape(shape);
      broadcast({ type: 'DRAWING_END', data: { shapeId: shape.id } });
    }
    
    setIsDrawing(false);
    setCurrentPath([]);
  }, [isDrawing, tool, currentPath, color, strokeWidth, myPresence.userName, insertShape, broadcast]);

  // Listen for drawing events
  useEventListener(({ event }) => {
    if (event.type === 'CLEAR_CANVAS') {
      // Can add clear animation or notification
    }
  });

  // Render path
  const renderPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    return `M ${points[0].x} ${points[0].y} ${points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`;
  };

  // Get user color
  const getUserColor = (connectionId: number) => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    return colors[connectionId % colors.length];
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Drawing tools */}
            <div className="flex items-center gap-2">
              <Button
                variant={tool === 'pen' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('pen')}
              >
                <Pencil className="w-4 h-4 mr-1" />
                Pen
              </Button>
              <Button
                variant={tool === 'eraser' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('eraser')}
              >
                <Eraser className="w-4 h-4 mr-1" />
                Eraser
              </Button>
              <Button
                variant={tool === 'rectangle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('rectangle')}
              >
                <Square className="w-4 h-4 mr-1" />
                Rectangle
              </Button>
              <Button
                variant={tool === 'circle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('circle')}
              >
                <Circle className="w-4 h-4 mr-1" />
                Circle
              </Button>
            </div>

            {/* Color selection */}
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <div className="flex gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-6 h-6 rounded border-2 ${
                      color === c ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => undo()}
                disabled={!canUndo}
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => redo()}
                disabled={!canRedo}
              >
                <Redo className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  clearCanvas();
                  broadcast({ type: 'CLEAR_CANVAS', data: {} });
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          {/* Brush size */}
          <div className="flex items-center gap-4 mt-4">
            <label className="text-sm font-medium">Brush Size:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-sm">{strokeWidth}px</span>
          </div>
        </CardContent>
      </Card>

      {/* Online users */}
      <Card className="mb-4">
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Online Users ({others.length + 1}):</span>
            <Badge variant="outline">{myPresence.userName} (Me)</Badge>
            {others.map(({ connectionId, presence }) => (
              <Badge key={connectionId} variant="secondary">
                {presence.userName}
                {presence.isDrawing && <MousePointer className="w-3 h-3 ml-1" />}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Whiteboard canvas */}
      <div className="flex-1 relative bg-white border rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-crosshair"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          {/* Render existing shapes */}
          {shapes && Array.from(shapes.entries()).map(([id, shape]) => {
            if (shape.type === 'path' && shape.points) {
              return (
                <path
                  key={id}
                  d={renderPath(shape.points)}
                  fill={shape.fill}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            } else if (shape.type === 'rectangle') {
              return (
                <rect
                  key={id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width || 0}
                  height={shape.height || 0}
                  fill={shape.fill}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                />
              );
            } else if (shape.type === 'circle') {
              return (
                <circle
                  key={id}
                  cx={shape.x}
                  cy={shape.y}
                  r={shape.radius || 0}
                  fill={shape.fill}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                />
              );
            }
            return null;
          })}

          {/* Render current drawing path */}
          {isDrawing && tool === 'pen' && currentPath.length > 1 && (
            <path
              d={renderPath(currentPath)}
              fill="transparent"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.7}
            />
          )}
          
          {/* Render other users' cursors */}
          {others.map(({ connectionId, presence }) => {
            if (!presence.cursor) return null;
            
            const userColor = getUserColor(connectionId);
            
            return (
              <g key={connectionId}>
                <circle
                  cx={presence.cursor.x}
                  cy={presence.cursor.y}
                  r="8"
                  fill={userColor}
                  opacity={0.8}
                />
                <text
                  x={presence.cursor.x + 15}
                  y={presence.cursor.y - 10}
                  className="text-xs font-medium pointer-events-none"
                  fill={userColor}
                >
                  {presence.userName}
                </text>
                {presence.isDrawing && (
                  <circle
                    cx={presence.cursor.x}
                    cy={presence.cursor.y}
                    r="12"
                    fill="none"
                    stroke={userColor}
                    strokeWidth="2"
                    opacity={0.6}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function CollaborativeWhiteboard({ roomId, userInfo }: CollaborativeWhiteboardProps) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        userName: userInfo.name,
        userAvatar: userInfo.avatar,
        userRole: userInfo.role,
        isDrawing: false,
        selection: null,
        userColor: '#000000',
      }}
      initialStorage={initialStorage}
    >
      <WhiteboardCanvas />
    </RoomProvider>
  );
}
