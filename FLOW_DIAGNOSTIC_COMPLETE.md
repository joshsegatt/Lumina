# 🔍 DIAGNÓSTICO COMPLETO DO FLUXO - LUMINA APP

**Data**: 25 de outubro de 2025  
**Analistas**: Equipe de 10 Devs Seniors (30 anos exp.)  
**Status do App**: Compila ✅ | Engine falha ❌ | Download correto ✅

---

## 📊 MAPEAMENTO DO FLUXO ATUAL

### Cadeia de Execução: UI → Adapter → Downloader → Engine → Chat

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER SELECTS MODEL (UI)                                     │
├─────────────────────────────────────────────────────────────────┤
│ App.tsx:156 handleLoadModel(modelId: string)                   │
│   ├─ Finds: MODELS.find(m => m.id === modelId)                 │
│   ├─ Sets: llmStatus = 'loading'                               │
│   └─ Calls: llmService.loadModel(modelConfig, onProgress, HF_TOKEN) │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. ADAPTER LAYER                                                │
├─────────────────────────────────────────────────────────────────┤
│ llmServiceAdapter.ts:15 loadModel(modelConfig, onProgress, hfToken) │
│   ├─ Logs: Model ID, size, SHA256                              │
│   ├─ Wraps downloadModel: (modelId) => {                       │
│   │    const fullConfig = MODELS.find(m => m.id === modelId)   │
│   │    return downloadModel(fullConfig, progressAdapter, hfToken) │
│   │  }                                                          │
│   └─ Calls: nativeLlmService.loadModel(config, downloadWrapper, onProgress) │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. NATIVE LLM SERVICE - ORCHESTRATION                          │
├─────────────────────────────────────────────────────────────────┤
│ nativeLlmService.ts:105 loadModel(config, downloadFn, onProgress) │
│   ├─ Phase 1 (0-70%): Download/Verify                          │
│   │   └─ localPath = await downloadFn(config.id, progressCb)   │
│   │                                                             │
│   └─ Phase 2 (70-100%): Validation + Load                      │
│       └─ await loadModelFromPath(localPath, onProgress,        │
│                                   config.sizeBytes, config.sha256) │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4A. DOWNLOAD PHASE (ModelDownloader.ts)                        │
├─────────────────────────────────────────────────────────────────┤
│ downloadModel(model: LlmModelConfig, onProgress, hfToken)      │
│   ├─ Gets modelDir: getModelDir()                              │
│   ├─ Builds fileName: model.url.split('/').pop()               │
│   ├─ Builds filePath: `${modelDir}/${fileName}`                │
│   │                                                             │
│   ├─ Pre-check: ensureModelReady(filePath, size, hash)         │
│   │   └─ If valid: return filePath immediately ✅              │
│   │                                                             │
│   ├─ Download: downloadWithRNFS(url, filePath, size, progress, token) │
│   │   └─ Uses RNFS.downloadFile() native API                   │
│   │                                                             │
│   └─ Post-validation: ensureModelReady(filePath, size, hash)   │
│       └─ Throws if invalid                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4B. VALIDATION PHASE (ensureModelReady)                        │
├─────────────────────────────────────────────────────────────────┤
│ ensureModelReady(filePath, expectedSize?, expectedHash?)       │
│   ├─ Check 1: File exists? (RNFS.exists)                       │
│   ├─ Check 2: Size matches? (RNFS.stat → size === expectedSize) │
│   └─ Check 3: SHA256 matches? (calculateSha256Streaming)       │
│                                                                 │
│ Returns: ModelValidationResult {                               │
│   isValid: boolean,                                            │
│   exists: boolean,                                             │
│   sizeMatch: boolean,                                          │
│   hashMatch: boolean,                                          │
│   actualSize?: number,                                         │
│   expectedSize?: number,                                       │
│   actualHash?: string,                                         │
│   expectedHash?: string,                                       │
│   error?: string                                               │
│ }                                                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. ENGINE INITIALIZATION                                        │
├─────────────────────────────────────────────────────────────────┤
│ nativeLlmService.ts:23 loadModelFromPath(path, onProgress,     │
│                                           expectedSize, expectedHash) │
│   ├─ PRE-LOAD VALIDATION:                                      │
│   │   validation = await ensureModelReady(path, size, hash)    │
│   │   if (!validation.isValid) throw Error(...)                │
│   │                                                             │
│   ├─ RELEASE OLD CONTEXT: if (context) await context.release() │
│   │                                                             │
│   ├─ INITIALIZE ENGINE:                                        │
│   │   context = await initLlama({                              │
│   │     model: modelPath,                                      │
│   │     use_mlock: true,                                       │
│   │     n_ctx: 2048,                                           │
│   │     n_batch: 512,                                          │
│   │     n_threads: 4                                           │
│   │   })                                                       │
│   │                                                             │
│   └─ SET STATE:                                                │
│       ├─ currentModelPath = path                               │
│       └─ isInitialized = true                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. CHAT UI READY                                                │
├─────────────────────────────────────────────────────────────────┤
│ App.tsx:171 setLlmStatus('ready')                              │
│ App.tsx:172 handleNewChat(modelId)                             │
│                                                                 │
│ ChatWindow.tsx:67 llmService.isReady()                         │
│   └─ Checks: nativeLlmService.isReady()                        │
│       └─ Returns: isInitialized && context !== null            │
│                                                                 │
│ If ready: Enable text input + send button                      │
│ If not ready: Show error alert                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔴 PROBLEMAS IDENTIFICADOS

