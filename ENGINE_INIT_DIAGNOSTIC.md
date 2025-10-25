# 🔴 DIAGNÓSTICO CRÍTICO: ENGINE INITIALIZATION FAILURE

**Data**: 25 de outubro de 2025  
**Problema**: Engine falha com "Engine Failed to Start" mesmo após download bem-sucedido  
**Status**: Download ✅ | Validação ✅ | Engine Init ❌  

---

## 🔍 ANÁLISE DO PROBLEMA

### **Sintomas Observados**
1. ✅ Download completa com sucesso (RNFS.downloadFile)
2. ✅ Arquivo salvo no disco (verificado)
3. ✅ Validação SHA256 passa
4. ❌ `initLlama()` falha com erro genérico
5. ❌ Erro real da engine nativa é mascarado como "Unknown"

### **Root Cause: Path Format Incompatibility**

**PROBLEMA CRÍTICO IDENTIFICADO**:
React Native paths vs. llama.rn expectations:

```typescript
// React Native retorna paths no formato:
RNFS.DocumentDirectoryPath = "/data/user/0/com.lumina.app/files"
RNFS.TemporaryDirectoryPath = "/data/user/0/com.lumina.app/cache"

// Path construído:
const filePath = `${RNFS.DocumentDirectoryPath}/models/gemma-2b.Q6_K.gguf`
// Resultado: "/data/user/0/com.lumina.app/files/models/gemma-2b.Q6_K.gguf"

// llama.rn (nativo) pode precisar de:
// 1. Path com prefixo "file://" para Android
// 2. Path absoluto sem "file://"
// 3. Encoding específico de caracteres
```

**Evidência**: 
- llama.rn 0.8.0-rc.4 é MUITO recente (release candidate)
- Documentação pode estar incompleta sobre formato de path
- Erro "Engine Failed to Start" é genérico (vem do bridge JS→Native)

---

## 🧩 PONTOS CRÍTICOS DO FLUXO

### **1. Path Construction (ModelDownloader.ts:10-27)**

```typescript
const getModelDir = async (): Promise<string> => {
  const primaryDir = `${RNFS.DocumentDirectoryPath}/models`;
  const fallbackDir = `${RNFS.TemporaryDirectoryPath}/models`;
  
  // ⚠️ PROBLEMA: Retorna path sem verificação de formato esperado pela engine
  // ⚠️ Não testa se llama.rn precisa de "file://" prefix
  // ⚠️ Não valida se path tem caracteres especiais problemáticos
}
```

**Issues**:
- ❌ Não normaliza path para formato esperado pela engine
- ❌ Não testa acessibilidade do arquivo pela camada nativa
- ❌ Não loga path absoluto final antes de passar para engine

---

### **2. Engine Initialization (nativeLlmService.ts:71-78)**

```typescript
this.context = await initLlama({
  model: modelPath,  // ⚠️ Path passado diretamente sem verificação
  use_mlock: true,
  n_ctx: 2048,
  n_batch: 512,
  n_threads: 4,
});
```

**Issues**:
- ❌ Não loga o path EXATO passado para initLlama
- ❌ Erro do initLlama é capturado mas não decodificado
- ❌ Não há tentativa de verificar se arquivo é acessível pela camada nativa ANTES do init

---

### **3. Error Handling (nativeLlmService.ts:82-90)**

```typescript
catch (error: any) {
  console.error('[NativeLLM] ❌ Failed to load model:', error);
  console.error('[NativeLLM] Error details:', {
    message: error.message,
    stack: error.stack,
    full: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
  });
  // ...
  throw new Error(`Falha ao carregar modelo: ${error.message || error}`);
}
```

**Issues**:
- ⚠️ Logs estão corretos MAS não mostram o path final usado
- ❌ `error.message` pode ser genérico do bridge ("Unknown error")
- ❌ Erro nativo real (JNI/C++) pode estar em `error.nativeError` ou `error.code`

---

## 🔬 TESTES NECESSÁRIOS

