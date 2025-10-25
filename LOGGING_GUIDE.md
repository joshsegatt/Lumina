# 📊 LOGGING GUIDE - Production Debugging Handbook

**Purpose**: Comprehensive guide for logging, monitoring, and debugging Lumina in production.  
**Audience**: Developers, DevOps, Support Engineers  
**Last Updated**: October 25, 2025

---

## 🎯 LOGGING PHILOSOPHY

### **Principles**:
1. **Structured Logging**: Use consistent prefixes and formats
2. **Context-Rich**: Include relevant IDs, states, and user actions
3. **Severity Levels**: `console.log` (info), `console.warn` (warnings), `console.error` (errors)
4. **Performance-Aware**: Don't log excessively in tight loops
5. **Production-Safe**: No sensitive data (tokens, passwords, PII)

---

## 🏷️ LOG PREFIX STANDARDS

All logs follow this format: `[ComponentName] <emoji> Message`

### **Service Prefixes**:
```
[ConversationManager] - services/conversationManager.ts
[ThemeProvider]       - services/themeManager.ts
[LLMServiceAdapter]   - services/llmServiceAdapter.ts
[NativeLLMService]    - services/nativeLlmService.ts
[ModelDownloader]     - services/ModelDownloader.ts
[i18n]                - services/i18n.ts
```

### **Component Prefixes**:
```
[App]                 - App.tsx (main application)
[ChatWindow]          - components/ChatWindow.tsx
[HistoryScreen]       - components/HistoryScreen.tsx
[SettingsScreen]      - components/SettingsScreen.tsx
[TopBar]              - components/TopBar.tsx
```

### **Emoji Indicators** (Severity):
```
✅ - Success (operation completed)
⏳ - In Progress (operation started)
⚠️  - Warning (non-critical issue)
❌ - Error (critical failure)
🔍 - Debug (detailed info)
📦 - Data (showing data structures)
```

---

## 📝 LOG EXAMPLES BY SCENARIO

### **1. Conversation Management**

#### **Creating Conversation**:
```typescript
console.log('[ConversationManager] Creating conversation: conv-1730000000000-abc123');
console.log('[ConversationManager] ✅ Conversation saved to AsyncStorage');
```

#### **Loading Conversations**:
```typescript
console.log('[ConversationManager] ⏳ Loading conversations from AsyncStorage...');
console.log('[ConversationManager] ✅ Loaded 5 conversations from storage');
```

#### **Error Saving**:
```typescript
console.error('[ConversationManager] ❌ Failed to save conversations:', error);
```

#### **Max Conversations Reached**:
```typescript
console.warn('[ConversationManager] ⚠️ MAX_CONVERSATIONS (100) reached. Deleting oldest conversation.');
```

### **2. Model Download & Loading**

#### **Download Start**:
```typescript
console.log('[ModelDownloader] ⏳ Starting download: phi-3.5-mini-instruct-q4f16_1-MLC.gguf');
console.log('[ModelDownloader] Download URL: https://huggingface.co/...');
```

#### **Download Progress**:
```typescript
console.log('[ModelDownloader] Progress: 45% (768 MB / 1.7 GB)');
```

#### **Download Complete**:
```typescript
console.log('[ModelDownloader] ✅ Download complete: /data/models/phi-3.5-mini.gguf');
```

#### **Download Error**:
```typescript
console.error('[ModelDownloader] ❌ Download failed:', error.message);
console.error('[ModelDownloader] Retry attempt 2/3 in 4000ms...');
```

#### **Model Loading**:
```typescript
console.log('[NativeLLMService] ⏳ Initializing engine with model: phi-3.5-mini');
console.log('[NativeLLMService] ✅ Engine initialized successfully');
```

#### **Engine Error**:
```typescript
console.error('[NativeLLMService] ❌ Engine init failed:', error);
console.error('[NativeLLMService] Model path:', modelPath);
console.error('[NativeLLMService] Engine config:', config);
```

### **3. Theme Management**

#### **Theme Load**:
```typescript
console.log('[ThemeProvider] ⏳ Initializing theme...');
console.log('[ThemeProvider] ✅ Loaded theme from storage: dark');
```

#### **System Preference**:
```typescript
console.log('[ThemeProvider] Using system preference: light');
```

#### **Theme Save Error**:
```typescript
console.error('[ThemeProvider] ❌ Failed to save theme:', error);
```