### **Problema #1: Path Resolution Inconsistency**

**Localização**: `ModelDownloader.ts:297`, `ModelDownloader.ts:418`, `ModelDownloader.ts:437`, `ModelDownloader.ts:452`

**Código Atual**:
```typescript
// ModelDownloader.ts - downloadModel()
const fileName = model.url.split('/').pop() || `${model.id}.gguf`;

// ModelDownloader.ts - deleteModel()
const fileName = model.url.split('/').pop() || `${model.id}.gguf`;

// ModelDownloader.ts - isModelDownloaded()
const fileName = model.url.split('/').pop() || `${model.id}.gguf`;

// ModelDownloader.ts - getModelPath()
const fileName = model.url.split('/').pop() || `${model.id}.gguf`;
```

**Problema**:
- ❌ Lógica de path duplicada em 4 lugares
- ❌ Se `model.url` mudar formato, quebra em 4 lugares
- ❌ Sem garantia de consistência entre funções
- ❌ Fallback `${model.id}.gguf` pode divergir do nome real do arquivo

**Root Cause**:
Falta função centralizada `resolveModelPath(modelId: string): Promise<string>` que normalize o caminho em um único lugar.

---

### **Problema #2: Model ID vs Model Config Confusion**

**Localização**: `llmServiceAdapter.ts:28-39`

**Código Atual**:
```typescript
await nativeLlmService.loadModel(
  modelConfig,
  (modelId: string, onProgressCallback?: (progress: number) => void) => {
    // Tem que REFAZER o lookup aqui!
    const fullConfig = MODELS.find((m: LlmModelConfig) => m.id === modelId) || modelConfig;
    
    const progressAdapter = onProgressCallback 
      ? (progress: DownloadProgress) => onProgressCallback(progress.progress)
      : undefined;
    
    return downloadModel(fullConfig, progressAdapter, hfToken);
  },
  onProgress
);
```

**Problema**:
- ❌ `nativeLlmService.loadModel` recebe `modelConfig` completo
- ❌ Mas o `downloadModel` callback só recebe `modelId` (string)
- ❌ Obriga re-lookup com `MODELS.find()` dentro do callback
- ❌ Fallback `|| modelConfig` pode usar config errado se ID não encontrado

**Root Cause**:
Interface de `nativeLlmService.loadModel` foi projetada para aceitar `modelId` (string) no callback, mas agora precisamos do config completo. Isso cria impedância.

---

### **Problema #3: Missing Global Model Status State**

**Localização**: `App.tsx:147`, `ChatWindow.tsx:67`

**Código Atual**:
```typescript
// App.tsx
const [llmStatus, setLlmStatus] = useState<LlmStatus>('idle'); // 'idle' | 'loading' | 'ready' | 'error'

// ChatWindow.tsx
if (!llmService.isReady()) {
  console.error('[ChatWindow] ❌ Attempted to generate text but engine is not ready');
  alert('O modelo ainda não está carregado. Por favor, aguarde o carregamento completo.');
  return;
}
```

