# 🧪 QUICK VERIFICATION GUIDE - Lumina v1.0.0-beta.1

**Purpose**: Verify all 12 critical fixes are working in production build  
**Time Required**: ~15 minutes  
**Prerequisites**: Android device with ADB enabled OR iOS device with console access

---

## 🔍 VERIFICATION CHECKLIST

### **1. Build Versioning (FIX #8)**

**Test**: Confirm fresh bundle is running

**Steps**:
```bash
# Start app and check console
adb logcat | grep "LUMINA APP STARTING"
```

**Expected Output**:
```
🚀 LUMINA APP STARTING
📦 Version: 1.0.0-beta.1
🏗️  Build: 1.0.0-beta.1+[timestamp]
⏰ Built: 2025-10-25T...
```

**Result**: ✅ PASS if version shows `1.0.0-beta.1` and timestamp is recent

---

### **2. Centralized Path Resolution (FIX #9)**

**Test**: Model path is consistent

**Steps**:
```bash
# Select a model to download and check logs
adb logcat | grep "PathResolver"
```

**Expected Output**:
```
[PathResolver] Resolved path for gemma-2b-q6_k: /data/user/0/.../models/gemma-2b-q6_k.gguf
```

**Result**: ✅ PASS if path format is consistent and absolute

---

### **3. Pre-Initialization Validation (FIX #10)**

**Test**: Validation runs before engine start

**Steps**:
```bash
# Download a model and watch validation logs
adb logcat | grep -E "\[Validator\]|\[EngineInit\]"
```

**Expected Output** (correct order):
```
[Validator] ========== VALIDATION START ==========
[Validator] ✅ File exists
[Validator] ✅ Size matches
[Validator] ✅ Hash matches
[Validator] ========== VALIDATION END: ✅ PASS ==========
[EngineInit] ========== INITIALIZATION START ==========
[EngineInit] ✅ initLlama successful
```

**Result**: ✅ PASS if validation completes BEFORE initLlama

---

### **4. Real Native Errors (FIX #11)**

**Test**: Errors show real details, not "Unknown"

**Simulation**: Corrupt a model file to trigger error

**Steps**:
```bash
# If error occurs, check log format
adb logcat | grep "EngineError"
```

**Expected Output**:
```
[EngineError] ======================
❌ Engine Initialization Failed

📁 Model Path: /data/.../model.gguf
🔢 Error Code: [actual code]
💬 Message: [real error message]
🔧 Native Details: [native layer details]

🔍 Troubleshooting:
1. Check device logs: adb logcat | grep llama
2. Verify model file format is GGUF
...
[EngineError] ======================
```

**Result**: ✅ PASS if error shows specific details, not "Unknown error occurred"

---

### **5. Mutex-Protected Initialization (FIX #12)**

**Test**: Concurrent loads are prevented

**Steps**:
1. Start model download/load
2. **Immediately** tap another model (within 1 second)
3. Check logs for mutex error

**Expected Output**:
```
[NativeLLM] ❌ Model is already loading. Please wait for current operation to complete.
```

OR (App-level guard):
```
[App] ⚠️ Model already loading, ignoring request
```

**Result**: ✅ PASS if second request is blocked and first completes successfully

---

### **6. Structured Logging (FIX #13)**

**Test**: All log prefixes are consistent

**Steps**:
```bash
# Run complete workflow and check prefix usage
adb logcat | grep -E "\[FLOW\]|\[PathResolver\]|\[Validator\]|\[EngineInit\]|\[Download\]|\[Chat\]"
```

**Expected Output**:
```
[FLOW] ========== MODEL LOAD WORKFLOW ==========
[FLOW] STATE: idle → loading
[PathResolver] Resolved path for ...
[Downloader] Starting RNFS native download
[Validator] ========== VALIDATION START ==========
[EngineInit] ========== INITIALIZATION START ==========
[FLOW] ✅✅✅ MODEL READY FOR USE
[Chat] ========== GENERATION START ==========
[Chat] Progress: 10 tokens, 12.3 tok/s
[Chat] ========== GENERATION COMPLETE ==========
```

**Result**: ✅ PASS if all prefixes follow standard format

---

### **7. Performance Monitoring (FIX #14)**

**Test**: Token/s tracking works

**Steps**:
1. Load a model successfully
2. Send a message in chat
3. Watch console for performance logs

**Expected Output**:
```
[Chat] ========== GENERATION START ==========
[Chat] Progress: 10 tokens, 11.5 tok/s
[Chat] Progress: 20 tokens, 12.1 tok/s
[Chat] Progress: 30 tokens, 11.8 tok/s
[Chat] ========== GENERATION COMPLETE ==========
[Chat] Total tokens: 145
[Chat] Duration: 12.34s
[Chat] Speed: 11.7 tokens/s
```

**Result**: ✅ PASS if tokens/s is logged and reasonable (8-15 tok/s typical)

---

### **8. Error Boundaries (FIX #2)**

**Test**: UI crashes are caught

**Simulation**: Trigger a rendering error (if possible) or verify ErrorBoundary is active

**Steps**:
```typescript
// Check App.tsx has ErrorBoundary wrapping
// Should see this structure:
<ErrorBoundary fallbackTitle="Application Error">
  <ChatWindow /> (wrapped)
  <HistoryScreen /> (wrapped)
  <SettingsScreen /> (wrapped)
</ErrorBoundary>
```

