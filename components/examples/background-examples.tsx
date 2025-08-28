"use client";

import React from 'react';
import AnimatedBackground, { 
  BackgroundPresets, 
  ClassroomBackground, 
  HomeBackground, 
  SuccessBackground, 
  CreativeBackground 
} from '@/components/ui/animated-background';

// Example 1: Default orange background
export function DefaultBackgroundExample() {
  return (
    <AnimatedBackground>
      <div className="flex items-center justify-center h-full">
        <h1 className="text-4xl font-bold text-white">Default Orange Background</h1>
      </div>
    </AnimatedBackground>
  );
}

// Example 2: Blue classroom background
export function ClassroomBackgroundExample() {
  return (
    <ClassroomBackground>
      <div className="flex items-center justify-center h-full">
        <h1 className="text-4xl font-bold text-white">Classroom Blue Background</h1>
      </div>
    </ClassroomBackground>
  );
}

// Example 3: Custom background with preset
export function CustomPresetExample() {
  return (
    <AnimatedBackground 
      {...BackgroundPresets.purple}
      sphereSize={500}
      glassOpacity={0.08}
    >
      <div className="flex items-center justify-center h-full">
        <h1 className="text-4xl font-bold text-white">Custom Purple Background</h1>
      </div>
    </AnimatedBackground>
  );
}

// Example 4: Static background (no mouse tracking)
export function StaticBackgroundExample() {
  return (
    <AnimatedBackground 
      {...BackgroundPresets.green}
      enableMouseTracking={false}
    >
      <div className="flex items-center justify-center h-full">
        <h1 className="text-4xl font-bold text-white">Static Green Background</h1>
      </div>
    </AnimatedBackground>
  );
}

// Example 5: Subtle background
export function SubtleBackgroundExample() {
  return (
    <AnimatedBackground 
      {...BackgroundPresets.subtle}
    >
      <div className="flex items-center justify-center h-full">
        <h1 className="text-4xl font-bold text-white">Subtle Background</h1>
      </div>
    </AnimatedBackground>
  );
}

// Example 6: High contrast vibrant background
export function VibrantBackgroundExample() {
  return (
    <AnimatedBackground 
      {...BackgroundPresets.vibrant}
    >
      <div className="flex items-center justify-center h-full">
        <h1 className="text-4xl font-bold text-white">Vibrant Background</h1>
      </div>
    </AnimatedBackground>
  );
}

// Example 7: Custom gradient
export function CustomGradientExample() {
  return (
    <AnimatedBackground 
      sphereColor="radial-gradient(circle, rgba(168,85,247,0.8) 0%, rgba(139,69,19,0.6) 50%, rgba(75,0,130,0.4) 100%)"
      glassOpacity={0.06}
      sphereSize={450}
    >
      <div className="flex items-center justify-center h-full">
        <h1 className="text-4xl font-bold text-white">Custom Gradient Background</h1>
      </div>
    </AnimatedBackground>
  );
}

// Usage guide component
export function BackgroundUsageGuide() {
  return (
    <div className="p-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        AnimatedBackground Usage Guide
      </h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
            1. Basic Usage
          </h3>
          <pre className="bg-gray-200 dark:bg-gray-700 p-4 rounded text-sm overflow-x-auto">
{`<AnimatedBackground>
  <YourContent />
</AnimatedBackground>`}
          </pre>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
            2. Using Presets
          </h3>
          <pre className="bg-gray-200 dark:bg-gray-700 p-4 rounded text-sm overflow-x-auto">
{`<AnimatedBackground {...BackgroundPresets.blue}>
  <YourContent />
</AnimatedBackground>`}
          </pre>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
            3. Convenience Components
          </h3>
          <pre className="bg-gray-200 dark:bg-gray-700 p-4 rounded text-sm overflow-x-auto">
{`<ClassroomBackground>
  <YourContent />
</ClassroomBackground>`}
          </pre>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
            4. Custom Configuration
          </h3>
          <pre className="bg-gray-200 dark:bg-gray-700 p-4 rounded text-sm overflow-x-auto">
{`<AnimatedBackground 
  sphereColor="your-gradient"
  glassOpacity={0.08}
  sphereSize={500}
  enableMouseTracking={false}
>
  <YourContent />
</AnimatedBackground>`}
          </pre>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
            Available Presets
          </h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
            <li><code>BackgroundPresets.orange</code> - Default orange gradient</li>
            <li><code>BackgroundPresets.blue</code> - Blue classroom theme</li>
            <li><code>BackgroundPresets.purple</code> - Creative purple theme</li>
            <li><code>BackgroundPresets.green</code> - Success green theme</li>
            <li><code>BackgroundPresets.red</code> - Urgent red theme</li>
            <li><code>BackgroundPresets.subtle</code> - Low opacity variant</li>
            <li><code>BackgroundPresets.vibrant</code> - High contrast variant</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
