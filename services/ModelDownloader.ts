import RNFS from 'react-native-fs';
import { sha256 } from 'react-native-sha256';
import { MODELS } from '../constants';
import type { LlmModelConfig } from '../types';

/**
 * Configuration for retry logic
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Normaliza path para formato esperado pela engine nativa
 * @param rawPath - Path retornado por RNFS
 * @returns Path normalizado para llama.rn
 */
export const normalizePathForEngine = (rawPath: string): string => {
  console.log('[PathNormalizer] Raw path:', rawPath);
  
  // Remove file:// se presente
  let normalized = rawPath.replace(/^file:\/\//, '');
  
  // Garante que é path absoluto
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  
  console.log('[PathNormalizer] Normalized path:', normalized);
  return normalized;
};

/**
 * Verifica se arquivo é acessível pela camada nativa
 */
export const verifyNativeAccess = async (filePath: string): Promise<boolean> => {
  try {
    const exists = await RNFS.exists(filePath);
    if (!exists) {
      console.error('[PathValidator] File does not exist:', filePath);
      return false;
    }
    
    const stat = await RNFS.stat(filePath);
    if (Number(stat.size) === 0) {
      console.error('[PathValidator] File is empty:', filePath);
      return false;
    }
    
    console.log('[PathValidator] ✅ File accessible:', {
      path: filePath,
      size: (Number(stat.size) / 1024 / 1024).toFixed(2) + ' MB',
      isFile: stat.isFile()
    });
    
    return true;
  } catch (error: any) {
    console.error('[PathValidator] ❌ Access check failed:', error.message);
    return false;
  }
};

/**
 * Retorna o diretório de modelos, com fallback para TemporaryDirectoryPath
 */
const getModelDir = async (): Promise<string> => {
  const primaryDir = `${RNFS.DocumentDirectoryPath}/models`;
  const fallbackDir = `${RNFS.TemporaryDirectoryPath}/models`;

  try {
    await RNFS.mkdir(primaryDir);
    console.log(`[Downloader] Using primary directory: ${primaryDir}`);
    return primaryDir;
  } catch (error: any) {
    console.warn(`[Downloader] Primary directory failed (${error.message}), trying fallback...`);
    try {
      await RNFS.mkdir(fallbackDir);
      console.log(`[Downloader] Using fallback directory: ${fallbackDir}`);
      return fallbackDir;
    } catch (fallbackError: any) {
      console.error(`[Downloader] Fallback directory also failed: ${fallbackError.message}`);
      throw new Error(`Cannot create models directory: ${fallbackError.message}`);
    }
  }
};

/**
 * Calcula SHA256 do arquivo usando leitura em chunks para evitar OutOfMemory
 */
const calculateSha256Streaming = async (filePath: string): Promise<string> => {
  console.log(`[Downloader] Calculating SHA256 for ${filePath}...`);
  
  try {
    const stat = await RNFS.stat(filePath);
    const fileSize = Number(stat.size);
    console.log(`[Downloader]   - File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    // Para arquivos pequenos (<100MB), usa método direto
    if (fileSize < 100 * 1024 * 1024) {
      console.log(`[Downloader]   - Using direct SHA256 calculation`);
      const fileContent = await RNFS.readFile(filePath, 'base64');
      const hash = await sha256(fileContent);
      console.log(`[Downloader]   - SHA256: ${hash.toLowerCase()}`);
      return hash.toLowerCase();
    }

    // Para arquivos grandes, lê em chunks de 10MB
    console.log(`[Downloader]   - Using chunked SHA256 calculation`);
    const chunkSize = 10 * 1024 * 1024;
    let position = 0;
    let combinedData = '';

    while (position < fileSize) {
      const length = Math.min(chunkSize, fileSize - position);
      const chunk = await RNFS.read(filePath, length, position, 'base64');
      combinedData += chunk;
      position += length;
      
      const progress = Math.floor((position / fileSize) * 100);
      if (progress % 20 === 0) {
        console.log(`[Downloader]   - SHA256 progress: ${progress}%`);
      }
    }

    const hash = await sha256(combinedData);
    console.log(`[Downloader]   - SHA256: ${hash.toLowerCase()}`);
    return hash.toLowerCase();
  } catch (error: any) {
    console.error(`[Downloader] SHA256 failed:`, error.message);
    throw new Error(`SHA256 calculation failed: ${error.message}`);
  }
};

/**
 * Wrapper with retry logic for downloads
 * Implements exponential backoff for network failures
 */
const downloadWithRetry = async (
  url: string,
  filePath: string,
  totalSize: number,
  onProgress: (progress: number, bytesDownloaded: number) => void,
  hfToken?: string
): Promise<number> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`[Downloader] 📥 Download attempt ${attempt}/${RETRY_CONFIG.maxRetries}`);
      
      const bytesWritten = await downloadWithRNFS(url, filePath, totalSize, onProgress, hfToken);
      
      console.log(`[Downloader] ✅ Download succeeded on attempt ${attempt}`);
      return bytesWritten;
      
    } catch (error: any) {
      lastError = error;
      console.error(`[Downloader] ❌ Attempt ${attempt} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.message.includes('HTTP 404') || 
          error.message.includes('HTTP 403') ||
          error.message.includes('Invalid Content-Type')) {
        console.error('[Downloader] Non-retryable error, aborting');
        throw error;
      }
      
      // If not last attempt, wait and retry
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
          RETRY_CONFIG.maxDelayMs
        );
        
        console.log(`[Downloader] ⏳ Retrying in ${(delay / 1000).toFixed(1)}s...`);
        await sleep(delay);
      }
    }
  }
  
  // All retries failed
  console.error(`[Downloader] ❌ All ${RETRY_CONFIG.maxRetries} attempts failed`);
  throw lastError || new Error('Download failed after max retries');
};

