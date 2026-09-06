import React from 'react';

interface AppLogoProps {
  className?: string;
  imgClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = '',
  imgClassName = '',
  size = 'md',
}) => {
  const sizeMap = {
    xs: 'w-6 h-6 rounded-lg p-0.5',
    sm: 'w-8 h-8 rounded-xl p-1',
    md: 'w-10 h-10 rounded-2xl p-1.5 shadow-md shadow-orange-500/10',
    lg: 'w-14 h-14 sm:w-16 sm:h-16 rounded-3xl p-2 shadow-xl shadow-orange-500/15',
    xl: 'w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] p-3 shadow-2xl shadow-orange-500/20',
  };

  return (
    <div
      className={`relative flex items-center justify-center bg-white border border-white/30 overflow-hidden shrink-0 transition-transform ${sizeMap[size]} ${className}`}
    >
      <img
        src="/logo.png"
        alt="ADMITTO Logo"
        className={`w-full h-full object-contain pointer-events-none select-none ${imgClassName}`}
        loading="eager"
      />
    </div>
  );
};
