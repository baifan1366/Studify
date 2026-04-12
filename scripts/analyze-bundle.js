#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * 
 * This script helps identify large dependencies and potential optimization opportunities
 * Run: node scripts/analyze-bundle.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing Next.js bundle...\n');

// Check if .next directory exists
const nextDir = path.join(process.cwd(), '.next');
if (!fs.existsSync(nextDir)) {
  console.error('❌ .next directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// Read build manifest
const buildManifestPath = path.join(nextDir, 'build-manifest.json');
if (!fs.existsSync(buildManifestPath)) {
  console.error('❌ build-manifest.json not found.');
  process.exit(1);
}

const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));

console.log('📦 Pages and their dependencies:\n');

// Analyze each page
Object.entries(buildManifest.pages).forEach(([page, files]) => {
  console.log(`\n📄 ${page}`);
  console.log(`   Files: ${files.length}`);
  
  // Calculate total size
  let totalSize = 0;
  files.forEach(file => {
    const filePath = path.join(nextDir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    }
  });
  
  console.log(`   Total size: ${(totalSize / 1024).toFixed(2)} KB`);
});

// Check for common performance issues
console.log('\n\n🔍 Performance Recommendations:\n');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

// Check for heavy dependencies
const heavyDeps = [
  { name: 'moment', alternative: 'date-fns (already installed)', reason: 'Moment.js is very large' },
  { name: 'lodash', alternative: 'lodash-es or individual imports', reason: 'Full lodash is large' },
  { name: '@mui/material', alternative: 'Radix UI (already installed)', reason: 'MUI is heavy' },
];

heavyDeps.forEach(({ name, alternative, reason }) => {
  if (deps[name]) {
    console.log(`⚠️  Found ${name}`);
    console.log(`   ${reason}`);
    console.log(`   Consider: ${alternative}\n`);
  }
});

// Check for duplicate dependencies
console.log('\n📊 Checking for potential optimizations:\n');

const recommendations = [
  {
    check: () => deps['framer-motion'] && deps['motion'],
    message: '⚠️  Both framer-motion and motion are installed. Consider using only one.',
  },
  {
    check: () => !deps['sharp'],
    message: '💡 Install "sharp" for faster image optimization in production.',
  },
  {
    check: () => deps['@tanstack/react-query-devtools'],
    message: '💡 React Query DevTools should be lazy loaded (already optimized in your code).',
  },
];

recommendations.forEach(({ check, message }) => {
  if (check()) {
    console.log(message);
  }
});

console.log('\n✅ Analysis complete!\n');
console.log('💡 Tips:');
console.log('   1. Run "npm run build" to see detailed bundle analysis');
console.log('   2. Use dynamic imports for large components');
console.log('   3. Enable experimental.optimizePackageImports in next.config.ts');
console.log('   4. Consider using Edge Runtime for API routes\n');
