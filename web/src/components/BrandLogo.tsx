import React from 'react';

interface BrandLogoProps {
  variant?: 'icon-only' | 'horizontal' | 'stacked';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  onClick,
}) => {
  // 尺寸映射
  const iconSizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const titleSizeMap = {
    sm: 'text-sm tracking-tight',
    md: 'text-base tracking-tight',
    lg: 'text-xl tracking-tight',
    xl: 'text-2xl tracking-tight',
  };

  const subSizeMap = {
    sm: 'text-[8px] tracking-[0.14em]',
    md: 'text-[9px] tracking-[0.16em]',
    lg: 'text-[10px] tracking-[0.18em]',
    xl: 'text-xs tracking-[0.2em]',
  };

  // 款式二：极简现代建筑流线款 S·W 纯矢量徽标 (Modern Architectural Minimal Hanger Monogram)
  const LogoIcon = (
    <div
      className={`${iconSizeMap[size]} rounded-2xl bg-gradient-to-tr from-[#1E1E1E] via-[#2A2A2A] to-[#383838] p-[1.5px] shadow-sm flex items-center justify-center relative overflow-hidden shrink-0 group border border-stone-700/40`}
    >
      {/* 内部微光层 */}
      <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-stone-900/90 via-stone-950/95 to-black flex items-center justify-center relative p-1">
        {/* 高精度纯矢量 SVG: S挂钩 + 建筑流线金衣架 + 宝石红 W 几何基座 */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full filter drop-shadow-xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* 香槟拉丝金渐变 */}
            <linearGradient id="swGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F9E29C" />
              <stop offset="40%" stopColor="#E2BD68" />
              <stop offset="70%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#9C7924" />
            </linearGradient>

            {/* 勃艮第高定宝石红渐变 */}
            <linearGradient id="swRubyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D63031" />
              <stop offset="100%" stopColor="#800E13" />
            </linearGradient>
          </defs>

          {/* 1. S 形挂钩 (Top S-Curve Hook) */}
          <path
            d="M50 14 C56 14 60 18 58 24 C56 29 46 32 46 38 C46 44 54 46 54 52 L54 54"
            stroke="url(#swGoldGrad)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 2. 现代极简金色衣架肩线与横梁轮廓 (Architectural Hanger Outline) */}
          <path
            d="M44 48 L16 62 C12 64 12 68 15 70 L24 70 M56 48 L84 62 C88 64 88 68 85 70 L76 70"
            stroke="url(#swGoldGrad)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 3. 几何立体 W 构型 (Center W Monogram Base with Ruby Lacquer Fill) */}
          <path
            d="M26 56 L38 84 L50 62 L62 84 L74 56 L64 56 L56 74 L50 62 L44 74 L36 56 Z"
            fill="url(#swRubyGrad)"
            stroke="url(#swGoldGrad)"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* 4. 挂钩顶端高光小金球 */}
          <circle cx="50" cy="14" r="2.8" fill="url(#swGoldGrad)" />
        </svg>
      </div>
    </div>
  );

  if (variant === 'icon-only') {
    return (
      <div onClick={onClick} className={`cursor-pointer select-none inline-flex ${className}`}>
        {LogoIcon}
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <div
        onClick={onClick}
        className={`flex flex-col items-center gap-2 cursor-pointer select-none text-center ${className}`}
      >
        {LogoIcon}
        <div className="space-y-0.5">
          <span className={`font-black text-stone-900 ${titleSizeMap[size]} block`}>
            SMARTWARDROBE
          </span>
          <span className={`font-mono uppercase font-bold text-stone-500 ${subSizeMap[size]} block`}>
            HAUTE ATELIER · 数字化虚拟衣橱
          </span>
        </div>
      </div>
    );
  }

  // 默认 horizontal
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 cursor-pointer select-none text-left ${className}`}
    >
      {LogoIcon}
      <div className="flex flex-col justify-center">
        <span className={`font-black text-stone-900 ${titleSizeMap[size]} leading-none`}>
          SMARTWARDROBE
        </span>
        <span className={`font-mono uppercase font-semibold text-stone-500 ${subSizeMap[size]} mt-1 leading-none`}>
          HAUTE ATELIER · 数字化衣橱
        </span>
      </div>
    </div>
  );
};
