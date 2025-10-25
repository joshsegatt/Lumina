# 🔄 ROLLBACK PLAN - Emergency Recovery Guide

**Purpose**: Step-by-step instructions to revert critical fixes if issues arise in production.  
**Criticality**: PRODUCTION SAFETY NET  
**Test Status**: Rollback procedures must be tested in staging before production deployment.

---

## 🎯 ROLLBACK STRATEGY

### **General Principles**:
1. **Test rollbacks in staging first** - Never test rollback procedures in production
2. **One fix at a time** - Roll back individual fixes, not all at once
3. **Verify after rollback** - Test app functionality after each rollback
4. **Document reasons** - Log why rollback was necessary
5. **Keep backups** - Maintain pre-fix code snapshots

---

## 🔧 FIX #1: localStorage → AsyncStorage Migration

**Files Modified**:
- `services/conversationManager.ts`
- `services/themeManager.ts`
- `App.tsx`
- `.gitignore`
- `package.json` (added @react-native-async-storage/async-storage)

### **Rollback Method A: Git Revert** (Recommended)

```bash
# Navigate to project directory
cd c:\Users\josue\Desktop\lumina

# Revert specific commits (find commit hashes first)
git log --oneline -n 10  # Find the commit hash for AsyncStorage changes

# Revert the commits (replace <commit-hash> with actual hash)
git revert <commit-hash>

# Uninstall AsyncStorage
npm uninstall @react-native-async-storage/async-storage

# Rebuild
npm install
npm run build
```

### **Rollback Method B: Manual File Restoration** (If git unavailable)

#### **Step 1: Restore conversationManager.ts**

```typescript
// services/conversationManager.ts
// REMOVE line 2:
import AsyncStorage from '@react-native-async-storage/async-storage';

// CHANGE line 5 back to:
const STORAGE_KEY = 'lumina-conversations';

// REMOVE line 6:
const MAX_CONVERSATIONS = 100;

// REMOVE line 10:
isLoading: false,

// CHANGE lines 12-34 (useEffect) back to:
useEffect(() => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      setConversations(parsed);
    } catch (error) {
      console.error('Failed to load conversations', error);
    }
  }
}, []);

// CHANGE lines 36-53 (saveConversations) back to:
const saveConversations = useCallback((convs: Conversation[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
  } catch (error) {
    console.error('Failed to save conversations', error);
  }
}, []);

// CHANGE deleteConversation signature (line 79) back to:
const deleteConversation = useCallback((conversationId: string) => {
  if (window.confirm('Delete this conversation?')) {
    const filtered = conversations.filter(c => c.id !== conversationId);
    saveConversations(filtered);
  }
}, [conversations, saveConversations]);

// CHANGE clearAllConversations signature (line 87) back to:
const clearAllConversations = useCallback(() => {
  if (window.confirm('Clear all conversations?')) {
    saveConversations([]);
  }
}, [saveConversations]);

// REMOVE isLoading from return (line 97):
return { 
  conversations, 
  createConversation, 
  updateConversation, 
  deleteConversation, 
  clearAllConversations 
};
```

#### **Step 2: Restore themeManager.ts**

```typescript
// services/themeManager.ts
// REMOVE line 2:
import AsyncStorage from '@react-native-async-storage/async-storage';

// CHANGE line 5 back to:
const THEME_STORAGE_KEY = 'lumina-theme';

// REMOVE line 6:
const STORAGE_KEY = '@lumina:theme';

// CHANGE lines 30-38 back to:
useEffect(() => {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  const initialTheme = storedTheme || 'system';
  setThemeState(initialTheme);
  applyTheme(initialTheme);
}, [applyTheme]);

// CHANGE lines 40-46 (setTheme) back to:
const setTheme = (newTheme: Theme) => {
  setThemeState(newTheme);
  localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  applyTheme(newTheme);
};
```

#### **Step 3: Restore App.tsx**

```typescript
// App.tsx
// CHANGE handleDeleteConversation (line 299) back to:
const handleDeleteConversation = (id: string) => {
    deleteConversation(id);  // Remove confirmFn and message parameters
    if (activeConversationId === id) {
        setActiveConversationId(null);
        setScreen('history');
    }
};

// CHANGE handleClearHistory (line 313) back to:
const handleClearHistory = () => {
    clearAllConversations();  // Remove confirmFn and message parameters
    setActiveConversationId(null);
    setScreen('history');
}
```

#### **Step 4: Uninstall AsyncStorage**

```powershell
npm uninstall @react-native-async-storage/async-storage
```

#### **Step 5: Rebuild**

```powershell
npm install
npm run build
```

### **Verification After Rollback**:
- [ ] App launches without errors
- [ ] Conversations persist (on web only)
- [ ] Theme persists (on web only)
- [ ] Delete conversation works
- [ ] Clear all history works
- [ ] No TypeScript errors
- [ ] **NOTE**: Native Android/iOS will still have localStorage crash issue

