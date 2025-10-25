
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { TopBar } from './components/TopBar';
import { HistoryScreen } from './components/HistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { Header } from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FEATURES, MODELS, LOCAL_MODEL_CONFIG } from './constants';
import type { Feature, LlmStatus, LlmModelConfig, Screen, Conversation, ChatMessage } from './types';
import { llmService } from './services/llmServiceAdapter';
import { I18nProvider, useI18n } from './services/i18n';
import { useConversationManager } from './services/conversationManager';
import { ThemeProvider } from './services/themeManager';
import { logVersionInfo } from './version';

const SplashScreen: React.FC = () => {
    return (
        <div className={`fixed inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900 z-[100]`}>
            <div className="transition-all duration-1000 ease-out opacity-0 scale-95 animate-enter">
                <Header tagline="" />
            </div>
            {/* Define the simple enter animation */}
            <style>{`
                @keyframes enter {
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-enter {
                    animation-name: enter;
                    animation-fill-mode: forwards;
                }
            `}</style>
        </div>
    );
}

const DownloadIcon = (props: React.ComponentProps<'svg'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const UploadIcon = (props: React.ComponentProps<'svg'>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);


const ModelCard: React.FC<{ model: LlmModelConfig, onSelect: () => void, buttonText: string, disabled?: boolean }> = ({ model, onSelect, buttonText, disabled = false }) => (
  <div className={`bg-slate-100 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-300 dark:border-slate-700/50 flex flex-col text-left ${disabled ? 'opacity-50' : ''}`}>
    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{model.displayName}</h3>
    <p className="text-slate-500 dark:text-slate-400 mb-4">Approx. Size: {model.size}</p>
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`mt-auto bg-violet-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-violet-500'
      }`}
    >
      <DownloadIcon className="w-5 h-5" />
      {buttonText}
    </button>
  </div>
);

