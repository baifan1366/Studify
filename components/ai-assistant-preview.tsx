"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Upload,
  Zap,
  ArrowRight,
  Camera,
  MessageSquare
} from 'lucide-react';

interface AIAssistantPreviewProps {
  onExperienceAI?: () => void;
}

export default function AIAssistantPreview({ onExperienceAI }: AIAssistantPreviewProps) {
  const [activeDemo, setActiveDemo] = useState(0);

  const demoFeatures = [
    {
      icon: Upload,
      title: "Upload & Solve",
      description: "Upload a problem → Get instant step-by-step solution",
      preview: "📸 Take a photo of your math problem and get detailed explanations instantly"
    },
    {
      icon: Brain,
      title: "Mind Map Generator",
      description: "Generate a sample learning mind map",
      preview: "🧠 Create visual learning maps for any topic to enhance understanding"
    },
    {
      icon: MessageSquare,
      title: "AI Tutor Chat",
      description: "Ask questions and get personalized explanations",
      preview: "💬 Chat with AI tutor for real-time help and clarifications"
    }
  ];

  return (
    <motion.section
      className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
          <Brain className="text-white" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white dark:text-white">AI Learning Assistant</h2>
          <p className="text-white/70 dark:text-white/70">Your personal AI copilot for learning</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demo Features */}
        <div className="space-y-4">
          {demoFeatures.map((feature, index) => {
            const IconComponent = feature.icon;
            const isActive = activeDemo === index;
            
            return (
              <motion.div
                key={index}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                  isActive 
                    ? 'bg-white/10 border-purple-400/50 shadow-lg' 
                    : 'bg-white/5 border-white/10 hover:bg-white/8'
                }`}
                onClick={() => setActiveDemo(index)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    isActive ? 'bg-purple-500' : 'bg-white/10'
                  }`}>
                    <IconComponent size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-white/70">{feature.description}</p>
                  </div>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 bg-purple-400 rounded-full"
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Preview Panel */}
        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-6 border border-purple-400/30">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeDemo}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  {React.createElement(demoFeatures[activeDemo].icon, { 
                    size: 32, 
                    className: "text-white" 
                  })}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3">
                  {demoFeatures[activeDemo].title}
                </h3>
                
                <p className="text-white/80 mb-6">
                  {demoFeatures[activeDemo].preview}
                </p>

                {/* Interactive Demo Elements */}
                <div className="space-y-3">
                  {activeDemo === 0 && (
                    <motion.div
                      className="bg-white/10 rounded-lg p-4 border-2 border-dashed border-white/30"
                      whileHover={{ borderColor: 'rgba(255,255,255,0.5)' }}
                    >
                      <Camera size={24} className="text-white/60 mx-auto mb-2" />
                      <p className="text-sm text-white/70">Drop your problem image here</p>
                    </motion.div>
                  )}
                  
                  {activeDemo === 1 && (
                    <div className="grid grid-cols-2 gap-2">
                      {['Math', 'Physics', 'Chemistry', 'Biology'].map((subject, i) => (
                        <motion.div
                          key={subject}
                          className="bg-white/10 rounded-lg p-2 text-center text-sm text-white/80"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          {subject}
                        </motion.div>
                      ))}
                    </div>
                  )}
                  
                  {activeDemo === 2 && (
                    <motion.div
                      className="bg-white/10 rounded-lg p-3 text-left"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="flex items-center gap-2 text-sm text-white/70 mb-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        AI Tutor is online
                      </div>
                      <p className="text-sm text-white/80">
                        "How can I help you with your studies today?"
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* CTA Button */}
      <motion.div
        className="text-center mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.button
          onClick={onExperienceAI}
          className="group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex items-center gap-2">
            <Zap size={20} />
            Experience AI Tutoring
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.button>
      </motion.div>
    </motion.section>
  );
}
