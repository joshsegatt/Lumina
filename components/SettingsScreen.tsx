import React, { useState } from 'react';
import { useI18n } from '../services/i18n';
import { useTheme } from '../services/themeManager';
import { LANGUAGES, MODELS, LOCAL_MODEL_CONFIG } from '../constants';
import type { LanguageCode, Theme, Screen } from '../types';

interface SettingsScreenProps {
    activeModelId: string | null;
    onClearHistory: () => void;
    onClearCache: () => void;
    onNavigate: (screen: Screen) => void;
}

const SettingsRow: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{title}</h3>
        <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
            {children}
        </div>
    </div>
);

const ToggleSwitch: React.FC<{ checked: boolean, onChange: (checked: boolean) => void, label: string, description: string }> = ({ checked, onChange, label, description }) => (
    <div>
        <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
            <button
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`${checked ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
            >
                <span className={`${checked ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
            </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
    </div>
);


export const SettingsScreen: React.FC<SettingsScreenProps> = ({ activeModelId, onClearHistory, onClearCache, onNavigate }) => {
    const { t, language, setLanguage } = useI18n();
    const { theme, setTheme } = useTheme();
    const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

    const allModels = [...MODELS, LOCAL_MODEL_CONFIG];
    const activeModel = allModels.find(m => m.id === activeModelId);

    const themeOptions: { id: Theme, label: string }[] = [
        { id: 'light', label: t('light') },
        { id: 'dark', label: t('dark') },
        { id: 'system', label: t('system') },
    ];
    
    return (
        <div className="flex flex-col w-full py-4 min-h-screen-minus-header">
            <header className="flex-shrink-0 mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('appSettings')}</h2>
            </header>

            <div className="flex-grow space-y-8 max-w-2xl mx-auto w-full">
                {/* General Settings */}
                <SettingsRow title={t('appSettings')}>
                    <div className="space-y-4">
                         <div>
                            <label htmlFor="language-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {t('language')}
                            </label>
                            <select
                                id="language-select"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block w-full p-2.5"
                            >
                                {LANGUAGES.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {t('theme')}
                            </label>
                            <div className="flex items-center gap-2 rounded-lg bg-slate-200 dark:bg-slate-700 p-1">
                                {themeOptions.map(option => (
                                    <button 
                                        key={option.id}
                                        onClick={() => setTheme(option.id)}
                                        className={`w-full py-1.5 text-sm font-semibold rounded-md transition-colors ${theme === option.id ? 'bg-white dark:bg-slate-900/70 text-violet-600 dark:text-slate-100 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-600/50'}`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </SettingsRow>
                
                 {/* Model Management */}
                <SettingsRow title={t('modelManagement')}>
                     <div className="flex items-center justify-between mb-4">
                         <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t('activeModel')}</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{activeModel?.displayName || 'None'} ({activeModel?.size})</p>
                            {activeModel && (
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1 break-all">{activeModel.id}</p>
                            )}
                         </div>
                         <button onClick={() => onNavigate('model-selection')} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                            {t('changeModel')}
                         </button>
                     </div>
                     <button onClick={onClearCache} className="w-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                        {t('clearCache')}
                     </button>
                </SettingsRow>
                
                {/* Privacy & Data */}
                <SettingsRow title={t('privacyData')}>
                    <div className="space-y-4">
                        <ToggleSwitch
                            label={t('analytics')}
                            description={t('analyticsDesc')}
                            checked={analyticsEnabled}
                            onChange={setAnalyticsEnabled}
                        />
                         <div className="flex items-center justify-between">
                             <p className="font-medium text-slate-700 dark:text-slate-300">Conversation History</p>
                             <button onClick={onClearHistory} className="bg-red-500/10 text-red-500 font-bold py-2 px-4 rounded-lg hover:bg-red-500/20 transition-colors">
                                {t('clearHistory')}
                             </button>
                         </div>
                    </div>
                </SettingsRow>

                {/* About Section */}
                <SettingsRow title={t('about')}>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">Lumina</p>
                        <p>{t('version')}</p>
                        <p className="mt-2">Designed to spark creativity and illuminate ideas.</p>
                    </div>
                </SettingsRow>
            </div>
        </div>
    );
};