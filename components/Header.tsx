import React from 'react';

interface HeaderProps {
    tagline: string;
}

export const Header: React.FC<HeaderProps> = ({ tagline }) => {
  return (
    <header className="flex flex-col items-center justify-center py-8 md:py-12 text-center">
      <div className="relative flex items-center justify-center w-24 h-24 md:w-32 md:h-32 mb-4">
        <div className="absolute w-full h-full bg-violet-500 rounded-full blur-2xl opacity-40"></div>
        <svg
          width="80"
          height="80"
          viewBox="0 0 100 100"
          className="relative w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#a855f7', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#60a5fa', stopOpacity: 1 }} />
            </linearGradient>
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                <feOffset dx="2" dy="2" result="offsetblur"/>
                <feFlood floodColor="rgba(0,0,0,0.3)"/>
                <feComposite in2="offsetblur" operator="in"/>
                <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
          </defs>
          <path
            d="M20 20 L20 80 L70 80 L70 70 L30 70 L30 20 Z"
            fill="url(#logoGradient)"
            filter="url(#dropShadow)"
          />
          <circle cx="75" cy="25" r="5" fill="url(#logoGradient)" />
        </svg>
      </div>
      <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-sky-500 tracking-tight">
        Lumina
      </h1>
      <p className="mt-3 md:mt-4 max-w-2xl text-lg md:text-xl text-slate-600 dark:text-slate-400">
        {tagline}
      </p>
    </header>
  );
};