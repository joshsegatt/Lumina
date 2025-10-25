import type React from 'react';

// NEW: For navigation
export type Screen = 'chat' | 'history' | 'settings' | 'model-selection';

// NEW: For i18n
export type LanguageCode = 'en' | 'pt' | 'es' | 'fr' | 'de' | 'ja' | 'zh';
export interface Language {
    id: LanguageCode;
    label: string;
}

// NEW: For Theme Management
export type Theme = 'light' | 'dark' | 'system';


export enum FeatureId {
  IDEA_GENERATOR = 'idea-generator',
  CONTENT_POLISHER = 'content-polisher',
  VISION_WEAVER = 'vision-weaver',
}

export interface Feature {
  id: FeatureId;
  title: string;
  description: string;
  systemInstruction: string;
  icon: (props: React.ComponentProps<'svg'>) => React.ReactElement;
  placeholder: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// NEW: For conversation history
export interface Conversation {
    id: string;
    messages: ChatMessage[];
    feature: Feature;
    createdAt: number;
    modelId: string;
}


export type LlmStatus = 
  | 'idle'              // Nenhum modelo selecionado
  | 'loading'           // Estado inicial (genérico)
  | 'downloading'       // Baixando arquivo do HF
  | 'validating'        // Validando SHA256
  | 'initializing'      // Carregando no engine (initLlama)
  | 'ready'             // Pronto para gerar texto
  | 'error'             // Falha genérica
  | 'failed_download'   // Download falhou
  | 'failed_validation' // Validação falhou (SHA256 mismatch)
  | 'failed_engine';    // Engine init falhou (crítico)

export interface LlmModelMetadata {
  id: string;
  displayName: string;
  url: string;
  sha256: string;
}

export interface LlmModelConfig extends LlmModelMetadata {
  size: string;
  sizeBytes: number;
}