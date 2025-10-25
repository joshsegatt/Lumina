/**
 * Native LLM Service para React Native usando llama.rn
 * Esta é a implementação NATIVA que substitui o WebLLM
 * Funciona diretamente com arquivos GGUF baixados localmente
 */

import { initLlama, LlamaContext } from 'llama.rn';
import type { LlmModelConfig } from '../types';
import { ensureModelReady, normalizePathForEngine, verifyNativeAccess, type ModelValidationResult } from './ModelDownloader';

class NativeLlmManager {
  private context: LlamaContext | null = null;
  private currentModelPath: string | null = null;
  private isInitialized: boolean = false;
  private isLoading: boolean = false; // Mutex flag to prevent concurrent loads

  /**
   * Carrega um modelo GGUF do caminho local
   * @param modelPath Caminho completo do arquivo .gguf no dispositivo
   * @param onProgress Callback para reportar progresso
   * @param expectedSize Tamanho esperado em bytes (para validação)
   * @param expectedHash SHA256 esperado (para validação)
   */
  async loadModelFromPath(
    modelPath: string,
    onProgress: (progress: number, message: string) => void,
    expectedSize?: number,
    expectedHash?: string
  ): Promise<void> {
    console.log('[NativeLLM] ==================== LOAD MODEL START ====================');
    console.log('[NativeLLM] Model path:', modelPath);
    console.log('[NativeLLM] Will validate:', { size: !!expectedSize, hash: !!expectedHash });
    
    // MUTEX: Prevent concurrent loads
    if (this.isLoading) {
      const errorMsg = 'Model is already loading. Please wait for current operation to complete.';
      console.error('[NativeLLM] ❌', errorMsg);
      throw new Error(errorMsg);
    }
    
    this.isLoading = true;
    
    try {
      onProgress(0, 'Validando arquivo do modelo...');

      // CRÍTICO: Validar modelo ANTES de tentar carregar
      console.log('[NativeLLM] Running pre-load validation...');
      const validation: ModelValidationResult = await ensureModelReady(
        modelPath,
        expectedSize,
        expectedHash
      );

      if (!validation.isValid) {
        const errorMsg = validation.error || 'Model validation failed';
        console.error('[NativeLLM] ❌ Model validation FAILED:', errorMsg);
        throw new Error(
          `Model file is not ready:\n` +
          `- File exists: ${validation.exists}\n` +
          `- Size match: ${validation.sizeMatch}\n` +
          `- Hash match: ${validation.hashMatch}\n` +
          `Error: ${errorMsg}`
        );
      }

      console.log('[NativeLLM] ✅ Model validation PASSED');
      console.log('[NativeLLM] Proceeding to load model into memory...');

      // Libera contexto anterior se existir
      if (this.context) {
        console.log('[NativeLLM] Releasing previous context...');
        onProgress(5, 'Liberando modelo anterior...');
        await this.context.release();
        this.context = null;
      }

      onProgress(10, 'Inicializando engine nativa...');
      
      console.log('[EngineInit] ========== INITIALIZATION START ==========');
      console.log('[EngineInit] Model path:', modelPath);
      console.log('[EngineInit] Path length:', modelPath.length);
      console.log('[EngineInit] Path has special chars:', /[^a-zA-Z0-9\-_\/\.]/.test(modelPath));
      console.log('[EngineInit] Config:', {
        use_mlock: true,
        n_ctx: 2048,
        n_batch: 512,
        n_threads: 4
      });

      // CRÍTICO: Verificar acesso nativo ANTES de initLlama
      console.log('[EngineInit] Verifying native access...');
      const isAccessible = await verifyNativeAccess(modelPath);
      if (!isAccessible) {
        throw new Error(
          `File not accessible by native layer:\n` +
          `Path: ${modelPath}\n` +
          `This usually means:\n` +
          `- File was not fully written to disk\n` +
          `- Path format is incorrect\n` +
          `- Permissions issue`
        );
      }
      console.log('[EngineInit] ✅ Native access verified');

      // Normaliza path para engine
      const normalizedPath = normalizePathForEngine(modelPath);
      console.log('[EngineInit] Using normalized path:', normalizedPath);
      console.log('[EngineInit] Calling initLlama...');

      // Inicializa o llama.rn com o modelo
      this.context = await initLlama({
        model: normalizedPath,
        use_mlock: true, // Mantém o modelo na memória
        n_ctx: 2048, // Contexto de 2048 tokens
        n_batch: 512, // Batch size para processamento
        n_threads: 4, // Usar 4 threads (ajuste conforme CPU)
        // Configurações de quantização são detectadas automaticamente do arquivo GGUF
      });

      console.log('[EngineInit] ✅ initLlama successful');
      console.log('[EngineInit] Context type:', typeof this.context);
      console.log('[EngineInit] Context has completion:', typeof this.context.completion);
      console.log('[EngineInit] ========== INITIALIZATION SUCCESS ==========');

      this.currentModelPath = normalizedPath;
      this.isInitialized = true;

      onProgress(100, 'Modelo carregado com sucesso!');
      console.log('[NativeLLM] ✅ Model loaded successfully');
      console.log('[NativeLLM] ==================== LOAD MODEL END ====================');
      
      // Mutex is released in finally block
    } catch (error: any) {
      console.error('[EngineInit] ========== INITIALIZATION FAILED ==========');
      console.error('[EngineInit] Error type:', typeof error);
      console.error('[EngineInit] Error constructor:', error.constructor?.name);
      console.error('[EngineInit] Error message:', error.message);
      console.error('[EngineInit] Error code:', error.code);
      console.error('[EngineInit] Error nativeError:', error.nativeError);
      console.error('[EngineInit] Error userInfo:', error.userInfo);
      console.error('[EngineInit] Error domain:', error.domain);
      
      // Log ALL error properties
      const allProps = Object.getOwnPropertyNames(error);
      console.error('[EngineInit] All error properties:', allProps);
      
      for (const prop of allProps) {
        if (prop !== 'stack') {
          console.error(`[EngineInit]   ${prop}:`, error[prop]);
        }
      }
      
      console.error('[EngineInit] Full error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error('[EngineInit] ========== END ERROR DUMP ==========');
      
      console.error('[NativeLLM] ❌ Failed to load model');
      console.log('[NativeLLM] ==================== LOAD MODEL END ====================');
      this.isInitialized = false;
      
      // Extract real error message from native layer
      // Priority: nativeError.localizedDescription > userInfo.NSLocalizedDescription > message
      let realErrorMessage = error.message || 'Unknown error';
      let errorCode = error.code || 'UNKNOWN';
      let nativeDetails = '';
      
      // Try to extract iOS/Android native error
      if (error.nativeError) {
        if (typeof error.nativeError === 'string') {
          nativeDetails = error.nativeError;
        } else if (error.nativeError.localizedDescription) {
          nativeDetails = error.nativeError.localizedDescription;
        }
      }
      
      // Try userInfo (iOS specific)
      if (error.userInfo?.NSLocalizedDescription) {
        nativeDetails = error.userInfo.NSLocalizedDescription;
      }
      
      // Try domain (iOS specific)
      if (error.domain) {
        errorCode = error.domain;
      }
      
      // Build comprehensive error message
      const errorDetails = [
        `❌ Engine Initialization Failed`,
        ``,
        `📁 Model Path: ${modelPath}`,
        `🔢 Error Code: ${errorCode}`,
        `💬 Message: ${realErrorMessage}`,
        nativeDetails ? `🔧 Native Details: ${nativeDetails}` : null,
        ``,
        `🔍 Troubleshooting:`,
        `1. Check device logs: adb logcat | grep llama`,
        `2. Verify model file format is GGUF (not safetensors)`,
        `3. Check available RAM (model needs ~2-4GB free)`,
        `4. Ensure llama.rn native library linked correctly`,
        `5. Try smaller quantized model (Q4 instead of Q6)`,
      ].filter(Boolean).join('\n');
      
      // Log the comprehensive error
      console.error('[EngineError] ======================');
      console.error(errorDetails);
      console.error('[EngineError] ======================');
      
      // Throw with detailed error
      throw new Error(errorDetails);
    } finally {
      // Always release mutex flag
      this.isLoading = false;
    }
  }

  /**
   * Carrega modelo usando o ModelDownloader primeiro
   * @param modelConfig Configuração do modelo
   * @param downloadModel Função para baixar o modelo (recebe config completo)
   * @param onProgress Callback de progresso
   */
  async loadModel(
    modelConfig: LlmModelConfig,
    downloadModel: (config: LlmModelConfig, onProgress?: (progress: number) => void) => Promise<string>,
    onProgress: (progress: number, message: string) => void
  ): Promise<void> {
    console.log('[FLOW] ========== MODEL LOAD WORKFLOW ==========');
    console.log('[FLOW] STATE: idle → loading');
    console.log('[FLOW] Model:', modelConfig.displayName);
    console.log('[FLOW] ID:', modelConfig.id);
    console.log('[FLOW] Size:', (modelConfig.sizeBytes / 1024 / 1024).toFixed(2), 'MB');
    console.log('[FLOW] SHA256:', modelConfig.sha256.substring(0, 16) + '...');
    
    try {
      // Fase 1: Download (0-70%)
      console.log('[FLOW] STATE: loading → downloading');
      onProgress(0, 'Verificando modelo local...');
      
      const localPath = await downloadModel(modelConfig, (downloadProgress) => {
        const scaledProgress = downloadProgress * 0.7; // 70% do progresso total
        onProgress(scaledProgress, `Baixando modelo... ${Math.round(downloadProgress)}%`);
      });

      console.log('[FLOW] ✅ Model downloaded/verified at:', localPath);

      // Fase 2: Carregamento com validação (70-100%)
      console.log('[FLOW] STATE: downloading → validating + initializing');
      onProgress(70, 'Validando e inicializando modelo...');
      
      await this.loadModelFromPath(
        localPath,
        (loadProgress, message) => {
          const scaledProgress = 70 + (loadProgress * 0.3); // 30% restante
          onProgress(scaledProgress, message);
        },
        modelConfig.sizeBytes, // Passa tamanho para validação
        modelConfig.sha256      // Passa hash para validação
      );

      console.log('[FLOW] STATE: initializing → ready');
      onProgress(100, 'Pronto para usar!');
      console.log('[FLOW] ✅✅✅ MODEL READY FOR USE');
      console.log('[FLOW] ========== WORKFLOW COMPLETE: ✅ READY ==========');
    } catch (error: any) {
      console.error('[FLOW] STATE: * → error');
      console.error('[FLOW] ❌ Workflow failed:', error.message);
      console.log('[FLOW] ========== WORKFLOW FAILED: ❌ ERROR ==========');
      throw error;
    }
  }

  /**
   * Gera texto usando streaming
   * @param systemInstruction Instrução do sistema
   * @param prompt Prompt do usuário
   * @param onChunk Callback para cada chunk de texto
   * @param onFinish Callback quando terminar
   */
  async generateStream(
    systemInstruction: string,
    prompt: string,
    onChunk: (text: string) => void,
    onFinish: () => void
  ): Promise<void> {
    if (!this.context || !this.isInitialized) {
      throw new Error('Modelo não está carregado. Chame loadModel primeiro.');
    }

    console.log('[NativeLLM] Starting generation...');

    try {
      // Formata o prompt no estilo chat
      const fullPrompt = `<|system|>\n${systemInstruction}\n<|user|>\n${prompt}\n<|assistant|>\n`;

      let fullResponse = '';

      // Gera texto com streaming
      await this.context.completion(
        {
          prompt: fullPrompt,
          n_predict: 1024, // Máximo de tokens a gerar
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
          stop: ['<|user|>', '<|system|>'], // Stop sequences
        },
        (data) => {
          // Callback para cada token gerado
          if (data.token) {
            fullResponse += data.token;
            onChunk(fullResponse);
          }
        }
      );

      console.log('[NativeLLM] Generation completed');
      onFinish();
    } catch (error: any) {
      console.error('[NativeLLM] Generation error:', error);
      onChunk(`Erro ao gerar resposta: ${error.message || error}`);
      onFinish();
    }
  }

  /**
   * Libera recursos do modelo
   */
  async release(): Promise<void> {
    if (this.context) {
      console.log('[NativeLLM] Releasing context...');
      await this.context.release();
      this.context = null;
      this.currentModelPath = null;
      this.isInitialized = false;
    }
  }

  /**
   * Verifica se há um modelo carregado
   */
  isReady(): boolean {
    return this.isInitialized && this.context !== null;
  }

  /**
   * Retorna informações do modelo atual
   */
  getModelInfo(): { path: string | null; isLoaded: boolean } {
    return {
      path: this.currentModelPath,
      isLoaded: this.isInitialized,
    };
  }
}

// Exporta instância singleton
export const nativeLlmService = new NativeLlmManager();
