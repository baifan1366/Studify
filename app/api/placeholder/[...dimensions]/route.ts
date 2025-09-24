// app/api/placeholder/[...dimensions]/route.ts

import { NextRequest, NextResponse } from 'next/server';

/**
 * Dynamic placeholder image API
 * Supports URLs like /api/placeholder/32/32 or /api/placeholder/300/200
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ dimensions: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const dimensions = resolvedParams.dimensions;
    
    // Parse dimensions - default to 32x32 if not provided
    let width = 32;
    let height = 32;
    
    if (dimensions && dimensions.length >= 1) {
      width = parseInt(dimensions[0]) || 32;
    }
    if (dimensions && dimensions.length >= 2) {
      height = parseInt(dimensions[1]) || width; // Use width if height not provided
    }
    
    // Limit dimensions to reasonable values
    width = Math.min(Math.max(width, 16), 2000);
    height = Math.min(Math.max(height, 16), 2000);
    
    // Generate a simple SVG placeholder
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#e2e8f0"/>
        <circle cx="${width/2}" cy="${height/2}" r="${Math.min(width, height)/4}" fill="#94a3b8"/>
        <text x="50%" y="60%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.max(8, Math.min(width, height)/8)}" fill="#64748b">${width}×${height}</text>
      </svg>
    `.trim();
    
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
    
  } catch (error) {
    console.error('Placeholder API error:', error);
    
    // Return a simple fallback SVG
    const fallbackSvg = `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#e2e8f0"/>
        <circle cx="16" cy="16" r="8" fill="#94a3b8"/>
      </svg>
    `;
    
    return new NextResponse(fallbackSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }
}
