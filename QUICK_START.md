# ⚡ GUIA RÁPIDO: Ativar LLM Nativo

## 🎯 Mudança Necessária: 1 linha de código

### PASSO ÚNICO:

Abra o arquivo `App.tsx` e localize a linha 5:

**ANTES:**
```typescript
import { llmService } from './services/llmService';
```

**DEPOIS:**
```typescript
import { llmService } from './services/llmServiceAdapter';
```

**Pronto!** O resto do código funciona exatamente igual.

---

## 🧪 Como Testar

### 1. Compile o app:
```bash
npm run build
```

### 2. Sincronize com Capacitor:
```bash
npx cap sync android
```

### 3. Abra no Android Studio:
```bash
npx cap open android
```

### 4. Execute no dispositivo e observe:

**Console logs esperados:**
```
[Downloader] Starting download process for Phi-3.5 Mini Instruct (Q6_K)...
[Downloader] Download job starting...
[Downloader] Progress: 5%
[Downloader] Progress: 10%
...
[Downloader] Progress: 100%
[Downloader] File saved successfully. Starting SHA256 validation...
[Downloader] Validation successful for Phi-3.5 Mini Instruct (Q6_K)!
[NativeLLM] Loading model from path: /data/user/0/.../models/Phi-3.5-mini-instruct-Q6_K.gguf
[NativeLLM] Initializing llama context...
[NativeLLM] Model loaded successfully
```

---

## ✅ Checklist de Validação

- [ ] App compila sem erros
- [ ] App abre no dispositivo
- [ ] Download do modelo funciona
- [ ] Progresso é exibido corretamente
- [ ] SHA256 é validado
- [ ] Modelo carrega na memória
- [ ] Geração de texto funciona
- [ ] Resposta aparece na tela

---

## 🐛 Se algo der errado

### Erro de compilação?
```bash
# Limpe e reinstale
rm -rf node_modules
npm install
npx cap sync android
```

### App trava?
- Teste com modelo menor (Gemma 2B)
- Reduza `n_ctx` em `nativeLlmService.ts` (linha 26)

### Modelo não carrega?
- Verifique se o download completou (100%)
- Confirme que o SHA256 está correto
- Veja os logs do [NativeLLM]

---

## 📊 Diferença Esperada

**Performance**:
- WebLLM: ~2-5 tokens/segundo
- Nativo: ~10-30 tokens/segundo (5-10x mais rápido!)

**Memória**:
- WebLLM: Alto uso, possíveis crashes
- Nativo: Uso otimizado, mais estável

---

## 🎉 Sucesso!

Se você ver o modelo gerando texto rapidamente e de forma estável, **parabéns!** Sua migração para LLM nativo foi bem-sucedida.

**Próximo passo**: Teste com diferentes modelos e ajuste as configurações de performance conforme necessário.