**Result**: ✅ PASS if ErrorBoundary components exist in code and error fallback UI appears on crash

---

### **9. window.location.reload Removed (FIX #3)**

**Test**: No browser-specific APIs used

**Steps**:
```bash
# Search codebase for window.location.reload
grep -r "window.location.reload" --include="*.tsx" --include="*.ts"
```

**Expected Output**: No matches in production code (only in docs)

**Alternative**: Test "Try Again" button after error, should use `resetApp()` instead

**Result**: ✅ PASS if no `window.location.reload()` found in .tsx/.ts files

---

### **10. Download Retry Logic (FIX #5)**

**Test**: Network failures are retried

**Simulation**: Turn off WiFi briefly during download

**Steps**:
1. Start model download
2. Turn off WiFi/data for 5 seconds
3. Turn WiFi back on
4. Watch logs

**Expected Output**:
```
[Downloader] ❌ Attempt 1 failed: Network request failed
[Downloader] ⏳ Retrying in 1.0s...
[Downloader] 📥 Download attempt 2/3
[Downloader] ✅ Download succeeded on attempt 2
```

**Result**: ✅ PASS if download retries with exponential backoff

---

### **11. ChatWindow Memory Leak Fixed (FIX #6)**

**Test**: No memory leak on unmount

**Steps**:
1. Open chat, send message
2. Go back to model selection
3. Repeat 5-10 times
4. Check memory usage

**Expected**: Memory should stabilize, not grow infinitely

**Code Verification**:
```typescript
// Check ChatWindow.tsx has cleanup:
useEffect(() => {
  return () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current); // Cleanup
    }
  };
}, []);
```

**Result**: ✅ PASS if cleanup exists and memory doesn't leak

---

### **12. Model Loading Race Condition Fixed (FIX #7)**

**Test**: AbortController prevents concurrent loads

**Steps**:
1. Start downloading Model A
2. While downloading, try to load Model B
3. Check logs

**Expected Output**:
```
[App] ⚠️ Model already loading, ignoring request
```

**Code Verification**:
```typescript
// App.tsx should have:
if (llmStatus === 'loading' || llmStatus === 'downloading' || ...) {
  console.warn('[App] ⚠️ Model already loading, ignoring request');
  return;
}
```

**Result**: ✅ PASS if concurrent load is blocked

---

## 📊 QUICK RESULTS SUMMARY

Fill in your test results:

| Fix # | Fix Name | Status | Notes |
|-------|----------|--------|-------|
| #8 | Build Versioning | ☐ PASS / ☐ FAIL | Version: _______ |
| #9 | Path Resolution | ☐ PASS / ☐ FAIL | Consistent: ______ |
| #10 | Pre-Validation | ☐ PASS / ☐ FAIL | Order correct: ______ |
| #11 | Real Errors | ☐ PASS / ☐ FAIL | No "Unknown": ______ |
| #12 | Mutex Guard | ☐ PASS / ☐ FAIL | Blocked: ______ |
| #13 | Structured Logs | ☐ PASS / ☐ FAIL | All prefixes: ______ |
| #14 | Performance | ☐ PASS / ☐ FAIL | Tok/s: ______ |
| #2 | Error Boundaries | ☐ PASS / ☐ FAIL | Wrapped: ______ |
| #3 | No reload() | ☐ PASS / ☐ FAIL | None found: ______ |
| #5 | Retry Logic | ☐ PASS / ☐ FAIL | Retries: ______ |
| #6 | Memory Leak | ☐ PASS / ☐ FAIL | Stable: ______ |
| #7 | Race Condition | ☐ PASS / ☐ FAIL | Prevented: ______ |

**Total PASS**: _____ / 12  
**Production Ready**: ☐ YES (12/12) / ☐ NO (< 12)

---

## 🚨 IF ANY TEST FAILS

### **Build Versioning (FIX #8) Fails**:
- Check: `version.ts` exists?
- Check: `App.tsx` imports and calls `logVersionInfo()`?
- Check: Fresh build with `npm run build; npx cap sync`?

### **Real Errors (FIX #11) Fails**:
- Check: `nativeLlmService.ts` has error extraction logic?
- Check: Error details include `nativeError`, `userInfo`, `domain`?
- Check: Fallback message exists if no native details?

### **Mutex Guard (FIX #12) Fails**:
- Check: `isLoading` flag exists in `NativeLlmManager`?
- Check: Guard at start of `loadModelFromPath()`?
- Check: `finally` block releases mutex?

### **Performance (FIX #14) Fails**:
- Check: `ChatWindow.tsx` has `tokenCount` variable?
- Check: `[Chat]` logs appear during generation?
- Check: Logs show `tokens/s`?

---

## ✅ SUCCESS CRITERIA

All tests PASS = **PRODUCTION READY** 🚀

If < 12 tests pass:
1. Review failing test details
2. Check implementation in relevant file
3. Apply fix from PRODUCTION_FIX_COMPLETE.md
4. Re-run failed test
5. Repeat until 12/12 pass

---

**Last Updated**: October 25, 2025  
**Version**: 1.0.0-beta.1  
**For**: Production deployment verification
