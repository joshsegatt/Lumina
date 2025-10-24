import type React from 'react';

// NEW: For navigation
export type Screen = 'chat' | 'history' | 'settings' | 'model-selection';

// NEW: For i18n
export type LanguageCode = 'en' | 'pt' | 'es' | 'fr' | 'de' | 'ja';
export interface Language {
    code: LanguageCode;
    name: string;
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


export type LlmStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LlmModelConfig {
  id: string;
  displayName: string;
  size: string;
  // NEW: Fields for robust model downloading
  url: string;
  sizeBytes: number;
  sha256: string; // Placeholder for integrity check
}