/**
 * Download usando RNFS.downloadFile() nativo do React Native
 * CORRIGIDO: React Native NÃO suporta fetch().body.getReader()!
 */
const downloadWithRNFS = async (
  url: string,
  filePath: string,
  totalSize: number,
  onProgress: (progress: number, bytesDownloaded: number) => void,
  hfToken?: string
): Promise<number> => {
  console.log('[Downloader] Starting RNFS native download');
  console.log(`[Downloader]   - Target: ${filePath}`);
  console.log(`[Downloader]   - Expected size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  const headers: Record<string, string> = {
    'User-Agent': 'Lumina-App/1.0'
  };
  
  if (hfToken) {
    headers['Authorization'] = `Bearer ${hfToken}`;
    console.log('[Downloader]   - Using HF token authentication');
  }
  
  try {
    // Deleta arquivo existente se houver
    if (await RNFS.exists(filePath)) {
      await RNFS.unlink(filePath);
      console.log('[Downloader]   - Deleted existing file');
    }
    
    const startTime = Date.now();
    
    const downloadResult = await RNFS.downloadFile({
      fromUrl: url,
      toFile: filePath,
      headers,
      background: false,
      discretionary: false,
      cacheable: false,
      progressInterval: 1000,
      progressDivider: 1,
      begin: (res) => {
        console.log('[Downloader] Download started:');
        console.log(`[Downloader]   - Status: ${res.statusCode}`);
        console.log(`[Downloader]   - Content-Length: ${res.contentLength}`);
        
        if (res.statusCode !== 200) {
          throw new Error(`HTTP ${res.statusCode}: Expected 200 OK`);
        }
        
        const contentType = (res.headers?.['Content-Type'] || res.headers?.['content-type'] || '').toLowerCase();
        if (contentType.includes('text/html') || contentType.includes('application/json')) {
          throw new Error(`Invalid Content-Type: ${contentType} (expected binary file)`);
        }
      },
      progress: (res) => {
        const progress = totalSize > 0 ? (res.bytesWritten / totalSize) * 100 : 0;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = res.bytesWritten / elapsed / 1024 / 1024;
        
        if (Math.floor(progress) % 5 === 0 && progress > 0) {
          console.log(
            `[Downloader] ${progress.toFixed(1)}% ` +
            `(${(res.bytesWritten / 1024 / 1024).toFixed(1)}/${(totalSize / 1024 / 1024).toFixed(1)} MB) ` +
            `- ${speed.toFixed(2)} MB/s`
          );
        }
        
        onProgress(Math.floor(progress), res.bytesWritten);
      }
    }).promise;
    
    const duration = (Date.now() - startTime) / 1000;
    const avgSpeed = downloadResult.bytesWritten / duration / 1024 / 1024;
    
    console.log('[Downloader] ✅ Download completed');
    console.log(`[Downloader]   - Status: ${downloadResult.statusCode}`);
    console.log(`[Downloader]   - Downloaded: ${(downloadResult.bytesWritten / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[Downloader]   - Duration: ${duration.toFixed(2)}s`);
    console.log(`[Downloader]   - Speed: ${avgSpeed.toFixed(2)} MB/s`);
    
    if (downloadResult.statusCode !== 200) {
      throw new Error(`Download failed with status ${downloadResult.statusCode}`);
    }
    
    if (downloadResult.bytesWritten === 0) {
      throw new Error('Download completed but file is empty');
    }
    
    return downloadResult.bytesWritten;
    
  } catch (error: any) {
    console.error('[Downloader] Download failed:', error.message);
    
    // Cleanup
    try {
      if (await RNFS.exists(filePath)) {
        await RNFS.unlink(filePath);
        console.log('[Downloader] Cleaned up partial download');
      }
    } catch (cleanupError) {
      console.warn('[Downloader] Cleanup failed:', cleanupError);
    }
    
    throw error;
  }
};

export interface ModelValidationResult {
  isValid: boolean;
  exists: boolean;
  sizeMatch: boolean;
  hashMatch: boolean;
  actualSize?: number;
  expectedSize?: number;
  actualHash?: string;
  expectedHash?: string;
  error?: string;
}

/**
 * FUNÇÃO CENTRAL: Resolve caminho completo do arquivo do modelo
 * Garante consistência em TODOS os lugares do código
 * 
 * @param modelId - ID do modelo (ex: 'gemma-2b-q6_k')
 * @returns Caminho completo do arquivo no disco
 */
export const resolveModelPath = async (modelId: string): Promise<string> => {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model) {
    throw new Error(`Model not found: ${modelId}`);
  }

  const modelDir = await getModelDir();
  const fileName = model.url.split('/').pop() || `${model.id}.gguf`;
  const filePath = `${modelDir}/${fileName}`;

  console.log(`[PathResolver] Resolved path for ${modelId}: ${filePath}`);
  return filePath;
};

/**
 * Valida se o modelo existe e está correto (tamanho + SHA256)
 * CHAMADO ANTES de initLlama() para evitar erros no engine
 */
export const ensureModelReady = async (
  filePath: string,
  expectedSize?: number,
  expectedHash?: string
): Promise<ModelValidationResult> => {
  console.log(`[Validator] ========== VALIDATION START ==========`);
  console.log(`[Validator] File: ${filePath}`);
  console.log(`[Validator] Expected size: ${expectedSize ? (expectedSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);
  console.log(`[Validator] Expected hash: ${expectedHash ? expectedHash.substring(0, 16) + '...' : 'N/A'}`);
  
  const result: ModelValidationResult = {
    isValid: false,
    exists: false,
    sizeMatch: false,
    hashMatch: false
  };

  try {
    // 1. Verifica existência
    const exists = await RNFS.exists(filePath);
    result.exists = exists;
    
    if (!exists) {
      result.error = 'Model file does not exist';
      console.log('[Validator] ❌ File does not exist');
      console.log(`[Validator] ========== VALIDATION END: ❌ FAIL ==========`);
      return result;
    }

    console.log('[Validator] ✅ File exists');

    // 2. Verifica tamanho
    if (expectedSize) {
      const stat = await RNFS.stat(filePath);
      result.actualSize = Number(stat.size);
      result.expectedSize = expectedSize;
      result.sizeMatch = result.actualSize === expectedSize;

      console.log(`[Validator] Size check: ${(result.actualSize / 1024 / 1024).toFixed(2)} MB`);
      
      if (!result.sizeMatch) {
        result.error = `Size mismatch: expected ${expectedSize}, got ${result.actualSize}`;
        console.log(`[Validator] ❌ Size mismatch`);
        console.log(`[Validator] ========== VALIDATION END: ❌ FAIL ==========`);
        return result;
      }

      console.log('[Validator] ✅ Size matches');
    }

    // 3. Verifica SHA256 (se fornecido)
    if (expectedHash) {
      console.log('[Validator] Starting SHA256 calculation...');
      result.actualHash = await calculateSha256Streaming(filePath);
      result.expectedHash = expectedHash.toLowerCase();
      result.hashMatch = result.actualHash === result.expectedHash;

      if (!result.hashMatch) {
        result.error = `Hash mismatch: expected ${result.expectedHash}, got ${result.actualHash}`;
        console.log('[Validator] ❌ Hash mismatch');
        console.log(`[Validator] ========== VALIDATION END: ❌ FAIL ==========`);
        return result;
      }

      console.log('[Validator] ✅ Hash matches');
    }

    result.isValid = true;
    console.log('[Validator] ✅ Model validation passed');
    console.log(`[Validator] ========== VALIDATION END: ✅ PASS ==========`);
    return result;

  } catch (error: any) {
    result.error = `Validation error: ${error.message}`;
    console.error('[Validator] Validation error:', error.message);
    console.log(`[Validator] ========== VALIDATION END: ❌ ERROR ==========`);
    return result;
  }
};

export interface DownloadProgress {
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  status: string;
}

/**
 * Download principal de modelo GGUF
 * SIMPLIFICADO: Usa apenas RNFS.downloadFile() (React Native native)
 */
export const downloadModel = async (
  model: LlmModelConfig,
  onProgress?: (progress: DownloadProgress) => void,
  hfToken?: string
): Promise<string> => {
  console.log('\n========================================');
  console.log(`[Downloader] Starting download: ${model.displayName}`);
  console.log(`[Downloader]   - Model ID: ${model.id}`);
  console.log(`[Downloader]   - Size: ${(model.sizeBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`[Downloader]   - HF Token: ${hfToken ? 'YES' : 'NO'}`);
  console.log('========================================\n');

  const modelDir = await getModelDir();
  const fileName = model.url.split('/').pop() || `${model.id}.gguf`;
  const filePath = `${modelDir}/${fileName}`;

  console.log(`[Downloader] Target path: ${filePath}`);

  // Verifica se já existe e está válido
  const validation = await ensureModelReady(filePath, model.sizeBytes, model.sha256);
  if (validation.isValid) {
    console.log('[Downloader] ✅ Model already exists and is valid - skipping download');
    return filePath;
  }

  console.log('[Downloader] Model needs download or is corrupted');
  if (validation.exists) {
    console.log('[Downloader] Deleting corrupted file...');
    await RNFS.unlink(filePath);
  }

  // Constrói URL final
  let finalUrl = model.url;
  if (!finalUrl.includes('cdn-lfs.huggingface.co') && !finalUrl.includes('/resolve/')) {
    const parts = finalUrl.split('/blob/');
    if (parts.length === 2) {
      finalUrl = parts[0] + '/resolve/' + parts[1];
      console.log('[Downloader] Converted blob URL to resolve URL');
    }
  }

  console.log(`[Downloader] Download URL: ${finalUrl}`);

  try {
    // Download usando RNFS nativo com retry logic
    onProgress?.({
      progress: 0,
      downloadedBytes: 0,
      totalBytes: model.sizeBytes,
      status: 'downloading'
    });

    const downloadedBytes = await downloadWithRetry(
      finalUrl,
      filePath,
      model.sizeBytes,
      (progress: number, bytes: number) => {
        onProgress?.({
          progress,
          downloadedBytes: bytes,
          totalBytes: model.sizeBytes,
          status: 'downloading'
        });
      },
      hfToken
    );

    console.log(`[Downloader] Download completed: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);

    // Validação final
    onProgress?.({
      progress: 100,
      downloadedBytes: model.sizeBytes,
      totalBytes: model.sizeBytes,
      status: 'validating'
    });

    console.log('[Downloader] Starting final validation...');
    const finalValidation = await ensureModelReady(filePath, model.sizeBytes, model.sha256);

    if (!finalValidation.isValid) {
      throw new Error(
        `Download validation failed: ${finalValidation.error}\n` +
        `Size: ${finalValidation.actualSize} / ${finalValidation.expectedSize}\n` +
        `Hash: ${finalValidation.actualHash?.substring(0, 16)}... / ${finalValidation.expectedHash?.substring(0, 16)}...`
      );
    }

    console.log('[Downloader] ✅ Download and validation successful!');
    console.log('========================================\n');

    onProgress?.({
      progress: 100,
      downloadedBytes: model.sizeBytes,
      totalBytes: model.sizeBytes,
      status: 'complete'
    });

    return filePath;

  } catch (error: any) {
    console.error('[Downloader] ❌ Download failed:', error.message);
    
    // Cleanup em caso de erro
    try {
      if (await RNFS.exists(filePath)) {
        await RNFS.unlink(filePath);
        console.log('[Downloader] Cleaned up failed download');
      }
    } catch (cleanupError) {
      console.warn('[Downloader] Cleanup failed:', cleanupError);
    }

    onProgress?.({
      progress: 0,
      downloadedBytes: 0,
      totalBytes: model.sizeBytes,
      status: 'error'
    });

    throw new Error(`Download failed: ${error.message}`);
  }
};

/**
 * Deleta modelo do disco
 */
export const deleteModel = async (modelId: string): Promise<void> => {
  const filePath = await resolveModelPath(modelId);

  if (await RNFS.exists(filePath)) {
    await RNFS.unlink(filePath);
    console.log(`[Downloader] Deleted model: ${filePath}`);
  } else {
    console.log(`[Downloader] Model file not found: ${filePath}`);
  }
};

/**
 * Verifica se modelo existe localmente
 */
export const isModelDownloaded = async (modelId: string): Promise<boolean> => {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model) return false;

  const filePath = await resolveModelPath(modelId);
  const validation = await ensureModelReady(filePath, model.sizeBytes, model.sha256);
  return validation.isValid;
};

/**
 * Retorna caminho do modelo se existir e for válido
 */
export const getModelPath = async (modelId: string): Promise<string | null> => {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model) return null;

  const filePath = await resolveModelPath(modelId);
  const validation = await ensureModelReady(filePath, model.sizeBytes, model.sha256);
  return validation.isValid ? filePath : null;
};
