"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  Video, 
  Users, 
  Award, 
  Play, 
  Pause,
  Send, 
  Flame, 
  Sparkles,
  Trophy, 
  Volume2, 
  VolumeX,
  Clock,
  ArrowRight,
  CheckCircle2,
  Mic,
  MicOff,
  RotateCcw
} from "lucide-react";

// Define the 4 modules with their metadata
const MODULES = [
  {
    id: "ai-coach",
    title: "AI learning coach",
    shortDesc: "Ask questions, generate plans, and get feedback that adapts to your pace.",
    icon: Brain,
    color: "from-orange-500 to-amber-500",
    themeColor: "#FF6B00",
    textColor: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    glowColor: "rgba(255, 107, 0, 0.15)",
    features: [
      "24/7 Context-Aware Answers",
      "Dynamic Flashcard Generation",
      "Adaptive Learning Path Calibration"
    ]
  },
  {
    id: "video-qa",
    title: "Video Q&A",
    shortDesc: "Jump from a question to the exact lesson moment with timestamped answers.",
    icon: Video,
    color: "from-blue-500 to-indigo-500",
    themeColor: "#3B82F6",
    textColor: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    glowColor: "rgba(59, 130, 246, 0.15)",
    features: [
      "In-video Timestamp Search",
      "Interactive Smart Transcripts",
      "Instant Video-to-Note Clipping"
    ]
  },
  {
    id: "classrooms",
    title: "Live classrooms",
    shortDesc: "Work with tutors and classmates in focused spaces built for real learning.",
    icon: Users,
    color: "from-emerald-500 to-teal-500",
    themeColor: "#10B981",
    textColor: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    glowColor: "rgba(16, 185, 129, 0.15)",
    features: [
      "Collaborative Digital Board",
      "Simultaneous Audio Study Rooms",
      "Peer-to-Peer Peer Tutoring"
    ]
  },
  {
    id: "progress",
    title: "Progress loops",
    shortDesc: "Turn streaks, achievements, and reports into momentum you can see.",
    icon: Award,
    color: "from-violet-500 to-purple-500",
    themeColor: "#8B5CF6",
    textColor: "text-violet-500",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    glowColor: "rgba(139, 92, 246, 0.15)",
    features: [
      "Daily Streaks & Flame Modifiers",
      "Interactive 3D Skill Badges",
      "Weekly Mastery Analytics Reports"
    ]
  }
];

