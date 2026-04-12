/**
 * Web Vitals Performance Monitoring
 * 
 * This utility helps track Core Web Vitals metrics:
 * - LCP (Largest Contentful Paint)
 * - INP (Interaction to Next Paint)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 */

type MetricType = 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';

interface Metric {
  name: MetricType;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

// Thresholds based on Web Vitals recommendations
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

function getRating(name: MetricType, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

function sendToAnalytics(metric: Metric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
    });
  }

  // Send to your analytics service
  // Example: Google Analytics 4
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: metric.rating,
    });
  }

  // Example: Custom API endpoint
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
      keepalive: true,
    }).catch(console.error);
  }
}

export function reportWebVitals(metric: any) {
  const formattedMetric: Metric = {
    name: metric.name as MetricType,
    value: metric.value,
    rating: getRating(metric.name as MetricType, metric.value),
    delta: metric.delta,
    id: metric.id,
  };

  sendToAnalytics(formattedMetric);
}

/**
 * Initialize Web Vitals monitoring
 * Call this in your root layout or _app.tsx
 */
export async function initWebVitals() {
  if (typeof window === 'undefined') return;

  try {
    const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import('web-vitals');
    
    onCLS(reportWebVitals);
    onINP(reportWebVitals);
    onLCP(reportWebVitals);
    onFCP(reportWebVitals);
    onTTFB(reportWebVitals);
  } catch (error) {
    console.error('Failed to load web-vitals:', error);
  }
}

/**
 * Performance observer for long tasks (tasks > 50ms)
 * Helps identify what's causing poor INP
 */
export function observeLongTasks() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn('[Long Task]', {
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch (error) {
    console.error('Failed to observe long tasks:', error);
  }
}

/**
 * Measure custom performance marks
 */
export function measurePerformance(name: string, startMark: string, endMark: string) {
  if (typeof window === 'undefined' || !('performance' in window)) return;

  try {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name)[0];
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
    }
    
    return measure.duration;
  } catch (error) {
    console.error('Failed to measure performance:', error);
  }
}