---

## 🔐 FIX #4: Remove Hardcoded HF Token

**Files Modified**:
- `App.tsx` (line 197-203)
- `.gitignore`
- `.env.example` (created)

### **Rollback Method**:

#### **Step 1: Restore App.tsx**

```typescript
// App.tsx (line 197-203)
// REPLACE:
const HF_TOKEN = (import.meta as any).env?.VITE_HF_TOKEN || '';

if (!HF_TOKEN) {
  console.warn('[App] ⚠️ No HF_TOKEN found. Downloads may be rate-limited.');
  console.warn('[App] Set VITE_HF_TOKEN in .env.local to avoid rate limits.');
}

// WITH (INSECURE - ONLY FOR EMERGENCY TESTING):
const HF_TOKEN = 'hf_YOUR_TOKEN_HERE';
```

#### **Step 2: Remove .env files** (Optional)

```powershell
Remove-Item .env.example
Remove-Item .env.local -ErrorAction SilentlyContinue
```

#### **Step 3: Restore .gitignore** (Optional)

```ignore
# .gitignore
# REMOVE these lines:
.env
.env.local
.env.*.local
```

### **Verification After Rollback**:
- [ ] Model downloads work
- [ ] No rate limiting errors
- [ ] **SECURITY WARNING**: Token exposed in source code again

---

## 📋 ROLLBACK DECISION MATRIX

| Issue | Roll Back FIX #1 | Roll Back FIX #4 | Keep Both |
|-------|-----------------|-----------------|-----------|
| AsyncStorage not working on Android | ✅ YES (short-term) | ❌ KEEP | |
| Environment variables not loading | ❌ KEEP | ✅ YES (short-term) | |
| Conversations not persisting | ✅ YES | ❌ KEEP | |
| Downloads failing | ❌ KEEP | ✅ YES | |
| TypeScript errors | ✅ YES (investigate) | ❌ KEEP | |
| Build fails | ✅ YES | ✅ YES | |
| Everything works fine | ❌ KEEP | ❌ KEEP | ✅ |

---

## 🚨 EMERGENCY FULL ROLLBACK

If multiple fixes fail simultaneously, perform full rollback:

### **Git Method**:

```bash
# Find commit before fixes started
git log --oneline -n 20

# Reset to commit before fixes (DESTRUCTIVE - loses all changes)
git reset --hard <commit-hash-before-fixes>

# Rebuild
npm install
npm run build
```

### **Backup Restoration**:

```bash
# If you made a backup before applying fixes
Copy-Item -Path "c:\Users\josue\Desktop\lumina-backup\*" -Destination "c:\Users\josue\Desktop\lumina\" -Recurse -Force

# Rebuild
npm install
npm run build
```

---

## 📝 ROLLBACK LOGGING

**Document all rollbacks using this template**:

```
ROLLBACK LOG
=============
Date: _______________
Time: _______________
Rolled Back Fix: #_____ (_______________)
Reason: _________________________________
Performed By: _______________ 
Method Used: ☐ Git Revert ☐ Manual Restore ☐ Full Rollback
Verification: ☐ PASS ☐ FAIL
Issues After Rollback: ______________________
Next Steps: _________________________________
```

---

## ⚠️ CRITICAL WARNINGS

1. **Never rollback in production without testing rollback in staging first**
2. **AsyncStorage rollback means native Android/iOS will crash** - Only roll back if web-only deployment
3. **HF Token rollback exposes security vulnerability** - Only for emergency testing, never commit
4. **Always backup before rollback** - `Copy-Item -Path lumina -Destination lumina-backup -Recurse`
5. **Communicate rollback to team** - Notify all stakeholders immediately
6. **Document root cause** - Understand why rollback was necessary before re-applying fix

---

## 🔄 RE-APPLICATION AFTER ROLLBACK

If you rolled back and fixed the issue:

1. **Root Cause Analysis**: Document what went wrong
2. **Fix the Fix**: Update the original fix to address the issue
3. **Test Thoroughly**: Test in dev → staging → production
4. **Reapply**: Use same steps as original fix
5. **Monitor**: Watch logs and metrics closely after re-application

---

## 📞 ESCALATION CONTACTS

| Role | Contact | When to Escalate |
|------|---------|------------------|
| **Lead Developer** | __________ | Technical issues, build failures |
| **CTO** | __________ | Production outage, data loss |
| **DevOps** | __________ | Deployment issues, infrastructure |
| **Product Owner** | __________ | User-facing issues, feature breaks |

---

*Rollback Plan Version: 1.0*  
*Last Updated: October 25, 2025*  
*Review Frequency: After each deployment*