export function ModuleShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoplayTimer = useRef<NodeJS.Timeout | null>(null);
  const [autoplayProgress, setAutoplayProgress] = useState(0);

  // Autoplay functionality - cycles every 7 seconds, pauses when hovered
  useEffect(() => {
    if (isHovered) {
      if (autoplayTimer.current) clearInterval(autoplayTimer.current);
      return;
    }

    const intervalTime = 7000;
    const updateRate = 50; // Update progress every 50ms
    const totalSteps = intervalTime / updateRate;
    let step = (autoplayProgress / 100) * totalSteps;

    autoplayTimer.current = setInterval(() => {
      step += 1;
      const progress = (step / totalSteps) * 100;
      setAutoplayProgress(progress);

      if (step >= totalSteps) {
        setActiveIndex((prev) => (prev + 1) % MODULES.length);
        setAutoplayProgress(0);
        step = 0;
      }
    }, updateRate);

    return () => {
      if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    };
  }, [isHovered, activeIndex, autoplayProgress]);

  const handleTabSelect = (index: number) => {
    setActiveIndex(index);
    setAutoplayProgress(0);
  };

  const activeModule = MODULES[activeIndex];

  return (
    <section 
      ref={containerRef}
      className="relative overflow-hidden bg-gradient-to-b from-[#0D1F1A] via-[#0A1613] to-[#0D1F1A] py-24 border-t border-border/10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Decorative ambient background glows */}
      <div 
        className="absolute -left-48 top-1/4 h-96 w-96 rounded-full blur-[140px] opacity-20 pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: activeModule.themeColor }}
      />
      <div 
        className="absolute -right-48 bottom-1/4 h-96 w-96 rounded-full blur-[140px] opacity-20 pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: activeModule.themeColor }}
      />

      <div className="container mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center mb-16 md:mb-20">
          <span className="mb-4 inline-block text-xs font-black uppercase tracking-[0.28em] text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
            Interactive Deep Dive
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight md:text-6xl text-foreground">
            Explore our core modules.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Click through our specialized study modules to see how Studify keeps your learning cycle moving seamlessly.
          </p>
        </div>

        {/* Desktop Split Layout */}
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1.3fr] items-start min-h-[520px]">
          
          {/* Left Column: Tab List */}
          <div className="flex flex-col gap-4">
            {MODULES.map((mod, index) => {
              const Icon = mod.icon;
              const isActive = index === activeIndex;

              return (
                <button
                  key={mod.id}
                  onClick={() => handleTabSelect(index)}
                  className={`group relative text-left p-6 rounded-2xl border transition-all duration-300 ${
                    isActive 
                      ? "bg-card border-primary/30 shadow-xl shadow-primary/5" 
                      : "bg-card/40 border-border/10 hover:border-border/30 hover:bg-card/20"
                  }`}
                  style={{
                    boxShadow: isActive ? `0 10px 30px -10px ${mod.glowColor}` : "none"
                  }}
                >
                  {/* Sliding highlight indicator using Framer Motion */}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute inset-0 rounded-2xl border-2 border-primary/40 pointer-events-none"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <div className="flex items-start gap-4">
                    {/* Icon container */}
                    <div 
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-500 ${
                        isActive 
                          ? `${mod.bgColor} ${mod.textColor} scale-110 rotate-3` 
                          : "bg-muted/40 text-muted-foreground group-hover:scale-105"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-xl font-bold transition-colors ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                          {mod.title}
                        </h3>
                        {isActive && (
                          <span className={`text-xs font-semibold uppercase tracking-wider ${mod.textColor}`}>
                            Active
                          </span>
                        )}
                      </div>
                      
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {mod.shortDesc}
                      </p>

                      {/* Expandable details list for the active module */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden mt-4 pt-4 border-t border-border/10"
                          >
                            <ul className="grid grid-cols-1 gap-2">
                              {mod.features.map((feat) => (
                                <li key={feat} className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                  <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${mod.textColor}`} />
                                  {feat}
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Autoplay loading indicator bar at the bottom of the card */}
                  {isActive && !isHovered && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-muted overflow-hidden rounded-b-2xl">
                      <div 
                        className={`h-full bg-gradient-to-r ${mod.color}`}
                        style={{ width: `${autoplayProgress}%`, transition: "width 50ms linear" }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Column: Visual Mockup Viewport */}
          <div className="relative w-full h-[520px] rounded-3xl border border-border/20 bg-[#071310]/80 shadow-2xl overflow-hidden backdrop-blur-md">
            
            {/* Top Bar of the Mock Window */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/10 bg-card/30">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <span className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <div className="rounded-md bg-background/50 px-6 py-1 text-[11px] font-semibold text-muted-foreground tracking-wide border border-border/5">
                studify.io/workspace/{activeModule.id}
              </div>
              <div className="w-12 h-2" />
            </div>

            {/* Viewport Content */}
            <div className="p-6 h-[calc(100%-60px)] relative overflow-hidden flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeModule.id}
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -15 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full h-full flex items-center justify-center"
                >
                  {activeIndex === 0 && <AICoachMockup />}
                  {activeIndex === 1 && <VideoQAMockup />}
                  {activeIndex === 2 && <LiveClassroomsMockup />}
                  {activeIndex === 3 && <ProgressLoopsMockup />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// 1. AI Coach Preview Component (Typing Effect)
// ==========================================
function AICoachMockup() {
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "user", text: "Explain backpropagation in simple terms?" }
  ]);
  const [typedText, setTypedText] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const responses: Record<string, string> = {
    backpropagation: "Think of backpropagation like adjusting your golf swing. 🏌️‍♂️\n\n1. **Forward Pass:** Take a swing and hit the ball (guess).\n2. **Loss:** Measure how far you missed the hole (error).\n3. **Backward Pass:** Trace the error back through your stance, shoulders, and wrists (gradients).\n4. **Update:** Adjust your technique slightly (weights) for the next try!",
    learning_rates: "Think of learning rate like your stride size when hiking down a mountain. 🏔️\n\n1. **Too Large:** You take giant leaps, overshoot the valley, and climb the opposite peak (diverging).\n2. **Too Small:** You take microscopic baby steps, taking ages to get down (slow convergence).\n3. **Optimal:** A steady, calculated pace that guides you safely to the absolute bottom.",
    generic: "Studify AI registers your current curriculum, tests your knowledge gaps, and dynamically routes you to timestamped video lectures! What subject would you like to explore next?"
  };

  const responseIndex = useRef(0);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const activeResponseText = useRef("");

  const startTyping = (text: string) => {
    if (typingTimer.current) clearInterval(typingTimer.current);
    setTypedText("");
    responseIndex.current = 0;
    activeResponseText.current = text;
    setIsTyping(true);

    typingTimer.current = setInterval(() => {
      if (responseIndex.current < activeResponseText.current.length) {
        setTypedText((prev) => prev + activeResponseText.current.charAt(responseIndex.current));
        responseIndex.current += 1;
      } else {
        setIsTyping(false);
        if (typingTimer.current) clearInterval(typingTimer.current);
      }
    }, 18);
  };

  // Initial typing trigger
  useEffect(() => {
    const delay = setTimeout(() => {
      startTyping(responses.backpropagation);
    }, 600);

    return () => {
      clearTimeout(delay);
      if (typingTimer.current) clearInterval(typingTimer.current);
    };
  }, []);

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputVal;
    if (!query.trim() || isTyping) return;

    // Add user message
    const newMessages = [...messages, { sender: "user" as const, text: query }];
    setMessages(newMessages);
    setInputVal("");

    // Determine response
    let responseText = responses.generic;
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes("backpropagation") || lowerQuery.includes("swing") || lowerQuery.includes("golf")) {
      responseText = responses.backpropagation;
    } else if (lowerQuery.includes("learning rate") || lowerQuery.includes("rate") || lowerQuery.includes("stride")) {
      responseText = responses.learning_rates;
    }

    // Trigger typing response
    setTimeout(() => {
      startTyping(responseText);
    }, 400);
  };

  return (
    <div className="w-full max-w-md bg-card/60 border border-border/10 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[380px]">
      {/* Mini Chat Header */}
      <div className="px-4 py-3 bg-[#11231E]/80 border-b border-border/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center border border-orange-500/20">
            <Brain className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">AI Study Coach</h4>
            <span className="text-[10px] text-orange-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-ping" />
              {isTyping ? "Typing..." : "Online"}
            </span>
          </div>
        </div>

        {/* Suggestion Prompt Chip */}
        <button
          onClick={() => handleSend("Tell me about learning rates!")}
          disabled={isTyping}
          className="text-[9px] px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 active:scale-95 transition cursor-pointer"
        >
          Ask about Learning Rates ⚡
        </button>
      </div>

      {/* Messages Window */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-xs flex flex-col justify-end">
        {/* Render last sent message and response */}
        <div className="flex justify-end">
          <div className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-tr-none px-4 py-2.5 shadow-md">
            {messages[messages.length - 1]?.text}
          </div>
        </div>

        <div className="flex justify-start">
          <div className="max-w-[90%] bg-background/90 border border-border/10 rounded-2xl rounded-tl-none px-4 py-3 shadow-md min-h-[60px] relative">
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {typedText.split(/(\*\*.*?\*\*)/).map((part, index) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return <strong key={index} className="text-orange-400 font-extrabold">{part.slice(2, -2)}</strong>;
                }
                return part;
              })}
              {isTyping && (
                <span className="inline-block w-1.5 h-4 bg-orange-400 ml-0.5 animate-pulse" />
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
        className="p-3 border-t border-border/10 bg-background/50 flex items-center gap-2"
      >
        <input 
          type="text" 
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Type here (e.g. 'learning rates')..."
          disabled={isTyping}
          className="flex-1 rounded-xl bg-card border border-border/10 px-3 py-2 text-[11px] text-foreground focus:outline-none focus:border-orange-500/40 disabled:opacity-50"
        />
        <button 
          type="submit" 
          disabled={isTyping}
          className="h-8 w-8 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/20 flex items-center justify-center hover:bg-orange-500/30 active:scale-95 transition cursor-pointer disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}

// ==========================================
// 2. Video Q&A Preview Component (Interactive Timeline)
// ==========================================
function VideoQAMockup() {
  const [playheadPos, setPlayheadPos] = useState(0);
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());

  const markers = [
    { time: 20, text: "What is Gradient Descent?", timeStr: "01:45" },
    { time: 55, text: "Why normalize inputs?", timeStr: "05:12" },
    { time: 80, text: "Explaining learning rates", timeStr: "08:30" }
  ];

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    lastTimeRef.current = Date.now();
    const duration = 9000; // Loop cycle duration in ms

    const animate = () => {
      const now = Date.now();
      const elapsed = (now - lastTimeRef.current) % duration;
      const progress = (elapsed / duration) * 100;
      setPlayheadPos(progress);

      // Trigger tooltip when playhead gets near a marker
      let nearMarker = -1;
      markers.forEach((m, idx) => {
        if (Math.abs(progress - m.time) < 4) {
          nearMarker = idx;
        }
      });
      setActiveTooltip(nearMarker !== -1 ? nearMarker : null);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  const handleMarkerClick = (index: number, time: number) => {
    setIsPlaying(false); // Pause auto playback so user can read
    setPlayheadPos(time);
    setActiveTooltip(index);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="w-full max-w-md bg-card/60 border border-border/10 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[350px] relative">
      {/* Video Viewport */}
      <div className="flex-1 bg-black/60 relative flex items-center justify-center overflow-hidden">
        {/* Mock tutor slide */}
        <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-br from-indigo-950/30 via-slate-900/80 to-blue-950/40">
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              LECTURE 4: LOSS FUNCTION & OPTIMIZATION
            </span>
            <span>HD 1080p</span>
          </div>

          {/* Center Play Button Overlay */}
          <div className="self-center flex flex-col items-center">
            <button 
              onClick={togglePlayback}
              className="h-14 w-14 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center shadow-lg shadow-blue-500/10 hover:bg-blue-500/30 active:scale-95 transition cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 fill-current" />
              ) : (
                <Play className="h-6 w-6 fill-current ml-0.5" />
              )}
            </button>
            <span className="mt-3 text-xs text-muted-foreground font-semibold">Click markers or Play to toggle</span>
          </div>

          <div className="w-full h-8" />
        </div>

        {/* Waveform indicator */}
        {isPlaying && (
          <div className="absolute bottom-6 left-0 right-0 h-10 flex items-end justify-center gap-0.5 opacity-20 pointer-events-none px-4">
            {[2, 4, 3, 5, 8, 4, 3, 6, 9, 7, 5, 4, 7, 3, 6, 8, 4, 2].map((val, i) => (
              <motion.div 
                key={i} 
                className="flex-1 bg-blue-500 rounded-t-sm"
                animate={{ height: [`${val * 10}%`, `${(val * 1.5) % 10 * 10}%`, `${val * 10}%`] }}
                transition={{ repeat: Infinity, duration: 1.5 + (i * 0.1), ease: "easeInOut" }}
              />
            ))}
          </div>
        )}

        {/* Tooltip Popup */}
        <AnimatePresence>
          {activeTooltip !== null && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-900 border border-blue-500/40 rounded-xl px-4 py-2.5 shadow-2xl flex items-start gap-2.5 max-w-[85%] pointer-events-none"
            >
              <Clock className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-blue-400 font-mono font-bold">{markers[activeTooltip].timeStr}</span>
                <p className="text-xs text-slate-200 font-medium leading-tight mt-0.5">{markers[activeTooltip].text}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Video controls */}
      <div className="p-4 bg-[#0A1613] border-t border-border/10 flex flex-col gap-3">
        {/* Timeline bar */}
        <div className="relative h-2 w-full bg-slate-800 rounded-full">
          {/* Progress fill */}
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
            style={{ width: `${playheadPos}%` }}
          />

          {/* Marker Nodes */}
          {markers.map((m, idx) => (
            <button
              key={idx}
              onClick={() => handleMarkerClick(idx, m.time)}
              className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 transition-all duration-300 cursor-pointer ${
                activeTooltip === idx 
                  ? "bg-blue-400 border-white scale-135 shadow-md shadow-blue-500/50" 
                  : "bg-slate-900 border-blue-500/60 hover:scale-120"
              }`}
              style={{ left: `${m.time}%` }}
            />
          ))}

          {/* Playhead */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow-md shadow-black pointer-events-none"
            style={{ left: `${playheadPos}%` }}
          />
        </div>

        {/* Video Timer and Quick Actions */}
        <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <button 
              onClick={togglePlayback}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer active:scale-90"
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
            <span>{`0${Math.floor(playheadPos / 10)}:${Math.floor(playheadPos % 10)}` || "03:14"} / 12:45</span>
          </div>
          
          <button 
            onClick={() => { setIsPlaying(false); setPlayheadPos(0); setActiveTooltip(null); }}
            className="text-blue-400 font-semibold cursor-pointer flex items-center gap-1 hover:underline hover:text-blue-300"
          >
            Restart Loop <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. Live Classrooms Preview Component (Drawing & Mic Toggle)
// ==========================================
function LiveClassroomsMockup() {
  const [boardStep, setBoardStep] = useState(0);
  const [strokeColor, setStrokeColor] = useState("#10B981");
  const [mutes, setMutes] = useState<Record<string, boolean>>({
    marcus: false,
    jared: true,
    linda: false
  });

  const toggleMute = (user: string) => {
    setMutes(prev => ({ ...prev, [user]: !prev[user] }));
  };

  const advanceBoard = () => {
    setBoardStep((prev) => (prev + 1) % 3);
  };

  return (
    <div className="w-full max-w-lg bg-[#081310] border border-border/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[350px]">
      {/* Live participants grid */}
      <div className="w-full md:w-[140px] border-b md:border-b-0 md:border-r border-border/10 bg-card/20 p-3 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible md:overflow-y-auto">
        <span className="hidden md:block text-[9px] font-bold tracking-wider text-emerald-400 uppercase mb-1">Class Feed</span>
        
        {/* Tutor Feed */}
        <button
          onClick={() => toggleMute("marcus")}
          className="relative shrink-0 w-20 h-16 md:w-full md:h-18 rounded-lg bg-emerald-950/20 border-2 border-emerald-500/60 overflow-hidden shadow-inner flex flex-col justify-between p-1.5 text-left cursor-pointer hover:bg-emerald-950/40"
        >
          <div className="flex justify-between items-center w-full">
            <span className="text-[8px] font-bold bg-emerald-500 text-black px-1 rounded-sm">TUTOR</span>
            {!mutes.marcus ? (
              <Volume2 className="h-3 w-3 text-emerald-400 animate-pulse" />
            ) : (
              <VolumeX className="h-3 w-3 text-red-500" />
            )}
          </div>
          
          {!mutes.marcus && (
            <div className="h-4 flex items-end justify-center gap-0.5 opacity-60">
              <div className="w-1 bg-emerald-400 animate-bounce" style={{ height: "40%", animationDelay: "0.1s" }} />
              <div className="w-1 bg-emerald-400 animate-bounce" style={{ height: "80%", animationDelay: "0.3s" }} />
              <div className="w-1 bg-emerald-400 animate-bounce" style={{ height: "50%", animationDelay: "0.2s" }} />
            </div>
          )}
          
          <span className="text-[7px] text-slate-200 truncate">Prof. Marcus</span>
        </button>

        {/* Co-learner 1 */}
        <button
          onClick={() => toggleMute("jared")}
          className={`relative shrink-0 w-20 h-16 md:w-full md:h-18 rounded-lg bg-slate-900 border flex flex-col justify-between p-1.5 text-left cursor-pointer hover:bg-slate-800 ${
            !mutes.jared ? "border-emerald-500/30" : "border-border/10"
          }`}
        >
          <div className="flex justify-between items-center w-full text-[8px] text-muted-foreground">
            <span>STUDENT</span>
            {!mutes.jared ? <Mic className="h-2.5 w-2.5 text-emerald-400" /> : <MicOff className="h-2.5 w-2.5 text-red-500" />}
          </div>
          <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground font-black">
            JD
          </div>
          <span className="text-[7px] text-muted-foreground truncate">Jared (Active)</span>
        </button>

        {/* Co-learner 2 */}
        <button
          onClick={() => toggleMute("linda")}
          className={`relative shrink-0 w-20 h-16 md:w-full md:h-18 rounded-lg bg-slate-900 border flex flex-col justify-between p-1.5 text-left cursor-pointer hover:bg-slate-800 ${
            !mutes.linda ? "border-emerald-500/30" : "border-border/10"
          }`}
        >
          <div className="flex justify-between items-center w-full text-[8px] text-muted-foreground">
            <span>STUDENT</span>
            {!mutes.linda ? <Mic className="h-2.5 w-2.5 text-emerald-400" /> : <MicOff className="h-2.5 w-2.5 text-red-500" />}
          </div>
          <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground font-black">
            LL
          </div>
          <span className="text-[7px] text-muted-foreground truncate">Linda L.</span>
        </button>
      </div>

      {/* Interactive Whiteboard Area */}
      <div className="flex-1 p-4 bg-slate-950 flex flex-col justify-between relative">
        <div className="flex justify-between items-center text-[9px] text-muted-foreground font-mono">
          <span>CO-DRAW BOARD</span>
          
          {/* Color Switcher Buttons */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setStrokeColor("#10B981")} 
              className={`h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white/20 cursor-pointer ${strokeColor === "#10B981" && "ring-1 ring-white"}`}
            />
            <button 
              onClick={() => setStrokeColor("#FF6B00")} 
              className={`h-2.5 w-2.5 rounded-full bg-orange-500 border border-white/20 cursor-pointer ${strokeColor === "#FF6B00" && "ring-1 ring-white"}`}
            />
            <button 
              onClick={() => setStrokeColor("#3B82F6")} 
              className={`h-2.5 w-2.5 rounded-full bg-blue-500 border border-white/20 cursor-pointer ${strokeColor === "#3B82F6" && "ring-1 ring-white"}`}
            />
          </div>
        </div>

        {/* Canvas whiteboard simulator */}
        <button 
          onClick={advanceBoard}
          className="flex-1 w-full text-left relative border border-border/5 rounded-xl bg-[#09100E] mt-2 mb-2 flex items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-500/20 transition"
        >
          {/* Drawing grid grid lines overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
          
          {/* SVG animation to represent tutor drawing a formula */}
          <svg className="w-[85%] h-[80%] relative z-10" viewBox="0 0 200 120">
            {/* Draw axis */}
            <line x1="20" y1="100" x2="180" y2="100" stroke="#1F2937" strokeWidth="1.5" />
            <line x1="20" y1="20" x2="20" y2="100" stroke="#1F2937" strokeWidth="1.5" />
            
            {/* Draw Sigmoid curve formula text */}
            {boardStep === 0 && (
              <text x="30" y="35" fill="#E2E8F0" fontSize="10" fontFamily="monospace">
                f(x) = 1 / (1 + e^-x)
              </text>
            )}

            {/* Draw sigmoid graph path using Framer Motion animation */}
            <AnimatePresence>
              {boardStep >= 1 && (
                <motion.path
                  d="M 20,95 Q 85,95 100,60 T 180,25"
                  fill="transparent"
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                />
              )}
            </AnimatePresence>

            {/* Draw cursor marker indicating peer pen pointer */}
            {boardStep === 1 && (
              <motion.g
                initial={{ x: 20, y: 95 }}
                animate={{ x: [20, 85, 100, 180], y: [95, 95, 60, 25] }}
                transition={{ duration: 1.8, ease: "easeInOut" }}
              >
                <circle r="3" fill={strokeColor} />
                <path d="M 0,0 L 10,10 L 4,12 Z" fill="#ffffff" transform="translate(2, 2)" />
              </motion.g>
            )}

            {/* Classroom label */}
            {boardStep === 2 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <circle cx="100" cy="60" r="4" fill="#FF6B00" />
                <text x="110" y="63" fill="#FF6B00" fontSize="8" fontFamily="monospace">
                  Inflection Point
                </text>
              </motion.g>
            )}
          </svg>

          {/* Help hint */}
          <span className="absolute bottom-2 right-3 text-[8px] font-mono text-muted-foreground/60">
            Click blackboard to draw
          </span>
        </button>

        {/* Live chat comments floating overlay */}
        <div className="h-6 flex items-center justify-between text-[9px] text-muted-foreground font-mono">
          <div className="flex gap-2">
            <span className="text-emerald-400 font-bold">Alex:</span>
            <span className="text-slate-300 truncate max-w-[150px]">Oh I see! The slope peaks at 0.</span>
          </div>
          <span className="text-slate-500">Just now</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. Progress Loops Preview Component (Flip Card & Sparkle click)
// ==========================================
function ProgressLoopsMockup() {
  const [streakCount, setStreakCount] = useState(14);
  const [activeTab, setActiveTab] = useState<"chart" | "badge">("chart");
  const [badgeFlipped, setBadgeFlipped] = useState(false);

  const incrementStreak = () => {
    setStreakCount((prev) => prev + 1);
  };

  const handleToggleTab = (tab: "chart" | "badge") => {
    setActiveTab(tab);
  };

  return (
    <div className="w-full max-w-md bg-card/50 border border-border/10 rounded-2xl overflow-hidden shadow-xl p-5 flex flex-col justify-between h-[360px]">
      
      {/* Top dashboard banner */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="text-xs font-bold text-slate-200">Your Analytics Today</h4>
          <p className="text-[10px] text-muted-foreground">Calculated from last 7 days</p>
        </div>

        {/* Streak Flame Badge - CLICKABLE */}
        <motion.button 
          onClick={incrementStreak}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold cursor-pointer hover:bg-orange-500/20 transition"
        >
          <Flame className="h-4.5 w-4.5 fill-current animate-pulse" />
          <span>{streakCount} DAY STREAK 🔥</span>
        </motion.button>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex items-center justify-center relative bg-black/30 border border-border/5 rounded-xl p-4 overflow-hidden min-h-[190px]">
        <AnimatePresence mode="wait">
          {activeTab === "chart" ? (
            <motion.div 
              key="chart"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex flex-col justify-between"
            >
              {/* Stat figures */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-card/40 p-2 rounded-lg border border-border/5">
                  <span className="text-[9px] text-muted-foreground uppercase block font-semibold">Total Study</span>
                  <strong className="text-sm font-bold text-white">18.4 hrs</strong>
                </div>
                <div className="bg-card/40 p-2 rounded-lg border border-border/5">
                  <span className="text-[9px] text-muted-foreground uppercase block font-semibold">XP Earned</span>
                  <strong className="text-sm font-bold text-violet-400">+1,240</strong>
                </div>
                <div className="bg-card/40 p-2 rounded-lg border border-border/5">
                  <span className="text-[9px] text-muted-foreground uppercase block font-semibold">Focus score</span>
                  <strong className="text-sm font-bold text-emerald-400">92%</strong>
                </div>
              </div>

              {/* Weekly curve */}
              <div className="relative h-20 w-full mt-3 flex items-end">
                <svg className="w-full h-full" viewBox="0 0 200 80">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  <line x1="0" y1="20" x2="200" y2="20" stroke="#1F2937" strokeDasharray="3 3" />
                  <line x1="0" y1="50" x2="200" y2="50" stroke="#1F2937" strokeDasharray="3 3" />

                  {/* Shaded Area */}
                  <motion.path 
                    d="M 10,80 L 10,65 Q 40,30 70,50 T 130,20 T 190,40 L 190,80 Z"
                    fill="url(#chartGrad)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                  />

                  {/* Chart Line */}
                  <motion.path
                    d="M 10,65 Q 40,30 70,50 T 130,20 T 190,40"
                    fill="transparent"
                    stroke="#8B5CF6"
                    strokeWidth="2.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />

                  {/* Peak Marker */}
                  <motion.circle
                    cx="130"
                    cy="20"
                    r="4"
                    fill="#FF6B00"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.4, 1] }}
                    transition={{ delay: 1, duration: 0.4 }}
                  />
                </svg>
              </div>
            </motion.div>
          ) : (
            // Clickable flipping 3D badge card
            <motion.button 
              key="badge"
              onClick={() => setBadgeFlipped(!badgeFlipped)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center text-center p-2 cursor-pointer w-full h-full"
            >
              {/* 3D flipping container */}
              <motion.div
                animate={{ rotateY: badgeFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="h-20 w-20 relative select-none"
                style={{ transformStyle: "preserve-3d", perspective: 600 }}
              >
                {/* Front Side */}
                <div 
                  className="absolute inset-0 bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-900 rounded-2xl flex items-center justify-center shadow-xl border border-yellow-300"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <Trophy className="h-10 w-10" />
                </div>
                
                {/* Back Side */}
                <div 
                  className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-2xl flex flex-col items-center justify-center shadow-xl border border-violet-400"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
                  <span className="text-[8px] font-bold mt-1">1,000 XP</span>
                </div>
              </motion.div>

              <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-amber-400 flex items-center gap-1 mt-3">
                <Sparkles className="h-3.5 w-3.5 fill-current" />
                {badgeFlipped ? "Trophy Rewards" : "Badge Unlocked"}
              </span>
              <h5 className="text-xs font-bold text-white mt-1">
                {badgeFlipped ? "Calculus Mastery Badge" : "Optimization Maestro"}
              </h5>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {badgeFlipped ? "Earned for full path completion" : "Click badge to flip and view XP"}
              </p>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom text description */}
      <div className="mt-3 text-[10px] text-muted-foreground font-mono text-center flex items-center justify-center gap-1">
        <span>Toggle visual:</span>
        <button 
          onClick={() => handleToggleTab("chart")} 
          className={`px-2 py-0.5 rounded cursor-pointer ${activeTab === "chart" ? "bg-violet-500/20 text-violet-400" : "hover:text-white"}`}
        >
          Activity Graph
        </button>
        <span>•</span>
        <button 
          onClick={() => handleToggleTab("badge")} 
          className={`px-2 py-0.5 rounded cursor-pointer ${activeTab === "badge" ? "bg-violet-500/20 text-violet-400" : "hover:text-white"}`}
        >
          Badges UI
        </button>
      </div>

    </div>
  );
}