const ModelSelectionScreen: React.FC<{
  status: LlmStatus;
  progress: number;
  message: string;
  selectedModelName: string | null;
  onSelectModel: (modelId: string) => void;
  onLoadLocalFile: () => void;
  onReset: () => void;
}> = ({ status, progress, message, selectedModelName, onSelectModel, onLoadLocalFile, onReset }) => {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen-minus-header py-4">
      <div className="w-full max-w-4xl text-center">
        {status === 'loading' ? (
          <div className="mt-4 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('loadingModel', { modelName: selectedModelName || 'Model' })}</h3>
            <div className="flex items-center gap-4 mb-2">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                <div
                    className="bg-violet-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                ></div>
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{Math.round(progress)}%</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
            <button
                onClick={onReset}
                className="mt-6 bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 transition-colors"
            >
                {t('cancel')}
            </button>
          </div>
        ) : status === 'error' ? (
          <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-500/50 rounded-lg max-w-md mx-auto">
            <p className="text-red-800 dark:text-red-300 font-semibold">{t('engineFail')}</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{message}</p>
            <button
                onClick={onReset}
                className="mt-4 bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 transition-colors"
            >
                {t('tryAgain')}
            </button>
          </div>
        ) : (status === 'failed_engine' || status === 'failed_download' || status === 'failed_validation') ? (
          <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-500/50 rounded-lg max-w-lg mx-auto">
            <p className="text-red-800 dark:text-red-300 font-semibold">
              {status === 'failed_engine' && '⚠️ Engine Initialization Failed'}
              {status === 'failed_download' && '⚠️ Download Failed'}
              {status === 'failed_validation' && '⚠️ Validation Failed'}
            </p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-2 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
              {message}
            </p>
            {status === 'failed_engine' && (
              <details className="mt-3">
                <summary className="text-red-700 dark:text-red-400 text-sm cursor-pointer font-semibold">
                  🔧 Troubleshooting Steps
                </summary>
                <ul className="text-red-600 dark:text-red-400 text-xs mt-2 space-y-1 list-disc list-inside">
                  <li>Check device logs: <code className="bg-red-200 dark:bg-red-800 px-1">adb logcat | grep llama</code></li>
                  <li>Verify model file downloaded completely (check size matches)</li>
                  <li>Ensure sufficient device RAM available (&gt;2GB free recommended)</li>
                  <li>Try clearing app cache: Settings → Apps → Lumina → Clear Cache</li>
                  <li>Restart device and try again</li>
                </ul>
              </details>
            )}
            <button
                onClick={onReset}
                className="mt-4 bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 transition-colors"
            >
                {t('tryAgain')}
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-2">{t('modelSelection')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-lg mx-auto">{t('modelDescription')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {MODELS.map(model => (
                 <ModelCard 
                   key={model.id} 
                   model={model} 
                   onSelect={() => onSelectModel(model.id)} 
                   buttonText={t('loadModel')}
                   disabled={status === 'downloading' || status === 'validating' || status === 'initializing'}
                 />
               ))}
            </div>
            <div className="my-8 text-center text-slate-500 dark:text-slate-400">OR</div>
            <div className="max-w-md mx-auto">
                <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-300 dark:border-slate-700/50 flex flex-col text-left">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('loadFromDevice')}</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">{t('loadFromDeviceDescription')}</p>
                    <button
                        onClick={onLoadLocalFile}
                        disabled={status === 'downloading' || status === 'validating' || status === 'initializing'}
                        className={`mt-auto bg-sky-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                          (status === 'downloading' || status === 'validating' || status === 'initializing') ? 'cursor-not-allowed opacity-50' : 'hover:bg-sky-500'
                        }`}
                    >
                        <UploadIcon className="w-5 h-5" />
                        {t('chooseFile')}
                    </button>
                </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [isSplashing, setIsSplashing] = useState(true);
  const [llmStatus, setLlmStatus] = useState<LlmStatus>('idle');
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadMessage, setLoadMessage] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const [screen, setScreen] = useState<Screen>('history');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadingAbortControllerRef = useRef<AbortController | null>(null);
  const { t } = useI18n();
  const { conversations, createConversation, updateConversation, deleteConversation, clearAllConversations } = useConversationManager();

  // Reset app state (replaces window.location.reload() for React Native compatibility)
  const resetApp = () => {
    console.log('[App] 🔄 Resetting application state...');
    
    // Cancel any ongoing model load
    if (loadingAbortControllerRef.current) {
      loadingAbortControllerRef.current.abort();
      loadingAbortControllerRef.current = null;
    }
    
    setLlmStatus('idle');
    setSelectedModelId(null);
    setLoadProgress(0);
    setLoadMessage('');
    setScreen('model-selection');
    setActiveConversationId(null);
  };
  
  useEffect(() => {
    const timer = setTimeout(() => setIsSplashing(false), 1800);
    return () => clearTimeout(timer);
  }, []);
  
  // Log version info on mount to confirm fresh bundle
  useEffect(() => {
    logVersionInfo();
  }, []);
  
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);
  
  const handleLoadModel = async (modelId: string) => {
    // RACE CONDITION GUARD: Prevent concurrent model loads
    if (llmStatus === 'loading' || llmStatus === 'downloading' || llmStatus === 'validating' || llmStatus === 'initializing') {
      console.warn('[App] ⚠️ Model already loading, ignoring request');
      return;
    }
    
    // Cancel any previous load attempt
    if (loadingAbortControllerRef.current) {
      console.log('[App] Cancelling previous load...');
      loadingAbortControllerRef.current.abort();
    }
    
    // Create new abort controller for this load
    loadingAbortControllerRef.current = new AbortController();
    const currentLoadController = loadingAbortControllerRef.current;
    
    setSelectedModelId(modelId);
    setLlmStatus('loading');
    
    try {
      const modelConfig = MODELS.find(m => m.id === modelId);
      if (!modelConfig) throw new Error("Model configuration not found.");

      // Check if load was cancelled
      if (currentLoadController.signal.aborted) {
        console.log('[App] Load cancelled before starting');
        return;
      }

      // HuggingFace token moved to environment for security
      // SECURITY FIX: Never commit tokens to source control
      // Set VITE_HF_TOKEN in your .env.local file
      // Get token from: https://huggingface.co/settings/tokens
      const HF_TOKEN = (import.meta as any).env?.VITE_HF_TOKEN || '';
      
      if (!HF_TOKEN) {
        console.warn('[App] ⚠️ No HF_TOKEN found. Downloads may be rate-limited.');
        console.warn('[App] Set VITE_HF_TOKEN in .env.local to avoid rate limits.');
      }
      
      await llmService.loadModel(modelConfig, (progress, message) => {
        // Check if load was cancelled during progress
        if (currentLoadController.signal.aborted) {
          console.log('[App] Load cancelled during progress');
          return;
        }
        
        console.log(`[App] Progress: ${progress}% - ${message}`);
        
        // Mapeia progresso para estados específicos
        if (progress < 70) {
          setLlmStatus('downloading');
        } else if (progress >= 70 && progress < 85) {
          setLlmStatus('validating');
        } else if (progress >= 85 && progress < 100) {
          setLlmStatus('initializing');
        }
        
        setLoadProgress(progress);
        setLoadMessage(message);
      }, HF_TOKEN);
      
      // Check if load was cancelled after completion
      if (currentLoadController.signal.aborted) {
        console.log('[App] Load cancelled after completion');
        return;
      }
      
      setLlmStatus('ready');
      loadingAbortControllerRef.current = null; // Clear controller on success
      handleNewChat(modelId);
    } catch (error) {
      // Check if error was due to cancellation
      if (currentLoadController.signal.aborted) {
        console.log('[App] Load properly cancelled');
        return;
      }
      
      loadingAbortControllerRef.current = null; // Clear controller on error
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      
      // Detectar tipo específico de erro
      console.error('[App] ========== LOAD MODEL FAILED ==========');
      console.error('[App] Error message:', errorMessage);
      console.error('[App] Full error:', error);
      
      if (errorMessage.toLowerCase().includes('download')) {
        console.error('[App] Error type: DOWNLOAD FAILURE');
        setLlmStatus('failed_download');
      } else if (errorMessage.toLowerCase().includes('validation') || errorMessage.toLowerCase().includes('sha256') || errorMessage.toLowerCase().includes('hash')) {
        console.error('[App] Error type: VALIDATION FAILURE');
        setLlmStatus('failed_validation');
      } else if (errorMessage.toLowerCase().includes('engine') || errorMessage.toLowerCase().includes('initllama') || errorMessage.toLowerCase().includes('initialization')) {
        console.error('[App] Error type: ENGINE INITIALIZATION FAILURE');
        setLlmStatus('failed_engine');
      } else {
        console.error('[App] Error type: GENERIC ERROR');
        setLlmStatus('error');
      }
      
      setLoadMessage(errorMessage);
      console.error('[App] Status set to:', llmStatus);
      console.error('[App] ==========================================');
    }
  };
  
    const handleLoadLocalFile = () => {
        fileInputRef.current?.click();
    };

    const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setSelectedModelId(LOCAL_MODEL_CONFIG.id);
        setLlmStatus('loading');
        
        try {
            const buffer = await file.arrayBuffer();
            await llmService.loadModelFromBuffer(buffer, (progress, message) => {
                setLoadProgress(progress);
                setLoadMessage(message);
            });
            setLlmStatus('ready');
            handleNewChat(LOCAL_MODEL_CONFIG.id);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setLlmStatus('error');
            setLoadMessage(errorMessage);
        }

        if (event.target) {
            event.target.value = '';
        }
    };

  const handleNewChat = (modelIdOverride?: string) => {
      if (llmStatus !== 'ready') {
          setScreen('model-selection');
          return;
      }
      const currentModelId = typeof modelIdOverride === 'string' ? modelIdOverride : selectedModelId;
      if (!currentModelId) return;
      const newConversation = createConversation(FEATURES[0], currentModelId);
      setActiveConversationId(newConversation.id);
      setScreen('chat');
  };
  
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setScreen('chat');
  };
  
  const handleDeleteConversation = (id: string) => {
      deleteConversation(id, t('deleteConfirm'), async (message: string) => window.confirm(message));
      if (activeConversationId === id) {
          setActiveConversationId(null);
          setScreen('history');
      }
  };

  const handleMessagesUpdate = (messages: ChatMessage[]) => {
      if (activeConversationId) {
          updateConversation(activeConversationId, messages);
      }
  };
  
  const handleClearHistory = () => {
      clearAllConversations(t('clearHistoryConfirm'), async (message: string) => window.confirm(message));
      setActiveConversationId(null);
      setScreen('history');
  }
  
  const handleClearCache = async () => {
      if(window.confirm(t('clearCacheConfirm'))) {
          await llmService.clearCache();
          alert(t('cacheCleared'));
          resetApp();
      }
  }

  const renderScreen = () => {
      if (screen === 'chat') {
           if (llmStatus !== 'ready' || !activeConversation) {
               return <ModelSelectionScreen 
                        status={llmStatus === 'loading' || llmStatus === 'error' ? llmStatus : 'idle'} 
                        progress={loadProgress} 
                        message={loadMessage} 
                        selectedModelName={selectedModelName}
                        onSelectModel={handleLoadModel}
                        onLoadLocalFile={handleLoadLocalFile}
                        onReset={resetApp}
                      />
           }
          return (
            <ErrorBoundary 
              fallbackTitle={t('errorInChat')}
              onReset={() => {
                console.log('[App] Resetting chat after error...');
                setActiveConversationId(null);
                setScreen('history');
              }}
            >
              <ChatWindow 
                conversation={activeConversation}
                onBack={() => { setActiveConversationId(null); setScreen('history'); }}
                onMessagesUpdate={handleMessagesUpdate}
              />
            </ErrorBoundary>
          );
      }
      switch (screen) {
          case 'history':
              return (
                <ErrorBoundary fallbackTitle={t('errorInHistory')}>
                  <HistoryScreen 
                    conversations={conversations}
                    onSelectConversation={handleSelectConversation}
                    onDeleteConversation={handleDeleteConversation}
                    onNewChat={handleNewChat}
                    onClearAll={handleClearHistory}
                  />
                </ErrorBoundary>
              );
          case 'settings':
              return (
                <ErrorBoundary fallbackTitle={t('errorInSettings')}>
                  <SettingsScreen 
                    activeModelId={selectedModelId}
                    onClearHistory={handleClearHistory}
                    onClearCache={handleClearCache}
                    onNavigate={setScreen}
                  />
                </ErrorBoundary>
              );
          case 'model-selection':
             return <ModelSelectionScreen 
                        status={llmStatus === 'loading' || llmStatus === 'error' ? llmStatus : 'idle'}
                        progress={loadProgress} 
                        message={loadMessage} 
                        selectedModelName={selectedModelName}
                        onSelectModel={handleLoadModel}
                        onLoadLocalFile={handleLoadLocalFile}
                        onReset={resetApp}
                      />
      }
  };
  
  const allModels = [...MODELS, LOCAL_MODEL_CONFIG];
  const selectedModelName = selectedModelId 
    ? (allModels.find(m => m.id === selectedModelId)?.displayName ?? null)
    : null;

  return (
    <div className="bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-white min-h-screen">
      <input type="file" ref={fileInputRef} onChange={onFileSelected} style={{ display: 'none' }} accept=".gguf" />
      <div className={`transition-opacity duration-500 ${isSplashing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {isSplashing && <SplashScreen />}
      </div>
      
      <div className={`transition-opacity duration-500 ${isSplashing ? 'opacity-0' : 'opacity-100'}`}>
        <TopBar 
            setScreen={setScreen} 
            onChatClick={handleNewChat}
        />
        <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {renderScreen()}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <ErrorBoundary fallbackTitle="Application Error">
    <I18nProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </I18nProvider>
  </ErrorBoundary>
);

export default App;