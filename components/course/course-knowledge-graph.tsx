'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut,
  Filter,
  Search,
  BookOpen
} from 'lucide-react';

interface Concept {
  id: string;
  name: string;
  description: string;
  difficultyLevel: number;
  estimatedTimeMinutes: number;
  lessons: Array<{
    id: string;
    title: string;
    position: number;
    relevanceScore: number;
  }>;
}

interface ConceptLink {
  id: string;
  source: string;
  target: string;
  relationType: 'prerequisite' | 'related' | 'builds_on' | 'applies_to';
  strength: number;
  sourceLabel: string;
  targetLabel: string;
}

interface CourseKnowledgeGraphProps {
  courseId: string;
  concepts: Concept[];
  links: ConceptLink[];
  onConceptClick?: (concept: Concept) => void;
  className?: string;
}

export default function CourseKnowledgeGraph({ 
  courseId, 
  concepts, 
  links, 
  onConceptClick,
  className = '' 
}: CourseKnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Graph dimensions
  const width = 800;
  const height = 600;
  const nodeRadius = 30;

  // Filter concepts based on search and level
  const filteredConcepts = concepts.filter(concept => {
    const matchesSearch = concept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         concept.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === null || concept.difficultyLevel === filterLevel;
    return matchesSearch && matchesLevel;
  });

  // Filter links to only include filtered concepts
  const filteredLinks = links.filter(link => 
    filteredConcepts.some(c => c.id === link.source) &&
    filteredConcepts.some(c => c.id === link.target)
  );

  // Simple force-directed layout
  const calculateLayout = () => {
    const nodes = filteredConcepts.map((concept, index) => {
      const angle = (index / filteredConcepts.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.3;
      return {
        ...concept,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
      };
    });

    return nodes;
  };

  const nodes = calculateLayout();

  const getNodeColor = (concept: Concept) => {
    const colors = {
      1: '#3B82F6', // Blue - Beginner
      2: '#10B981', // Green - Intermediate  
      3: '#F59E0B', // Yellow - Advanced
      4: '#EF4444', // Red - Expert
    };
    return colors[concept.difficultyLevel as keyof typeof colors] || '#6B7280';
  };

  const getLinkColor = (link: ConceptLink) => {
    const colors = {
      prerequisite: '#EF4444',
      related: '#10B981',
      builds_on: '#3B82F6',
      applies_to: '#8B5CF6',
    };
    return colors[link.relationType] || '#6B7280';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.3));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedConcept(null);
  };

  const handleConceptClick = (concept: Concept) => {
    setSelectedConcept(concept.id === selectedConcept ? null : concept.id);
    onConceptClick?.(concept);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={containerRef}
        className={`bg-white/5 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden ${
          isFullscreen ? 'fixed inset-4 z-50' : 'h-96'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <div className="flex items-center gap-2">
            <Brain size={20} className="text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Knowledge Graph</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search concepts..."
                className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:outline-none focus:border-blue-400 w-48"
              />
            </div>

            {/* Level Filter */}
            <select
              value={filterLevel || ''}
              onChange={(e) => setFilterLevel(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">All Levels</option>
              <option value="1">Beginner</option>
              <option value="2">Intermediate</option>
              <option value="3">Advanced</option>
              <option value="4">Expert</option>
            </select>

            {/* Controls */}
            <div className="flex items-center gap-1 border-l border-white/20 pl-2">
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={16} className="text-white/70" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={16} className="text-white/70" />
              </button>
              <button
                onClick={handleReset}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Reset View"
              >
                <RotateCcw size={16} className="text-white/70" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 size={16} className="text-white/70" />
                ) : (
                  <Maximize2 size={16} className="text-white/70" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Graph */}
        <div className="flex-1 relative overflow-hidden">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            className="cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <defs>
              {/* Arrow markers for different link types */}
              {['prerequisite', 'related', 'builds_on', 'applies_to'].map(type => (
                <marker
                  key={type}
                  id={`arrow-${type}`}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="3"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path
                    d="M0,0 L0,6 L9,3 z"
                    fill={getLinkColor({ relationType: type } as ConceptLink)}
                  />
                </marker>
              ))}
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Links */}
              {filteredLinks.map(link => {
                const sourceNode = nodes.find(n => n.id === link.source);
                const targetNode = nodes.find(n => n.id === link.target);
                
                if (!sourceNode || !targetNode) return null;

                return (
                  <g key={link.id}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={getLinkColor(link)}
                      strokeWidth={Math.max(1, link.strength * 3)}
                      strokeOpacity={0.6}
                      markerEnd={`url(#arrow-${link.relationType})`}
                    />
                    {/* Link label */}
                    <text
                      x={(sourceNode.x + targetNode.x) / 2}
                      y={(sourceNode.y + targetNode.y) / 2}
                      fill="white"
                      fontSize="10"
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                      opacity={0.7}
                    >
                      {link.relationType.replace('_', ' ')}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map(node => (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeRadius}
                    fill={getNodeColor(node)}
                    stroke={selectedConcept === node.id ? '#FFFFFF' : 'transparent'}
                    strokeWidth={selectedConcept === node.id ? 3 : 0}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleConceptClick(node)}
                  />
                  
                  {/* Node icon */}
                  <BookOpen
                    x={node.x - 8}
                    y={node.y - 8}
                    width={16}
                    height={16}
                    className="pointer-events-none"
                    fill="white"
                  />
                  
                  {/* Node label */}
                  <text
                    x={node.x}
                    y={node.y + nodeRadius + 15}
                    fill="white"
                    fontSize="12"
                    textAnchor="middle"
                    className="pointer-events-none select-none font-medium"
                  >
                    {node.name.length > 12 ? `${node.name.substring(0, 12)}...` : node.name}
                  </text>
                  
                  {/* Difficulty indicator */}
                  <circle
                    cx={node.x + nodeRadius - 8}
                    cy={node.y - nodeRadius + 8}
                    r={6}
                    fill="rgba(0,0,0,0.7)"
                    className="pointer-events-none"
                  />
                  <text
                    x={node.x + nodeRadius - 8}
                    y={node.y - nodeRadius + 8}
                    fill="white"
                    fontSize="8"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="pointer-events-none select-none font-bold"
                  >
                    {node.difficultyLevel}
                  </text>
                </g>
              ))}
            </g>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3">
            <div className="text-white text-sm font-medium mb-2">Legend</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-white/70">Beginner</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-white/70">Intermediate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-white/70">Advanced</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-white/70">Expert</span>
              </div>
            </div>
          </div>

          {/* Concept Details Panel */}
          {selectedConcept && (
            <motion.div
              className="absolute top-4 right-4 w-80 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-white/20"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {(() => {
                const concept = concepts.find(c => c.id === selectedConcept);
                if (!concept) return null;

                return (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-lg font-semibold text-white">{concept.name}</h4>
                      <button
                        onClick={() => setSelectedConcept(null)}
                        className="text-white/50 hover:text-white/80 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                    
                    <p className="text-white/70 text-sm mb-4">{concept.description}</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Difficulty:</span>
                        <span className="text-white">Level {concept.difficultyLevel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Est. Time:</span>
                        <span className="text-white">{concept.estimatedTimeMinutes} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Lessons:</span>
                        <span className="text-white">{concept.lessons.length}</span>
                      </div>
                    </div>

                    {concept.lessons.length > 0 && (
                      <div className="mt-4">
                        <div className="text-white/80 text-sm font-medium mb-2">Related Lessons:</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {concept.lessons.map(lesson => (
                            <div key={lesson.id} className="text-xs text-white/60 flex justify-between">
                              <span>{lesson.title}</span>
                              <span>{lesson.relevanceScore.toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/20 border-t border-white/20 text-xs text-white/60">
          <div>
            {filteredConcepts.length} concepts, {filteredLinks.length} connections
          </div>
          <div>
            Zoom: {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}
