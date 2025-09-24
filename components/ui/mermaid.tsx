'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MermaidProps {
  chart: string;
  className?: string;
}

export default function Mermaid({ chart, className = '' }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current || !chart || chart.trim().length === 0) {
      setIsLoading(false);
      return;
    }

    const renderChart = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 动态导入 mermaid 以避免 SSR 问题
        const mermaid = (await import('mermaid')).default;
        
        // 简化 Mermaid 配置以避免渲染问题
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true
          }
        });

        // 清除之前的内容
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // 生成唯一ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // 清理图表代码
        const cleanChart = chart.trim();
        console.log('🎨 Rendering mermaid chart:', cleanChart.substring(0, 100) + '...');
        
        // 添加超时处理
        const renderPromise = mermaid.render(id, cleanChart);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Mermaid rendering timeout')), 10000)
        );
        
        // 渲染图表，最多等待10秒
        const { svg } = await Promise.race([renderPromise, timeoutPromise]) as any;
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
          
          // 添加一些样式调整
          const svgElement = containerRef.current.querySelector('svg');
          if (svgElement) {
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
          }
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError('Failed to render diagram');
        
        // 如果渲染失败，显示原始代码和链接
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="bg-slate-800 border border-slate-600 rounded-lg p-4">
              <div class="text-sm text-slate-400 mb-2 flex items-center gap-2">
                <span>🔗</span>
                <span>Mermaid Diagram Code</span>
              </div>
              <pre class="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-900 p-3 rounded border overflow-x-auto">${chart}</pre>
              <div class="mt-3 text-xs text-slate-500">
                💡 <a href="https://mermaid.live" target="_blank" class="text-orange-400 hover:text-orange-300 underline">点击这里在 mermaid.live 查看可视化图表</a>
              </div>
            </div>
          `;
        }
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(renderChart, 100); // 小延迟确保 DOM 准备好
    return () => clearTimeout(timeoutId);
  }, [isClient, chart]);

  if (!isClient) {
    return (
      <div className={`animate-pulse bg-slate-700 rounded-lg h-48 flex items-center justify-center ${className}`}>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading diagram...</span>
        </div>
      </div>
    );
  }

  if (!chart || chart.trim().length === 0) {
    return (
      <div className={`bg-slate-800/50 rounded-lg h-48 flex items-center justify-center border border-dashed border-slate-600 ${className}`}>
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm">Waiting for diagram data...</p>
          <p className="text-xs text-slate-500 mt-1">AI is generating your learning path</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-slate-700 rounded-lg h-48 flex items-center justify-center ${className}`}>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Rendering diagram...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`mermaid-container ${className}`}>
      <div 
        ref={containerRef}
        className="mermaid-chart bg-slate-900 rounded-lg p-4 overflow-auto border border-slate-700"
        style={{ minHeight: '200px' }}
      />
      {error && (
        <div className="mt-2 text-xs text-amber-400 bg-amber-400/10 p-2 rounded border border-amber-400/20">
          ⚠️ Diagram rendering failed. Showing code with link to external viewer.
        </div>
      )}
    </div>
  );
}
