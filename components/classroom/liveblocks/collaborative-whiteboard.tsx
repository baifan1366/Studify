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
    shapes.set(shape.id, shape);
  }, []);

  const deleteShape = useMutation(({ storage }, shapeId: string) => {
    const shapes = storage.get('shapes');
    shapes.delete(shapeId);
  }, []);

  const clearCanvas = useMutation(({ storage }) => {
    const shapes = storage.get('shapes');
    // LiveMap doesn't have clear(), need to delete all keys
    Array.from(shapes.keys()).forEach(key => {
      shapes.delete(key);
    });
  }, []);

  // 处理鼠标移动
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

    // 如果正在绘制
    if (isDrawing && tool === 'pen') {
      setCurrentPath(prev => [...prev, { x, y }]);
    }
  }, [myPresence, updateMyPresence, isDrawing, tool]);

  // 处理鼠标离开
  const handlePointerLeave = useCallback(() => {
    updateMyPresence({
      ...myPresence,
      cursor: null,
      isDrawing: false,
    });
  }, [myPresence, updateMyPresence]);

  // 开始绘制
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
      // 创建形状
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

  // 结束绘制
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

  // 监听绘制事件
  useEventListener(({ event }) => {
    if (event.type === 'CLEAR_CANVAS') {
      // 可以添加清除动画或通知
    }
  });

  // 渲染路径
  const renderPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    return `M ${points[0].x} ${points[0].y} ${points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`;
  };

  // 获取用户颜色
  const getUserColor = (connectionId: number) => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    return colors[connectionId % colors.length];
  };

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* 绘图工具 */}
            <div className="flex items-center gap-2">
              <Button
                variant={tool === 'pen' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('pen')}
              >
                <Pencil className="w-4 h-4 mr-1" />
                画笔
              </Button>
              <Button
                variant={tool === 'eraser' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('eraser')}
              >
                <Eraser className="w-4 h-4 mr-1" />
                橡皮擦
              </Button>
              <Button
                variant={tool === 'rectangle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('rectangle')}
              >
                <Square className="w-4 h-4 mr-1" />
                矩形
              </Button>
              <Button
                variant={tool === 'circle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('circle')}
              >
                <Circle className="w-4 h-4 mr-1" />
                圆形
              </Button>
            </div>

            {/* 颜色选择 */}
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

            {/* 操作按钮 */}
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
                清空
              </Button>
            </div>
          </div>

          {/* 笔刷大小 */}
          <div className="flex items-center gap-4 mt-4">
            <label className="text-sm font-medium">笔刷大小:</label>
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

      {/* 在线用户 */}
      <Card className="mb-4">
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">在线用户 ({others.length + 1}):</span>
            <Badge variant="outline">{myPresence.userName} (我)</Badge>
            {others.map(({ connectionId, presence }) => (
              <Badge key={connectionId} variant="secondary">
                {presence.userName}
                {presence.isDrawing && <MousePointer className="w-3 h-3 ml-1" />}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 白板画布 */}
      <div className="flex-1 relative bg-white border rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full cursor-crosshair"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          {/* 渲染已有图形 */}
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

          {/* 渲染当前正在绘制的路径 */}
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
          
          {/* 渲染其他用户的光标 */}
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
      }}
      initialStorage={initialStorage}
    >
      <WhiteboardCanvas />
    </RoomProvider>
  );
}
