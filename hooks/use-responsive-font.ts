import { useFontSize } from '@/context/font-size-context';

/**
 * Hook to get responsive font size classes based on user preference
 * 
 * @example
 * const { textSizes, headingSizes } = useResponsiveFont();
 * return <p className={textSizes.body}>This text will scale with user preference</p>
 */
export function useResponsiveFont() {
  const { fontSize, fontSizeClasses } = useFontSize();

  const textSizes = {
    xs: fontSizeClasses.small,
    sm: fontSizeClasses.small,
    base: fontSizeClasses.text,
    body: fontSizeClasses.body,
    lg: fontSizeClasses.text,
    xl: fontSizeClasses.heading,
  };

  const headingSizes = {
    h6: fontSizeClasses.text,
    h5: fontSizeClasses.text,
    h4: fontSizeClasses.heading,
    h3: fontSizeClasses.heading,
    h2: fontSizeClasses.heading,
    h1: fontSizeClasses.heading,
  };

  const buttonSizes = {
    sm: fontSizeClasses.small,
    md: fontSizeClasses.button,
    lg: fontSizeClasses.button,
  };

  /**
   * Get Tailwind class for responsive font size
   * @param element - The type of text element
   * @returns Tailwind CSS class string
   */
  const getResponsiveClass = (element: 'text' | 'heading' | 'body' | 'small' | 'button') => {
    return fontSizeClasses[element];
  };

  /**
   * Get inline style for responsive font size (for when CSS classes aren't enough)
   * @param element - The type of text element
   * @returns CSS style object
   */
  const getResponsiveStyle = (element: 'text' | 'heading' | 'body' | 'small' | 'button') => {
    const sizeMap = {
      small: {
        text: '0.875rem',
        heading: '1.25rem', 
        body: '0.875rem',
        small: '0.75rem',
        button: '0.875rem',
      },
      medium: {
        text: '1rem',
        heading: '1.5rem',
        body: '1rem', 
        small: '0.875rem',
        button: '1rem',
      },
      large: {
        text: '1.125rem',
        heading: '1.875rem',
        body: '1.125rem',
        small: '1rem',
        button: '1.125rem',
      },
      'extra-large': {
        text: '1.25rem',
        heading: '2.25rem',
        body: '1.25rem',
        small: '1.125rem',
        button: '1.25rem',
      },
    };

    return {
      fontSize: sizeMap[fontSize][element],
    };
  };

  return {
    fontSize,
    fontSizeClasses,
    textSizes,
    headingSizes, 
    buttonSizes,
    getResponsiveClass,
    getResponsiveStyle,
  };
}
