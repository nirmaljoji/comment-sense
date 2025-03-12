import React from 'react';
import { cn } from '@/lib/utils';

interface ThreeDTextProps {
  text: string;
  className?: string;
  color?: string;
  shadowColor?: string;
  layers?: number;
}

export function ThreeDText({
  text,
  className,
  color = 'from-red-700 to-red-500',
  shadowColor = 'rgba(204, 0, 0, 0.4)',
  layers = 8,
}: ThreeDTextProps) {
  // Generate shadow layers
  const shadowLayers = Array.from({ length: layers }).map((_, i) => {
    const offset = (i + 1) * 1;
    return `${offset}px ${offset}px 0 ${shadowColor}`;
  }).join(', ');

  return (
    <div className={cn('relative font-extrabold', className)}>
      {/* 3D Text with shadow effect */}
      <div className="relative">
        {/* Text outline for extra depth */}
        <span 
          className={cn(
            'absolute -left-[2px] -top-[2px] z-0 text-red-200/20 dark:text-red-900/20',
            className
          )}
        >
          {text}
        </span>
        
        {/* Main text with gradient and shadow */}
        <span 
          className={cn(
            'relative z-10 bg-gradient-to-r bg-clip-text text-transparent',
            color
          )}
          style={{ 
            textShadow: shadowLayers,
            WebkitTextStroke: '1px rgba(204, 0, 0, 0.2)'
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
} 