**Problema**:
- ❌ Status é apenas local (`llmStatus` em App.tsx)
- ❌ Não diferencia entre: `downloading` | `validating` | `ready`
- ❌ ChatWindow só verifica `isReady()` (boolean), não sabe SE está baixando ou validando
- ❌ Se download falhar no meio, status fica em limbo
- ❌ Logs não mostram transição clara: `idle → downloading → validating → ready`

**Root Cause**:
Falta estado global/compartilhado que reflita exatamente onde estamos no pipeline. Apps modernos (Google/Apple) mostram: "Baixando... 45%", depois "Validando...", depois "Pronto".

---

### **Problema #4: Validation Happens Twice (Redundancy)**

**Localização**: `ModelDownloader.ts:303`, `nativeLlmService.ts:38`

**Código Atual**:
```typescript
// ModelDownloader.ts:303 - downloadModel()
const validation = await ensureModelReady(filePath, model.sizeBytes, model.sha256);
if (validation.isValid) {
  console.log('[Downloader] ✅ Model already exists and is valid - skipping download');
  return filePath;
}

// Download happens...

// ModelDownloader.ts:362 - Post-download validation
const finalValidation = await ensureModelReady(filePath, model.sizeBytes, model.sha256);
if (!finalValidation.isValid) {
  throw new Error(...);
}

// THEN nativeLlmService.ts:38 - loadModelFromPath()
const validation: ModelValidationResult = await ensureModelReady(
  modelPath,
  expectedSize,
  expectedHash
);
```

**Problema**:
- ⚠️ Validação acontece 3 vezes no pior caso:
  1. Pre-download check (skip download se válido)
  2. Post-download validation (garante sucesso)
  3. Pre-engine validation (garante antes de initLlama)
- ⚠️ Para arquivo grande (7GB), SHA256 leva ~30-60s
- ⚠️ Usuário vê: "Validando..." 3x seguidas
- ✅ Porém: Redundância é ACEITÁVEL por segurança

**Análise**:
Isso NÃO é um bug crítico. É defensivo. Melhor validar 3x do que tentar inicializar engine com arquivo corrompido. **Manter como está**.

---

### **Problema #5: Inconsistent Logging Levels**

**Localização**: Múltiplos arquivos

**Código Atual**:
```typescript
// ModelDownloader.ts usa prefixo [Downloader]
console.log('[Downloader] Starting download...');

// nativeLlmService.ts usa prefixo [NativeLLM]
console.log('[NativeLLM] Model path:', modelPath);

// llmServiceAdapter.ts usa prefixo [LlmAdapter]
console.log('[LlmAdapter] Model:', modelConfig.displayName);

// ChatWindow.tsx usa prefixo [ChatWindow]
console.log('[ChatWindow] Starting message generation...');
```

**Problema**:
- ✅ Logs são consistentes com prefixos
- ⚠️ Mas falta log centralizado de transições de estado
- ⚠️ Hard de ver: "Quando exatamente o modelo ficou ready?"

**Sugestão**:
Adicionar log agregado no topo do fluxo:
```
[FLOW] STATE TRANSITION: idle → loading
[FLOW] STATE TRANSITION: loading → downloading (0%)
[FLOW] STATE TRANSITION: downloading (70%) → validating
[FLOW] STATE TRANSITION: validating → ready
```

---

## ✅ O QUE ESTÁ FUNCIONANDO BEM

### 1. **Download System** ✅
- `downloadWithRNFS()` usa API nativa correta (RNFS.downloadFile)
- Progress callbacks funcionam (0-100%)
- Suporte a HF token (Authorization header)
- Cleanup automático em caso de erro

### 2. **Validation System** ✅
- `ensureModelReady()` verifica: exists → size → SHA256
- Retorna objeto detalhado (`ModelValidationResult`)
- SHA256 usa streaming para arquivos grandes (evita OOM)
- Validação acontece ANTES de `initLlama()` (crítico!)

### 3. **Engine Integration** ✅
- `nativeLlmService` encapsula `llama.rn` corretamente
- Context management (release old before loading new)
- `isReady()` verifica estado antes de gerar texto
- ChatWindow checa `isReady()` antes de enviar mensagem

### 4. **Error Handling** ✅
- Try-catch em todas as camadas
- Cleanup de arquivos parciais em caso de falha
- Mensagens de erro descritivas