### **4. Chat Messages**

#### **Sending Message**:
```typescript
console.log('[ChatWindow] Sending message (267 characters)');
console.log('[ChatWindow] ⏳ Generating AI response...');
```

#### **Response Received**:
```typescript
console.log('[ChatWindow] ✅ Response generated (512 tokens, 3.2s)');
```

#### **Generation Error**:
```typescript
console.error('[ChatWindow] ❌ Generation failed:', error);
```

---

## 🔍 FILTERING LOGS

### **Chrome DevTools** (Web):

#### **Filter by Component**:
```
[ConversationManager]  - See only conversation logs
[ModelDownloader]      - See only download logs
[App]                  - See only app-level logs
```

#### **Filter by Severity**:
```
✅  - See only success messages
❌  - See only errors
⚠️   - See only warnings
```

#### **Combine Filters**:
```
[ModelDownloader] ❌  - See download errors only
[App] ✅             - See app successes only
```

### **Android Logcat** (Native):

#### **Filter by Tag**:
```bash
adb logcat | findstr "Lumina"
adb logcat | findstr "ConversationManager"
adb logcat | findstr "ModelDownloader"
```

#### **Filter by Level**:
```bash
adb logcat *:E  # Errors only
adb logcat *:W  # Warnings and above
adb logcat *:I  # Info and above
```

#### **Combine**:
```bash
adb logcat | findstr "[ModelDownloader].*Error"
```

### **iOS Console** (Native):

```bash
# Open Console.app on Mac
# Filter by "Lumina" or specific component name
```

---

## 📋 COMMON ERROR PATTERNS

