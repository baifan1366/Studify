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
  // Toolbar state
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
  // Toolbar actions
  onClearCanvas?: () => void;
  onSaveCanvas?: () => Promise<void>;
  onDownloadCanvas?: () => void;
}

const COLORS = [
  '#000000', // Black
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#FFC0CB', // Pink
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
          className="w-full  bg-slate-800/50 backdrop-blur-sm border-l border-slate-700/50 flex flex-col"
          style={{
            minWidth: '200px',
            maxWidth: '600px',
            width: '100%',
            height: '635px'
          }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Toolbar Header */}
          <div className="p-2 sm:p-4 border-b border-slate-700/50">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-4">
              <PenTool className="w-5 h-5" />
              Collaborative Whiteboard
            </h3>

            {/* Tool Selection */}
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

            {/* Color Selection */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">Color</span>
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

            {/* Brush Size - Only shown for non-text tools */}
            {currentTool !== 'text' && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-slate-300">Brush Size</span>
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

            {/* Text Tool Options */}
            {currentTool === 'text' && (
              <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
                <h4 className="text-sm font-medium text-white mb-2">Text Options</h4>
                
                {/* Font Size */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-slate-300">Font Size</span>
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

                {/* Text Alignment */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-slate-300">Alignment</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentTextAlign('left')}
                      className={`px-3 py-1.5 rounded flex items-center gap-1 ${
                        currentTextAlign === 'left'
                          ? 'bg-indigo-500 text-white' 
                          : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }`}
                      title="Left Align"
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
                      title="Center Align"
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
                      title="Right Align"
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  💡 Click anywhere on the whiteboard to create a text box<br/>
                  Single-click to select and drag, double-click to edit text<br/>
                  Text editing now uses React Portal for better performance
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={onSaveCanvas}>
                  <Save className="w-4 h-4 mr-1" />
                  Save to Cloud
                </Button>
                <Button variant="outline" size="sm" onClick={onDownloadCanvas}>
                  <Download className="w-4 h-4 mr-1" />
                  Download Image
                </Button>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={onClearCanvas}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear Canvas
              </Button>
            </div>
          </div>


          {/* Bottom Info */}
          <div className="p-2 sm:p-4 border-t border-slate-700/50">
            <div className="text-xs text-slate-400 space-y-1">
              <div>Classroom: {classroomSlug}</div>
              <div>Session: {sessionId || 'Default'}</div>
              <div>Role: {userRole === 'tutor' ? 'Tutor' : 'Student'}</div>
              <div className="text-slate-500 mt-2">
                💡 Tip: Use mouse to draw, select different tools and colors for creation
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