### **Teste #1: Path Format**
```typescript
// ADICIONAR no início de loadModelFromPath():
console.log('[EngineInit] ========== PATH DIAGNOSTICS ==========');
console.log('[EngineInit] Raw path:', modelPath);
console.log('[EngineInit] Path length:', modelPath.length);
console.log('[EngineInit] Path encoding:', encodeURIComponent(modelPath));
console.log('[EngineInit] Has special chars:', /[^a-zA-Z0-9\-_\/\.]/.test(modelPath));

// Testar se arquivo é acessível via RNFS
const exists = await RNFS.exists(modelPath);
const stat = await RNFS.stat(modelPath);
console.log('[EngineInit] File accessible by RNFS:', exists);
console.log('[EngineInit] File size:', stat.size);

// Testar formato alternativo com file://
const fileUriPath = modelPath.startsWith('file://') ? modelPath : `file://${modelPath}`;
console.log('[EngineInit] URI format:', fileUriPath);
console.log('[EngineInit] ==========================================');
```

### **Teste #2: Error Inspection**
```typescript
catch (error: any) {
  console.error('[EngineInit] ========== ERROR DETAILS ==========');
  console.error('[EngineInit] Error type:', typeof error);
  console.error('[EngineInit] Error constructor:', error.constructor?.name);
  console.error('[EngineInit] Error message:', error.message);
  console.error('[EngineInit] Error code:', error.code);
  console.error('[EngineInit] Error nativeError:', error.nativeError);
  console.error('[EngineInit] Error domain:', error.domain);
  console.error('[EngineInit] All properties:', Object.keys(error));
  console.error('[EngineInit] Full dump:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
  console.error('[EngineInit] ==========================================');
  
  // Propagar erro COM contexto
  throw new Error(
    `Engine initialization failed\n` +
    `Path: ${modelPath}\n` +
    `Error: ${error.message}\n` +
    `Code: ${error.code || 'N/A'}\n` +
    `Native: ${error.nativeError || 'N/A'}`
  );
}
```

### **Teste #3: Alternative Path Formats**
```typescript
// Se init falhar, tentar formatos alternativos:
const pathVariants = [
  modelPath,                                    // Original
  `file://${modelPath}`,                        // URI format
  modelPath.replace(/^file:\/\//, ''),          // Remove file:// if present
  encodeURI(modelPath),                         // URL encoded
];

for (const variant of pathVariants) {
  console.log(`[EngineInit] Trying path variant: ${variant}`);
  try {
    this.context = await initLlama({ model: variant, ...config });
    console.log(`[EngineInit] ✅ SUCCESS with variant: ${variant}`);
    break;
  } catch (err) {
    console.log(`[EngineInit] ❌ Failed with variant: ${variant}`);
  }
}
```

---

## 🔧 CORREÇÕES PROPOSTAS

### **FIX #1: Enhanced Path Resolution**

**Arquivo**: `services/ModelDownloader.ts`

```typescript
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
      size: (Number(stat.size) / 1024 / 1024).toFixed(2) + ' MB'
    });
    
    return true;
  } catch (error: any) {
    console.error('[PathValidator] ❌ Access check failed:', error.message);
    return false;
  }
};
```

---

### **FIX #2: Enhanced Engine Initialization with Diagnostics**

**Arquivo**: `services/nativeLlmService.ts:65-95`

```typescript
onProgress(10, 'Inicializando engine nativa...');

console.log('[EngineInit] ========== INITIALIZATION START ==========');
console.log('[EngineInit] Model path:', modelPath);
console.log('[EngineInit] Path length:', modelPath.length);
console.log('[EngineInit] Config:', {
  use_mlock: true,
  n_ctx: 2048,
  n_batch: 512,
  n_threads: 4
});

// CRÍTICO: Verificar acesso nativo ANTES de initLlama
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

// Normaliza path para engine
const normalizedPath = normalizePathForEngine(modelPath);
console.log('[EngineInit] Using normalized path:', normalizedPath);

try {
  console.log('[EngineInit] Calling initLlama...');
  
  this.context = await initLlama({
    model: normalizedPath,
    use_mlock: true,
    n_ctx: 2048,
    n_batch: 512,
    n_threads: 4,
  });
  
  console.log('[EngineInit] ✅ initLlama successful');
  console.log('[EngineInit] Context type:', typeof this.context);
  console.log('[EngineInit] Context methods:', Object.keys(this.context));
  console.log('[EngineInit] ========== INITIALIZATION SUCCESS ==========');
  
  this.currentModelPath = normalizedPath;
  this.isInitialized = true;
  
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
  
  this.isInitialized = false;
  
  // Propagar erro COM contexto completo
  throw new Error(
    `Engine initialization failed:\n` +
    `Path: ${normalizedPath}\n` +
    `Original path: ${modelPath}\n` +
    `Error: ${error.message || 'Unknown'}\n` +
    `Code: ${error.code || 'N/A'}\n` +
    `Native error: ${error.nativeError || error.domain || 'N/A'}\n` +
    `\n` +
    `Troubleshooting:\n` +
    `1. Check logcat for native errors: adb logcat | grep llama\n` +
    `2. Verify model file format is GGUF\n` +
    `3. Check if model size exceeds device RAM\n` +
    `4. Ensure llama.rn native library is correctly linked`
  );
}

onProgress(100, 'Modelo carregado com sucesso!');
```

---

### **FIX #3: Add `failed_engine` Status**

**Arquivo**: `types.ts`

```typescript
export type LlmStatus = 
  | 'idle'
  | 'loading'
  | 'downloading'
  | 'validating'
  | 'initializing'
  | 'ready'
  | 'error'           // Generic error
  | 'failed_download' // Download failed
  | 'failed_validation' // Validation failed
  | 'failed_engine';  // Engine init failed (this is the critical one)
