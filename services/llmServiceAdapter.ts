/**
 * Adaptador para usar o Native LLM Service com a interface existente do app
 * Este arquivo facilita a migração do WebLLM para llama.rn
 */

import { nativeLlmService } from './nativeLlmService';
import { downloadModel, type DownloadProgress } from './ModelDownloader';
import { MODELS } from '../constants';
import type { LlmModelConfig } from '../types';

class LlmServiceAdapter {
  /**
   * Carrega um modelo (faz download se necessário e inicializa)
   */
  async loadModel(
    modelConfig: LlmModelConfig,
    onProgress: (progress: number, message: string) => void,
    hfToken?: string
  ): Promise<void> {
    console.log('[LlmAdapter] ==================== LOAD MODEL ADAPTER START ====================');
    console.log('[LlmAdapter] Model:', modelConfig.displayName);
    console.log('[LlmAdapter] Model ID:', modelConfig.id);
    console.log('[LlmAdapter] HF Token provided:', !!hfToken);
    console.log('[LlmAdapter] Expected size:', (modelConfig.sizeBytes / 1024 / 1024).toFixed(2), 'MB');
    console.log('[LlmAdapter] Expected SHA256:', modelConfig.sha256.substring(0, 16) + '...');
    
    // Callback simplificado: nativeLlmService agora recebe config completo
    await nativeLlmService.loadModel(
      modelConfig,
      (config: LlmModelConfig, onProgressCallback?: (progress: number) => void) => {
        // Adapter de callback: DownloadProgress → number
        const progressAdapter = onProgressCallback 
          ? (progress: DownloadProgress) => onProgressCallback(progress.progress)
          : undefined;
        
        return downloadModel(config, progressAdapter, hfToken);
      },
      onProgress
    );
    
    console.log('[LlmAdapter] ==================== LOAD MODEL ADAPTER END ====================');
  }

  /**
   * Carrega modelo de um buffer (para arquivo local escolhido pelo usuário)
   */
  async loadModelFromBuffer(
    modelBuffer: ArrayBuffer,
    onProgress: (progress: number, message: string) => void
  ): Promise<void> {
    onProgress(0, 'Salvando arquivo local...');
    
    // No React Native, precisamos salvar o ArrayBuffer como arquivo primeiro
    const RNFS = require('react-native-fs');
    const tempPath = `${RNFS.DocumentDirectoryPath}/models/temp-local-model.gguf`;
    
    try {
      // Garante que o diretório existe
      await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/models`);
      
      onProgress(20, 'Escrevendo arquivo...');
      
      // Converte ArrayBuffer para base64 e salva
      const uint8Array = new Uint8Array(modelBuffer);
      const base64 = Buffer.from(uint8Array).toString('base64');
      await RNFS.writeFile(tempPath, base64, 'base64');
      
      onProgress(40, 'Arquivo salvo, carregando modelo...');
      
      // Carrega o modelo do arquivo temporário
      await nativeLlmService.loadModelFromPath(tempPath, (loadProgress, message) => {
        const scaledProgress = 40 + (loadProgress * 0.6);
        onProgress(scaledProgress, message);
      });
      
      onProgress(100, 'Modelo local carregado!');
    } catch (error: any) {
      console.error('[LlmAdapter] Failed to load model from buffer:', error);
      throw new Error(`Falha ao carregar arquivo local: ${error.message || error}`);
    }
  }

  /**
   * Gera texto com streaming
   */
  async generateStream(
    systemInstruction: string,
    prompt: string,
    onChunk: (text: string) => void,
    onFinish: () => void
  ): Promise<void> {
    if (!nativeLlmService.isReady()) {
      throw new Error('Modelo não está carregado. Por favor, carregue um modelo primeiro.');
    }

    await nativeLlmService.generateStream(
      systemInstruction,
      prompt,
      onChunk,
      onFinish
    );
  }

  /**
   * Limpa cache (libera o modelo da memória)
   */
  async clearCache(): Promise<void> {
    console.log('[LlmAdapter] Clearing cache...');
    await nativeLlmService.release();
  }

  /**
   * Verifica se o serviço está pronto
   */
  isReady(): boolean {
    return nativeLlmService.isReady();
  }

  /**
   * Obtém informações do modelo atual
   */
  getModelInfo() {
    return nativeLlmService.getModelInfo();
  }
}

// Exporta instância singleton compatível com a interface antiga
export const llmService = new LlmServiceAdapter();