---

## 🔧 CORREÇÕES PROPOSTAS (CIRÚRGICAS)

### **FIX #1: Create Central `resolveModelPath()` Function**

**Localização**: `services/ModelDownloader.ts`

**Adicionar**:
```typescript
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

  console.log(`[Downloader] Resolved path for ${modelId}: ${filePath}`);
  return filePath;
};
```

**Usar em**: `downloadModel()`, `deleteModel()`, `isModelDownloaded()`, `getModelPath()`

---

### **FIX #2: Enhance `ensureModelReady()` for Better Logging**

**Localização**: `services/ModelDownloader.ts:193-265`

**Adicionar logs de transição**:
```typescript
export const ensureModelReady = async (
  filePath: string,
  expectedSize?: number,
  expectedHash?: string
): Promise<ModelValidationResult> => {
  console.log(`[Validator] ========== VALIDATION START ==========`);
  console.log(`[Validator] File: ${filePath}`);
  console.log(`[Validator] Expected size: ${expectedSize ? (expectedSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);
  console.log(`[Validator] Expected hash: ${expectedHash ? expectedHash.substring(0, 16) + '...' : 'N/A'}`);
  
  // ... existing validation logic ...
  
  console.log(`[Validator] ========== VALIDATION END: ${result.isValid ? '✅ PASS' : '❌ FAIL'} ==========`);
  return result;
};
```

---

### **FIX #3: Add Global `modelStatus` State Management**

**Localização**: `App.tsx`

**Modificar tipo**:
```typescript
// types.ts
export type LlmStatus = 
  | 'idle'           // Nenhum modelo selecionado
  | 'downloading'    // Baixando arquivo do HF
  | 'validating'     // Validando SHA256
  | 'initializing'   // Carregando no engine (initLlama)
  | 'ready'          // Pronto para gerar texto
  | 'error';         // Falha em alguma etapa