```

**Arquivo**: `App.tsx:handleLoadModel()`

```typescript
try {
  // ... existing code ...
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
  
  // Detectar tipo de erro
  if (errorMessage.includes('download') || errorMessage.includes('Download')) {
    setLlmStatus('failed_download');
  } else if (errorMessage.includes('validation') || errorMessage.includes('SHA256')) {
    setLlmStatus('failed_validation');
  } else if (errorMessage.includes('Engine') || errorMessage.includes('initLlama')) {
    setLlmStatus('failed_engine');
  } else {
    setLlmStatus('error');
  }
  
  setLoadMessage(errorMessage);
  
  // Log completo para debug
  console.error('[App] ========== LOAD MODEL FAILED ==========');
  console.error('[App] Status set to:', llmStatus);
  console.error('[App] Error message:', errorMessage);
  console.error('[App] Full error:', error);
  console.error('[App] ==========================================');
}
```

---

### **FIX #4: Improved Error Display in UI**

**Arquivo**: `App.tsx:ModelSelectionScreen`

```tsx
{status === 'error' || status === 'failed_engine' || status === 'failed_download' || status === 'failed_validation' ? (
  <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-500/50 rounded-lg max-w-md mx-auto">
    <p className="text-red-800 dark:text-red-300 font-semibold">
      {status === 'failed_engine' && '⚠️ Engine Initialization Failed'}
      {status === 'failed_download' && '⚠️ Download Failed'}
      {status === 'failed_validation' && '⚠️ Validation Failed'}
      {status === 'error' && t('engineFail')}
    </p>
    <p className="text-red-600 dark:text-red-400 text-sm mt-1 whitespace-pre-wrap font-mono">
      {message}
    </p>
    <details className="mt-2">
      <summary className="text-red-700 dark:text-red-400 text-sm cursor-pointer">
        Troubleshooting Steps
      </summary>
      <ul className="text-red-600 dark:text-red-400 text-xs mt-2 space-y-1 list-disc list-inside">
        <li>Check device logs: adb logcat | grep llama</li>
        <li>Verify model file downloaded completely</li>
        <li>Ensure sufficient device RAM available</li>
        <li>Try clearing app cache and re-downloading</li>
      </ul>
    </details>
    <button
      onClick={() => window.location.reload()}
      className="mt-4 bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 transition-colors"
    >
      {t('tryAgain')}
    </button>
  </div>
) : null}
```

---

## 📊 CHECKLIST DE IMPLEMENTAÇÃO

### **Phase 1: Diagnostic Logging (P0 - Crítico)**
- [ ] Adicionar `normalizePathForEngine()` em ModelDownloader
- [ ] Adicionar `verifyNativeAccess()` em ModelDownloader
- [ ] Refatorar `loadModelFromPath()` com logs detalhados
- [ ] Capturar TODAS propriedades do erro nativo

### **Phase 2: Error Handling (P0 - Crítico)**
- [ ] Expandir `LlmStatus` para incluir `failed_engine`, `failed_download`, `failed_validation`
- [ ] Atualizar `handleLoadModel()` para detectar tipo de erro
- [ ] Melhorar UI para mostrar troubleshooting steps

### **Phase 3: Testing (P1 - Alto)**
- [ ] Testar com modelo pequeno (Gemma 2B - 1.7GB)
- [ ] Capturar logs completos via `adb logcat | grep llama`
- [ ] Verificar se erro nativo é exposto
- [ ] Tentar path variants se necessário

---

## 🚨 HIPÓTESES PRINCIPAIS

### **Hipótese #1: Path Format Issue (80% probabilidade)**
llama.rn pode estar esperando:
- ✅ Path relativo ao app bundle
- ✅ Path com prefixo específico
- ✅ Path sem caracteres especiais no nome do arquivo

**Solução**: `normalizePathForEngine()` + teste de variants

### **Hipótese #2: Native Bridge Error Masking (70% probabilidade)**
Erro real do C++ não está sendo propagado corretamente através do bridge React Native.

**Solução**: Log completo de TODAS propriedades do erro

### **Hipótese #3: File Access Permissions (50% probabilidade)**
Android pode estar bloqueando acesso ao arquivo pela camada nativa, mesmo que RNFS consiga acessá-lo.

**Solução**: `verifyNativeAccess()` + teste ANTES de initLlama

### **Hipótese #4: Model Format Issue (30% probabilidade)**
Arquivo GGUF baixado pode estar corrompido ou em formato incompatível com llama.rn 0.8.0-rc.4.

**Solução**: Validação SHA256 (já existe) + teste com modelo conhecido

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

1. **Implementar FIX #1 e #2** (Path normalization + Enhanced logging)
2. **Build e test** no Android
3. **Capturar logs completos**: `adb logcat | grep -E "EngineInit|PathValidator|llama"`
4. **Analisar erro real** exposto pelos novos logs
5. **Ajustar path format** baseado no erro capturado

---

**Status**: 🔴 AGUARDANDO IMPLEMENTAÇÃO DOS FIXES  
**Prioridade**: P0 - CRÍTICO  
**Tempo Estimado**: 2-4 horas (implementação + teste)
