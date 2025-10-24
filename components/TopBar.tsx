
import React from 'react';
import type { Screen } from '../types';
import { useI18n } from '../services/i18n';

interface TopBarProps {
  setScreen: (screen: Screen) => void;
  onChatClick: () => void;
}

const ChatIcon = (props: React.ComponentProps<'svg'>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
);

const HistoryIcon = (props: React.ComponentProps<'svg'>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const SettingsIcon = (props: React.ComponentProps<'svg'>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0M3.75 18H7.5m3-6h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0M3.75 12H7.5" />
    </svg>
);

export const TopBar: React.FC<TopBarProps> = ({ setScreen, onChatClick }) => {
    const { t } = useI18n();

    return (
        <>
            {/* The style tag is added here to define the animation for the logo */}
            <style>{`
                .animated-gradient {
                    background-size: 200% 200%;
                    animation: gradient-animation 4s ease infinite;
                }
                @keyframes gradient-animation {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
            <div className="sticky top-0 z-50 w-full bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700/50">
                <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-sky-500 animated-gradient">
                        Lumina
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onChatClick}
                            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" 
                            title={t('chat')}
                            aria-label={t('chat')}
                        >
                            <ChatIcon className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
                        </button>
                        <button 
                            onClick={() => setScreen('history')} 
                            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" 
                            title={t('history')}
                            aria-label={t('history')}
                        >
                            <HistoryIcon className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
                        </button>
                        <button 
                            onClick={() => setScreen('settings')} 
                            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" 
                            title={t('settings')}
                            aria-label={t('settings')}
                        >
                            <SettingsIcon className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
