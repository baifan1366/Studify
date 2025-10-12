// Classroom color generation utilities
// This file provides TypeScript utilities for generating classroom colors and card backgrounds

export const CLASSROOM_COLORS = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Sky Blue
  '#96CEB4', // Mint Green
  '#FFEAA7', // Warm Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Seafoam
  '#F7DC6F', // Golden Yellow
  '#BB8FCE', // Lavender
  '#85C1E9', // Light Blue
  '#F8C471', // Peach
  '#82E0AA', // Light Green
  '#F1948A', // Salmon
  '#D7BDE2', // Light Purple
  '#A9DFBF', // Pale Green
  '#F9E79F', // Light Yellow
  '#AED6F1', // Baby Blue
  '#F5B7B1', // Pink
  '#A3E4D7', // Aqua
  '#FAD7A0'  // Light Orange
] as const;

// Card background variants with different opacity levels
export const CARD_BG_VARIANTS = {
  light: '0.1',    // 10% opacity for light backgrounds
  medium: '0.15',  // 15% opacity for medium backgrounds
  strong: '0.2',   // 20% opacity for strong backgrounds
  solid: '1'       // 100% opacity for solid backgrounds
} as const;

export type ClassroomColor = typeof CLASSROOM_COLORS[number];

/**
 * Get next available color with duplicate avoidance
 * @param usedColors Array of currently used colors
 * @returns Next available color from palette
 */
export function getNextClassroomColor(usedColors: string[] = []): ClassroomColor {
  // Find colors not currently used
  const availableColors = CLASSROOM_COLORS.filter(color => !usedColors.includes(color));
  
  // If available colors exist, return the first one (sequential assignment)
  if (availableColors.length > 0) {
    return availableColors[0];
  }
  
  // All colors used, find least used color
  const colorUsageMap = new Map<ClassroomColor, number>();
  
  // Initialize all colors with 0 count
  CLASSROOM_COLORS.forEach(color => colorUsageMap.set(color, 0));
  
  // Count usage of each color
  usedColors.forEach(color => {
    const classroomColor = color as ClassroomColor;
    if (colorUsageMap.has(classroomColor)) {
      colorUsageMap.set(classroomColor, colorUsageMap.get(classroomColor)! + 1);
    }
  });
  
  // Find color with minimum usage
  let minUsage = Infinity;
  let selectedColor: ClassroomColor = CLASSROOM_COLORS[0];
  
  for (const [color, usage] of colorUsageMap.entries()) {
    if (usage < minUsage) {
      minUsage = usage;
      selectedColor = color;
    }
  }
  
  return selectedColor;
}

/**
 * Generate random color from available palette
 * @param usedColors Array of currently used colors
 * @returns Random available color
 */
export function generateRandomClassroomColor(usedColors: string[] = []): ClassroomColor {
  const availableColors = CLASSROOM_COLORS.filter(color => !usedColors.includes(color));
  
  if (availableColors.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableColors.length);
    return availableColors[randomIndex];
  }
  
  // Fallback to random from full palette
  const randomIndex = Math.floor(Math.random() * CLASSROOM_COLORS.length);
  return CLASSROOM_COLORS[randomIndex];
}

/**
 * Validate if a color is a valid hex color
 * @param color Color string to validate
 * @returns True if valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Get color statistics for usage analysis
 * @param usedColors Array of currently used colors
 * @returns Color usage statistics
 */
export function getColorStats(usedColors: string[]) {
  const stats = CLASSROOM_COLORS.map(color => {
    const usage = usedColors.filter(used => used === color).length;
    const percentage = usedColors.length > 0 ? (usage / usedColors.length) * 100 : 0;
    
    return {
      color,
      usage,
      percentage: Math.round(percentage * 100) / 100
    };
  });
  
  return stats.sort((a, b) => b.usage - a.usage);
}

/**
 * Convert hex color to rgba with opacity for card backgrounds
 * @param hexColor Hex color code (e.g., '#FF6B6B')
 * @param opacity Opacity value (0-1) or variant key
 * @returns RGBA color string
 */
export function hexToRgba(hexColor: string, opacity: number | keyof typeof CARD_BG_VARIANTS = 'light'): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Get opacity value
  const opacityValue = typeof opacity === 'string' ? parseFloat(CARD_BG_VARIANTS[opacity]) : opacity;
  
  return `rgba(${r}, ${g}, ${b}, ${opacityValue})`;
}

/**
 * Get card background color with specified opacity
 * @param color Classroom color
 * @param variant Background variant (light, medium, strong, solid)
 * @returns RGBA color string for card background
 */
export function getCardBackgroundColor(
  color: ClassroomColor, 
  variant: keyof typeof CARD_BG_VARIANTS = 'light'
): string {
  return hexToRgba(color, variant);
}

/**
 * Get gradient background for cards
 * @param color Primary classroom color
 * @param variant Opacity variant
 * @returns CSS gradient string
 */
export function getCardGradientBackground(
  color: ClassroomColor,
  variant: keyof typeof CARD_BG_VARIANTS = 'light'
): string {
  const primaryColor = hexToRgba(color, variant);
  const secondaryColor = hexToRgba(color, typeof variant === 'string' ? 
    (parseFloat(CARD_BG_VARIANTS[variant]) * 0.5).toString() as any : variant * 0.5);
  
  return `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
}

/**
 * Get complementary color for text contrast
 * @param backgroundColor Background color hex code
 * @returns Black or white for optimal contrast
 */
export function getContrastColor(backgroundColor: string): '#000000' | '#FFFFFF' {
  // Remove # if present
  const hex = backgroundColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Get complete card styling object
 * @param color Classroom color
 * @param variant Background variant
 * @returns Object with background and text colors
 */
export function getCardStyling(
  color: ClassroomColor,
  variant: keyof typeof CARD_BG_VARIANTS = 'light'
) {
  const backgroundColor = getCardBackgroundColor(color, variant);
  const gradientBackground = getCardGradientBackground(color, variant);
  const textColor = getContrastColor(color);
  
  return {
    backgroundColor,
    gradientBackground,
    textColor,
    borderColor: hexToRgba(color, 'medium'),
    hoverBackground: getCardBackgroundColor(color, 'medium'),
    activeBackground: getCardBackgroundColor(color, 'strong')
  };
}

/**
 * Get classroom color from classroom object with fallback
 * @param classroom Classroom object
 * @returns Valid classroom color
 */
export function getClassroomColor(classroom: any): ClassroomColor {
  console.log('🎨 [getClassroomColor] Input:', {
    hasClassroom: !!classroom,
    color: classroom?.color,
    isValidColor: classroom?.color && CLASSROOM_COLORS.includes(classroom.color as ClassroomColor),
    willUseFallback: !classroom?.color || !CLASSROOM_COLORS.includes(classroom.color as ClassroomColor)
  });
  
  // Check if classroom has a color property and it's valid
  if (classroom?.color && CLASSROOM_COLORS.includes(classroom.color as ClassroomColor)) {
    console.log('✅ [getClassroomColor] Using classroom color:', classroom.color);
    return classroom.color as ClassroomColor;
  }
  
  // Fallback to first color in palette
  console.log('⚠️ [getClassroomColor] Using fallback color:', CLASSROOM_COLORS[0]);
  return CLASSROOM_COLORS[0];
}