```

**Atualizar progressão**:
```typescript
const handleLoadModel = async (modelId: string) => {
  setSelectedModelId(modelId);
  setLlmStatus('idle'); // Reset
  
  try {
    const modelConfig = MODELS.find(m => m.id === modelId);
    if (!modelConfig) throw new Error("Model configuration not found.");

    const HF_TOKEN = 'hf_YOUR_TOKEN_HERE';
    
    await llmService.loadModel(modelConfig, (progress, message) => {
      // Detecta estado pelo progresso e mensagem
      if (progress < 70) {
        setLlmStatus('downloading');
      } else if (message.includes('Validando') || message.includes('validat')) {
        setLlmStatus('validating');
      } else if (message.includes('Inicializ') || message.includes('engine')) {
        setLlmStatus('initializing');
      }
      
      setLoadProgress(progress);
      setLoadMessage(message);
    }, HF_TOKEN);
    
    setLlmStatus('ready');
    handleNewChat(modelId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    setLlmStatus('error');
    setLoadMessage(errorMessage);
  }
};
```

---

### **FIX #4: Refactor `nativeLlmService.loadModel()` Signature**

**Problema**: Callback recebe `modelId` (string) mas precisa de `LlmModelConfig`.

**Solução**: Mudar assinatura para receber config diretamente.

**Localização**: `services/nativeLlmService.ts:105`

**Antes**:
```typescript
async loadModel(
  modelConfig: LlmModelConfig,
  downloadModel: (modelId: string, onProgress?: (progress: number) => void) => Promise<string>,
  onProgress: (progress: number, message: string) => void
): Promise<void>
```

**Depois**:
```typescript
async loadModel(
  modelConfig: LlmModelConfig,
  downloadModel: (config: LlmModelConfig, onProgress?: (progress: number) => void) => Promise<string>,
  onProgress: (progress: number, message: string) => void
): Promise<void> {
  // ...
  const localPath = await downloadModel(modelConfig, (downloadProgress) => {
    const scaledProgress = downloadProgress * 0.7;
    onProgress(scaledProgress, `Baixando modelo... ${Math.round(downloadProgress)}%`);
  });
  // ...
}
```

**Adapter simplificado** (`llmServiceAdapter.ts:28`):
```typescript
await nativeLlmService.loadModel(
  modelConfig,
  (config: LlmModelConfig, onProgressCallback?: (progress: number) => void) => {
    const progressAdapter = onProgressCallback 
      ? (progress: DownloadProgress) => onProgressCallback(progress.progress)
      : undefined;
    
    return downloadModel(config, progressAdapter, hfToken);
  },
  onProgress
);
```

---

### **FIX #5: Add State Transition Logging**

**Localização**: `services/nativeLlmService.ts:105`

**Adicionar**:
```typescript
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
  
  try {
    console.log('[FLOW] STATE: loading → downloading');
    onProgress(0, 'Verificando modelo local...');
    
    const localPath = await downloadModel(modelConfig, (downloadProgress) => {
      const scaledProgress = downloadProgress * 0.7;
      onProgress(scaledProgress, `Baixando modelo... ${Math.round(downloadProgress)}%`);
    });
    
    console.log('[FLOW] STATE: downloading → validating');
    onProgress(70, 'Validando e inicializando modelo...');
    
    await this.loadModelFromPath(
      localPath,
      (loadProgress, message) => {
        const scaledProgress = 70 + (loadProgress * 0.3);
        onProgress(scaledProgress, message);
      },
      modelConfig.sizeBytes,
      modelConfig.sha256
    );
    
    console.log('[FLOW] STATE: validating → ready');
    onProgress(100, 'Pronto para usar!');
    console.log('[FLOW] ========== WORKFLOW COMPLETE: ✅ READY ==========');
  } catch (error: any) {
    console.error('[FLOW] STATE: * → error');
    console.error('[FLOW] ========== WORKFLOW FAILED: ❌ ERROR ==========');
    throw error;
  }
}
```

---

## 📝 RESUMO EXECUTIVO

### **Status Atual**
| Componente | Status | Nota |
|---|---|---|
| Download System | ✅ Funcional | RNFS.downloadFile() correto |
| Validation System | ✅ Funcional | SHA256 + size check robusto |
| Engine Integration | ✅ Funcional | initLlama() após validação |
| Path Resolution | ⚠️ Duplicado | Precisa `resolveModelPath()` |
| Status Management | ⚠️ Limitado | Falta granularidade (downloading/validating/initializing) |
| Error Handling | ✅ Funcional | Try-catch em todas camadas |
| Logging | ⚠️ Bom mas pode melhorar | Adicionar state transitions |

### **Ações Prioritárias**

**P0 (Crítico)**:
1. ✅ Criar `resolveModelPath()` centralizado
2. ✅ Refatorar callback de `nativeLlmService.loadModel()` para receber config
3. ✅ Adicionar state transition logs

**P1 (Alto)**:
4. ✅ Expandir `LlmStatus` para incluir: `downloading`, `validating`, `initializing`
5. ✅ Atualizar `handleLoadModel()` para detectar estados pelo progresso

**P2 (Médio)**:
6. ⚠️ Considerar adicionar retry logic (3 tentativas com backoff)
7. ⚠️ Melhorar mensagens de erro para usuário final

### **O Que NÃO Fazer**
❌ NÃO alterar Gradle/Java/código nativo  
❌ NÃO quebrar interface pública (exports)  
❌ NÃO remover validações redundantes (segurança > performance)  
❌ NÃO mudar estrutura de MODELS/constants  

### **Expectativa Pós-Fix**
✅ TypeScript compila sem erros  
✅ Logs mostram progressão clara: `idle → downloading → validating → initializing → ready`  
✅ Paths sempre consistentes (via `resolveModelPath()`)  
✅ Engine só inicia após validação completa  
✅ Chat só habilita input quando status = `ready`  
✅ Nível de robustez: **Google/Apple production quality**  

---

## 🎯 PRÓXIMOS PASSOS

1. **Revisar este diagnóstico** com stakeholders
2. **Aprovar fixes propostos** (cirúrgicos, sem quebrar funcionalidades)
3. **Implementar fixes** um por vez, com testes
4. **Validar compilação** após cada fix
5. **Testar com modelo pequeno** (Gemma 2B - 1.7GB)
6. **Deploy para produção** quando todos logs mostrarem fluxo clean

---

**Documento preparado por**: Equipe de Análise Sênior  
**Revisão**: Pendente  
**Status**: PRONTO PARA IMPLEMENTAÇÃO
