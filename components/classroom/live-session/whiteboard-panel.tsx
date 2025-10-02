'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  PenTool,
  Eraser,
  Square,
  Circle,
  Type,
  Palette,
  Trash2,
  Download,
  Save,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';

interface WhiteboardPanelProps {
  isOpen: boolean;
  classroomSlug: string;
  sessionId?: string;
  userRole?: 'student' | 'tutor';
  // 工具栏状态
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentBrushSize: number;
  setCurrentBrushSize: (size: number) => void;
  currentFontSize: number;
  setCurrentFontSize: (size: number) => void;
  currentTextAlign: 'left' | 'center' | 'right';
  setCurrentTextAlign: (align: 'left' | 'center' | 'right') => void;
  // 工具栏操作
  onClearCanvas?: () => void;
  onSaveCanvas?: () => Promise<void>;
  onDownloadCanvas?: () => void;
}

const COLORS = [
  '#000000', // 黑色
  '#FF0000', // 红色
  '#00FF00', // 绿色
  '#0000FF', // 蓝色
  '#FFFF00', // 黄色
  '#FF00FF', // 品红
  '#00FFFF', // 青色
  '#FFA500', // 橙色
  '#800080', // 紫色
  '#FFC0CB', // 粉色
];

const BRUSH_SIZES = [2, 4, 8, 12, 16];
const FONT_SIZES = [12, 16, 20, 24, 32];

type Tool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';

export function WhiteboardPanel({ 
  isOpen, 
  classroomSlug, 
  sessionId, 
  userRole,
  currentTool,
  setCurrentTool,
  currentColor,
  setCurrentColor,
  currentBrushSize,
  setCurrentBrushSize,
  currentFontSize,
  setCurrentFontSize,
  currentTextAlign,
  setCurrentTextAlign,
  onClearCanvas,
  onSaveCanvas,
  onDownloadCanvas
}: WhiteboardPanelProps) {

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="w-full h-full bg-slate-800/50 backdrop-blur-sm border-l border-slate-700/50 flex flex-col"
          style={{
            minWidth: '200px',
            maxWidth: '600px',
            width: '100%'
          }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          {/* 工具栏头部 */}
          <div className="p-2 sm:p-4 border-b border-slate-700/50">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-4">
              <PenTool className="w-5 h-5" />
              协作白板
            </h3>

            {/* 工具选择 */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 sm:gap-2 mb-4">
              <Button
                variant={currentTool === 'pen' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentTool('pen')}
                className="h-10"
              >
                <PenTool className="w-4 h-4" />
              </Button>
              <Button
                variant={currentTool === 'eraser' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentTool('eraser')}
                className="h-10"
              >
                <Eraser className="w-4 h-4" />
              </Button>
              <Button
                variant={currentTool === 'rectangle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentTool('rectangle')}
                className="h-10"
              >
                <Square className="w-4 h-4" />
              </Button>
              <Button
                variant={currentTool === 'circle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentTool('circle')}
                className="h-10"
              >
                <Circle className="w-4 h-4" />
              </Button>
              <Button
                variant={currentTool === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentTool('text')}
                className="h-10"
              >
                <Type className="w-4 h-4" />
              </Button>
            </div>

            {/* 颜色选择 */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">颜色</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCurrentColor(color)}
                    className={`w-8 h-8 rounded border-2 ${
                      currentColor === color ? 'border-white' : 'border-slate-600'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* 画笔大小 - 仅在非文本工具时显示 */}
            {currentTool !== 'text' && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-slate-300">画笔大小</span>
                  <span className="text-xs text-slate-400">({currentBrushSize}px)</span>
                </div>
                <div className="flex gap-1">
                  {BRUSH_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setCurrentBrushSize(size)}
                      className={`w-8 h-8 rounded border ${
                        currentBrushSize === size ? 'border-white bg-slate-600' : 'border-slate-600'
                      } flex items-center justify-center`}
                    >
                      <div
                        className="rounded-full bg-white"
                        style={{ width: `${Math.min(size, 6)}px`, height: `${Math.min(size, 6)}px` }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 文本工具选项 */}
            {currentTool === 'text' && (
              <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
                <h4 className="text-sm font-medium text-white mb-2">文本选项</h4>
                
                {/* 字体大小 */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-slate-300">字体大小</span>
                    <span className="text-xs text-slate-400">({currentFontSize}px)</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
                    {FONT_SIZES.map((size) => (
                      <button
                        key={size}
                        onClick={() => setCurrentFontSize(size)}
                        className={`px-2 py-1 rounded text-xs ${
                          currentFontSize === size 
                            ? 'bg-indigo-500 text-white' 
                            : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                        }`}
                      >
                        {size}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* 对齐方式 */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-slate-300">对齐方式</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentTextAlign('left')}
                      className={`px-3 py-1.5 rounded flex items-center gap-1 ${
                        currentTextAlign === 'left'
                          ? 'bg-indigo-500 text-white' 
                          : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }`}
                      title="左对齐"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentTextAlign('center')}
                      className={`px-3 py-1.5 rounded flex items-center gap-1 ${
                        currentTextAlign === 'center'
                          ? 'bg-indigo-500 text-white' 
                          : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }`}
                      title="居中对齐"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentTextAlign('right')}
                      className={`px-3 py-1.5 rounded flex items-center gap-1 ${
                        currentTextAlign === 'right'
                          ? 'bg-indigo-500 text-white' 
                          : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }`}
                      title="右对齐"
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  💡 点击白板任意位置创建文本框<br/>
                  双击文本框编辑，单击拖动位置
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={onSaveCanvas}>
                  <Save className="w-4 h-4 mr-1" />
                  保存到云端
                </Button>
                <Button variant="outline" size="sm" onClick={onDownloadCanvas}>
                  <Download className="w-4 h-4 mr-1" />
                  下载图片
                </Button>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={onClearCanvas}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                清空画布
              </Button>
            </div>
          </div>


          {/* 底部信息 */}
          <div className="p-2 sm:p-4 border-t border-slate-700/50">
            <div className="text-xs text-slate-400 space-y-1">
              <div>教室: {classroomSlug}</div>
              <div>会话: {sessionId || '默认'}</div>
              <div>角色: {userRole === 'tutor' ? '导师' : '学生'}</div>
              <div className="text-slate-500 mt-2">
                💡 提示: 使用鼠标绘制，选择不同工具和颜色进行创作
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
