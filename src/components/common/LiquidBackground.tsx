import React from 'react';

interface LiquidBackgroundProps {
  intensity?: 'subtle' | 'vibrant';
  className?: string;
}

export const LiquidBackground: React.FC<LiquidBackgroundProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#10232D] ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[#10232D]" />
    </div>
  );
};
