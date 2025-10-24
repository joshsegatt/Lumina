import React from 'react';
import type { Conversation, Screen } from '../types';
import { useI18n } from '../services/i18n';

interface HistoryScreenProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewChat: () => void;
  onClearAll: () => void;
}

const TrashIcon = (props: React.ComponentProps<'svg'>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.033-2.124H8.033c-1.12 0-2.033.944-2.033 2.124v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

const PlusIcon = (props: React.ComponentProps<'svg'>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);


export const HistoryScreen: React.FC<HistoryScreenProps> = ({ conversations, onSelectConversation, onDeleteConversation, onNewChat, onClearAll }) => {
    const { t } = useI18n();
    return (
        <div className="flex flex-col w-full py-4 min-h-screen-minus-header">
            <header className="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('conversationHistory')}</h2>
                <div className="flex items-center gap-2">
                    {conversations.length > 0 && (
                        <button 
                            onClick={onClearAll}
                            className="flex items-center gap-2 bg-red-600/10 text-red-500 font-bold py-2 px-4 rounded-lg hover:bg-red-600/20 transition-colors"
                        >
                            <TrashIcon className="w-5 h-5" />
                            {t('clearHistory')}
                        </button>
                    )}
                    <button 
                        onClick={onNewChat}
                        className="flex items-center gap-2 bg-violet-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-violet-500 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                        {t('startNewChat')}
                    </button>
                </div>
            </header>

            <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-3 py-4">
                {conversations.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-center mt-8">{t('noConversations')}</p>
                ) : (
                    conversations.map(convo => (
                        <div key={convo.id} className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg flex items-center justify-between group hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                           <button onClick={() => onSelectConversation(convo.id)} className="flex-grow text-left flex items-center gap-4">
                               <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                                   <convo.feature.icon className="w-5 h-5 text-violet-500 dark:text-violet-400" />
                               </div>
                               <div>
                                   <h3 className="text-slate-800 dark:text-slate-200 font-semibold">{convo.feature.title}</h3>
                                   <p className="text-sm text-slate-500 dark:text-slate-400">
                                       {new Date(convo.createdAt).toLocaleString()}
                                   </p>
                               </div>
                           </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteConversation(convo.id); }}
                                className="p-2 rounded-full hover:bg-red-500/10 dark:hover:bg-red-900/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                title={t('deleteChat') || 'Delete Chat'}
                            >
                                <TrashIcon className="w-5 h-5 text-red-500 dark:text-red-400" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};