import React, { useState, useRef } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full mt-1.5 left-1/2 -translate-x-1/2';
      case 'left':
        return 'right-full mr-1.5 top-1/2 -translate-y-1/2';
      case 'right':
        return 'left-full ml-1.5 top-1/2 -translate-y-1/2';
      case 'top':
      default:
        return 'bottom-full mb-1.5 left-1/2 -translate-x-1/2';
    }
  };

  if (!content) return children;

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95 ${getPositionClasses()}`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
};