### **Error: "localStorage is not defined"**
```
[ConversationManager] ❌ Failed to load conversations: ReferenceError: localStorage is not defined
```
**Cause**: Running in React Native context without AsyncStorage  
**Solution**: Ensure AsyncStorage migration (FIX #1) is applied  
**Logs to Check**: `[ConversationManager]`, `[ThemeProvider]`

---

### **Error: "Model file not found"**
```
[NativeLLMService] ❌ Engine init failed: Error: Model file not found at /data/models/phi-3.5-mini.gguf
```
**Cause**: Model file download incomplete or path mismatch  
**Solution**: Check download completion, verify file exists  
**Logs to Check**: `[ModelDownloader]`, `[NativeLLMService]`

---

### **Error: "Network request failed"**
```
[ModelDownloader] ❌ Download failed: TypeError: Network request failed
```
**Cause**: No internet connection or rate limiting  
**Solution**: Check network, verify HF token, wait for retry  
**Logs to Check**: `[ModelDownloader]`, `[App]`

---

### **Error: "Unknown error occurred"**
```
[App] ❌ Unknown error occurred
```
**Cause**: Generic catch block without specific error handling  
**Solution**: Check surrounding logs for context, add more specific error handling  
**Logs to Check**: All components (search for logs around timestamp)

---

## 📊 PRODUCTION MONITORING

### **Key Metrics to Track**:

1. **Error Rate**:
   - Count of `❌` logs per hour
   - Alert if > 10 errors/hour

2. **Download Success Rate**:
   - Ratio of `[ModelDownloader] ✅` to `[ModelDownloader] ❌`
   - Alert if < 90%

3. **Average Response Time**:
   - Time between `⏳ Generating` and `✅ Response generated`
   - Alert if > 10 seconds

4. **Storage Operations**:
   - Count of `[ConversationManager] ❌ Failed to save`
   - Alert if > 5 failures/hour

### **Log Aggregation** (Optional):

If using a log aggregation service (e.g., Sentry, LogRocket, Datadog):

```typescript
// Example: Send errors to Sentry
import * as Sentry from "@sentry/react-native";

console.error('[App] ❌ Critical error:', error);
Sentry.captureException(error, {
  tags: { component: 'App' },
  contexts: { state: { llmStatus, selectedModelId } }
});
```

---

## 🛠️ DEBUGGING WORKFLOWS

### **Workflow 1: Model Won't Load**

1. **Check download completion**:
   ```
   Filter: [ModelDownloader] ✅
   Expected: "Download complete"
   ```

2. **Check file path**:
   ```
   Filter: [NativeLLMService] Model path
   Verify: Path matches downloaded file
   ```

3. **Check engine initialization**:
   ```
   Filter: [NativeLLMService] Engine init
   Expected: "Engine initialized successfully"
   ```

4. **If fails, check error**:
   ```
   Filter: [NativeLLMService] ❌
   Look for: Specific error message
   ```

### **Workflow 2: Conversations Not Persisting**

1. **Check save operation**:
   ```
   Filter: [ConversationManager] ✅ Conversation saved
   Expected: Log after each conversation action
   ```

2. **Check load operation**:
   ```
   Filter: [ConversationManager] Loaded.*conversations
   Expected: Log on app start
   ```

3. **If fails, check errors**:
   ```
   Filter: [ConversationManager] ❌
   Look for: Storage errors (AsyncStorage or localStorage)
   ```

### **Workflow 3: App Crashes on Startup**

1. **Check initialization logs**:
   ```
   Look for: [App], [ThemeProvider], [ConversationManager]
   Expected: All show "✅ Loaded" or "✅ Initialized"
   ```

2. **Check for unhandled exceptions**:
   ```
   Filter: ❌
   Look for: First error in log sequence
   ```

3. **Check Error Boundary**:
   ```
   Filter: [ErrorBoundary]
   Expected: Error caught and displayed
   ```

---

## 🧪 TESTING LOG OUTPUT

### **Manual Testing Checklist**:

- [ ] **Fresh Install**: Logs show initialization sequence
- [ ] **Create Conversation**: `[ConversationManager] Creating conversation`
- [ ] **Download Model**: `[ModelDownloader] Progress: X%` logs appear
- [ ] **Load Model**: `[NativeLLMService] ✅ Engine initialized`
- [ ] **Send Message**: `[ChatWindow] Sending message` → `✅ Response generated`
- [ ] **Change Theme**: `[ThemeProvider] ✅ Theme saved`
- [ ] **Delete Conversation**: `[ConversationManager] ✅ Conversation saved` (after delete)
- [ ] **Network Error**: `[ModelDownloader] ❌ Download failed` → `Retry attempt`

---

## 🚨 CRITICAL ALERTS

Set up monitoring for these log patterns (high priority):

| Log Pattern | Severity | Action |
|-------------|----------|--------|
| `[NativeLLMService] ❌ Engine init failed` | CRITICAL | Investigate immediately, blocks all AI features |
| `[ModelDownloader] ❌ Download failed` (3x) | HIGH | Check network, HF token, server status |
| `[ConversationManager] ❌ Failed to save` | MEDIUM | Check storage quotaAsyncStorage health |
| `❌.*Unknown error` | MEDIUM | Add specific error handling |
| `⚠️ MAX_CONVERSATIONS` | LOW | Normal behavior (LRU eviction) |

---

## 📖 LOG REFERENCE CARD

**Quick reference for support engineers**:

```
PREFIX                   | COMPONENT
-------------------------|-------------------------
[App]                    | Main application
[ConversationManager]    | Chat history
[ThemeProvider]          | Dark/light mode
[ModelDownloader]        | Model downloads
[NativeLLMService]       | AI engine
[ChatWindow]             | Chat interface

EMOJI     | MEANING
----------|------------------
✅        | Success
⏳        | In progress
⚠️         | Warning
❌        | Error
🔍        | Debug info
📦        | Data dump
```

---

## 🔧 ENABLE VERBOSE LOGGING

For deeper debugging, add this to your code:

```typescript
// constants.tsx
export const DEBUG_MODE = process.env.NODE_ENV === 'development' || 
                          (import.meta as any).env?.VITE_DEBUG === 'true';

// Usage in components:
if (DEBUG_MODE) {
  console.log('[ChatWindow] 🔍 Debug: State:', { messages, isGenerating });
}
```

Then set in `.env.local`:
```
VITE_DEBUG=true
```

---

## 📞 SUPPORT ESCALATION

**When to escalate based on logs**:

| Log Signature | Escalate To | Urgency |
|---------------|-------------|---------|
| `❌ Engine init failed` (persistent) | Senior Dev | URGENT |
| `❌ Download failed` (all models) | DevOps | HIGH |
| `❌ Failed to save` (persistent) | Lead Dev | MEDIUM |
| `⚠️` warnings | Ticket system | LOW |

---

*Logging Guide Version: 1.0*  
*For Lumina Production Deployment*  
*Review after each major release*
