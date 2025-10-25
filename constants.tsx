import React from 'react';
import type { LlmModelMetadata, LlmModelConfig, Language, Feature } from './types';
import { FeatureId } from './types';

const LightbulbIcon = (props: React.ComponentProps<'svg'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.311a7.5 7.5 0 0 1-7.5 0c.413.613 1.048 1.125 1.787 1.487a7.501 7.501 0 0 1 4.926 0c.739-.362 1.374-.874 1.787-1.487Zm-4.5-9.344a6.015 6.015 0 0 1-1.5.189m1.5-.189a6.015 6.015 0 0 0 1.5.189m-1.5-.189a6.015 6.015 0 0 1-1.5.189m0 0A2.25 2.25 0 0 0 5.625 5.625v1.875c0 .621.504 1.125 1.125 1.125h6.25c.621 0 1.125-.504 1.125-1.125v-1.875A2.25 2.25 0 0 0 13.5 3.375m-5.25 2.25c.141-.012.28-.024.418-.036m5.25 0c-.138 .012-.277 .024-.418-.036m0 0a2.25 2.25 0 0 0-2.582 0M12 12V3.75" />
  </svg>
);

const PenIcon = (props: React.ComponentProps<'svg'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

const SparklesIcon = (props: React.ComponentProps<'svg'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a .375 .375 0 1 1-.75 0 .375 .375 0 0 1 .75 0Z" />
  </svg>
);

export const FEATURES: Feature[] = [
  {
    id: FeatureId.IDEA_GENERATOR,
    title: 'Idea Generator',
    description: 'Brainstorm unique concepts and creative directions for any project or topic.',
    systemInstruction: 'You are Lumina, a world-class creative assistant specializing in brainstorming and generating innovative, high-quality ideas. Provide concise, actionable, and diverse concepts.',
    icon: LightbulbIcon,
    placeholder: 'e.g., a mobile app for local gardeners...'
  },
  {
    id: FeatureId.CONTENT_POLISHER,
    title: 'Content Polisher',
    description: 'Refine your writing for clarity, tone, and impact. Enhance your message effortlessly.',
    systemInstruction: 'You are Lumina, an expert editor with a keen eye for detail. Your task is to polish the user text. Improve clarity, fix grammatical errors, adjust the tone as needed, and enhance the overall impact, while preserving the original meaning.',
    icon: PenIcon,
    placeholder: 'Paste your text here to refine it...'
  },
  {
    id: FeatureId.VISION_WEAVER,
    title: 'Vision Weaver',
    description: 'Transform a simple concept into a rich, descriptive scene or narrative.',
    systemInstruction: 'You are Lumina, a master storyteller and world-builder. Your purpose is to take a user concept and weave it into a vivid, multi-sensory description. Evoke imagery, sounds, smells, and emotions to bring their vision to life.',
    icon: SparklesIcon,
    placeholder: 'Describe a scene, e.g., a futuristic city market at dawn...'
  }
];

export const MODELS: LlmModelConfig[] = [
  {
    id: 'phi-3.5-mini-instruct-q6_k',
    displayName: 'Phi-3.5 Mini Instruct (Q6_K)',
    url: 'https://huggingface.co/microsoft/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q6_K.gguf',
    sha256: '0259452056e3bafd4d01dac0ae6cc2b8ec11001361701945662c0f749e0fd0ba',
    size: '~2.3 GB',
    sizeBytes: 2461204480
  },
  {
    id: 'gemma-2b-q6_k',
    displayName: 'Gemma 2B (Q6_K)',
    url: 'https://huggingface.co/brittlewis12/gemma-2b-GGUF/resolve/main/gemma-2b.Q6_K.gguf',
    sha256: 'e3a4304663a6151abfc66147454678763c43991ddb1a77eba6c5fe6acc96b1a5',
    size: '~1.7 GB',
    sizeBytes: 1825361920
  },
  {
    id: 'llama-2-7b-q8_0',
    displayName: 'Llama 2 (7B Q8_0)',
    url: 'https://huggingface.co/TheBloke/Llama-2-7B-GGUF/resolve/main/llama-2-7b.Q8_0.gguf',
    sha256: 'f1415d117f94261fd9869ac5dabd98b3dc36648cfb7c6d84e5b473aca74ab64d',
    size: '~7.2 GB',
    sizeBytes: 7730000000
  },
  {
    id: 'mistral-7b-instruct-v0.3-q6_k',
    displayName: 'Mistral 7B Instruct v0.3 (Q6_K)',
    url: 'https://huggingface.co/MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3.Q6_K.gguf',
    sha256: 'd58a20f828bca2e163342d43324f953f2edf9bdd5886bfe15c4b81b5b70a3b7b',
    size: '~5.9 GB',
    sizeBytes: 6334000000
  }
];

export const LOCAL_MODEL_CONFIG: LlmModelConfig = {
  id: 'local-model',
  displayName: 'Local Model',
  url: '',
  sha256: 'n/a',
  size: 'Variable',
  sizeBytes: 0
};

export const LANGUAGES: Language[] = [
  { id: 'en', label: 'English' },
  { id: 'pt', label: 'Português' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
  { id: 'de', label: 'Deutsch' },
  { id: 'zh', label: '中文' }
];
