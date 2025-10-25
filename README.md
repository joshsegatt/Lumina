# ✨ Lumina

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0--beta.1-blue)
![React Native](https://img.shields.io/badge/React%20Native-19.2.0-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178c6)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-Production%20Ready-success)

**An AI-powered assistant to spark creativity and illuminate ideas.**

*On-device AI inference • Offline-first • Privacy-focused • Lightning-fast*

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## 🌟 Overview

Lumina is a cutting-edge React Native mobile application that brings the power of Large Language Models (LLMs) directly to your device. Engage with specialized AI modes to generate ideas, polish content, or weave vivid descriptions—all without an internet connection.

### Why Lumina?

- **🔒 Privacy First**: Your conversations never leave your device
- **⚡ Lightning Fast**: Native on-device inference with llama.rn
- **🌐 Offline Capable**: Works without internet after model download
- **🎨 Specialized Modes**: Tailored AI assistants for different creative tasks
- **📱 Native Performance**: Built with React Native for iOS & Android

---

## ✨ Features

### 🤖 On-Device AI
- **Native LLM Engine**: Powered by [llama.rn](https://github.com/mybigday/llama.rn) for blazing-fast inference
- **GGUF Model Support**: Use quantized models (Q4, Q6, Q8) optimized for mobile
- **Smart Model Management**: Download, validate, and cache models locally

### 🎭 Specialized AI Modes
- **💡 Idea Generator**: Brainstorm creative concepts and solutions
- **✍️ Content Polisher**: Refine and enhance your writing
- **🖼️ Visual Describer**: Create vivid, detailed descriptions
- *(More modes coming soon!)*

### 🛡️ Production-Grade Reliability
- **Error Boundaries**: Graceful error handling prevents app crashes
- **Download Retry Logic**: Exponential backoff for network failures
- **Race Condition Protection**: Mutex guards prevent concurrent operations
- **Memory Optimized**: Proper cleanup and leak prevention
- **Comprehensive Logging**: Structured logs for debugging

### 🌍 Internationalization
- **6 Languages**: English, Portuguese, Spanish, French, German, Japanese, Chinese
- **RTL Support**: Right-to-left languages ready
- **Easy Extension**: Simple i18n system for adding new locales

---

## 🚀 Installation

### Prerequisites

- **Node.js** 18+ and npm
- **React Native CLI** tools
- **Android Studio** (for Android) or **Xcode** (for iOS)
- **Git**

### Quick Start

```bash
# Clone the repository
git clone https://github.com/joshsegatt/Lumina.git
cd Lumina

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your HuggingFace token (optional, for faster downloads)

# Sync with Capacitor
npx cap sync

# Run on Android
npx cap open android
# Build in Android Studio

# OR Run on iOS (coming soon)
npx cap open ios
# Build in Xcode
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# Optional: HuggingFace token for authenticated model downloads
# Get yours at: https://huggingface.co/settings/tokens
VITE_HF_TOKEN=hf_YOUR_TOKEN_HERE

# Optional: Gemini API key for cloud features (future)
VITE_GEMINI_API_KEY=your_gemini_key_here
```

---

## 📱 Usage

### First Launch

1. **Select a Model**: Choose from pre-configured GGUF models
   - `Gemma 2B Q6_K` (~1.7GB) - Fast, good quality
   - `Phi-2 Q6_K` (~2.1GB) - Balanced performance
   - Or load your own GGUF model from device

2. **Download & Initialize**: The app will download and validate the model
   - Progress tracking with detailed status
   - Automatic retry on network failures
   - SHA256 validation for integrity

3. **Start Chatting**: Select a mode and begin your conversation
   - Real-time streaming responses
   - Token-per-second metrics
   - Conversation history saved locally

### Model Management

```typescript
// Models are cached in:
// Android: /data/data/com.lumina.app/files/models/
// iOS: <App>/Documents/models/

// Clear cache from Settings to free up space
```

---

## 🏗️ Architecture

### Tech Stack

```
┌─────────────────────────────────────┐
│         React Native UI Layer       │
│  (TypeScript + Functional Components)│
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Service Layer                 │
│  • llmServiceAdapter                │
│  • nativeLlmService (llama.rn)      │
│  • conversationManager              │
│  • ModelDownloader                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Native Layer                  │
│  • llama.rn (C++ inference engine)  │
│  • React Native FS                  │
│  • AsyncStorage                     │
└─────────────────────────────────────┘
```

### Key Components

#### `nativeLlmService.ts`
Native LLM manager with mutex-protected initialization:
- Pre-initialization model validation (file, size, hash)
- Real native error extraction (no more "Unknown" errors)
- Streaming text generation with token tracking

#### `ModelDownloader.ts`
Robust download manager:
- Exponential backoff retry logic (3 attempts)
- SHA256 integrity validation
- Chunked hash calculation for large files
- Smart error detection (404, 403, content-type)

#### `ErrorBoundary.tsx`
UI crash protection:
- Catches React rendering errors
- Displays user-friendly fallback UI
- Reset functionality to recover

#### `conversationManager.ts`
Persistent chat history:
- AsyncStorage for React Native compatibility
- Max 100 conversations limit
- Async-compatible callbacks

---

## 🔧 Development

### Project Structure

```
lumina/
├── components/          # React components
│   ├── ChatWindow.tsx
│   ├── ErrorBoundary.tsx
│   ├── Header.tsx
│   └── ...
├── services/           # Business logic
│   ├── nativeLlmService.ts
│   ├── llmServiceAdapter.ts
│   ├── ModelDownloader.ts
│   ├── conversationManager.ts
│   └── i18n.ts
├── android/            # Android native project
├── constants.tsx       # App configuration
├── types.ts           # TypeScript definitions
└── version.ts         # Build versioning
```

### Build Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Type checking
npx tsc --noEmit

# Sync with Capacitor
npx cap sync
```

### Logging System

Structured logging with consistent prefixes:

```typescript
[FLOW]         - High-level workflow state transitions
[EngineInit]   - Engine initialization details
[EngineError]  - Native error extraction
[Validator]    - Model validation (size, hash)
[Download]     - Download operations
[Chat]         - Message generation tracking
```

Filter logs in Android Studio:
```bash
adb logcat | grep -E "\[FLOW\]|\[EngineInit\]|\[Chat\]"
```

---

## 🧪 Testing

### Verification Checklist

Run the comprehensive test suite documented in:
- **[VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md)** - 12-point verification checklist

Key tests:
- ✅ Build versioning confirms fresh bundle
- ✅ Model validation runs before engine start
- ✅ Real native errors (not "Unknown")
- ✅ Mutex prevents concurrent loads
- ✅ Token/s performance tracking works
- ✅ Memory cleanup on unmount
- ✅ Download retry on network failure

### QA Testing

Full QA checklist with 111 test cases available in:
- **[QA_CHECKLIST_RELEASE.md](QA_CHECKLIST_RELEASE.md)**

---

## 📚 Documentation

Comprehensive documentation available:

- **[PRODUCTION_FIX_COMPLETE.md](PRODUCTION_FIX_COMPLETE.md)** - Technical implementation guide
- **[LAUNCH_READY_SUMMARY.md](LAUNCH_READY_SUMMARY.md)** - Executive summary
- **[VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md)** - Testing checklist
- **[GLOBAL_AUDIT_REPORT.md](GLOBAL_AUDIT_REPORT.md)** - Complete code audit
- **[LOGGING_GUIDE.md](LOGGING_GUIDE.md)** - Structured logging reference
- **[ROLLBACK_PLAN.md](ROLLBACK_PLAN.md)** - Recovery procedures

---

## 🔒 Security

### Best Practices

- ✅ **No Secrets in Code**: All tokens in environment variables
- ✅ **Gitignore Configured**: `.env` files excluded from version control
- ✅ **GitHub Push Protection**: Prevents accidental token commits
- ✅ **Local Storage Only**: Conversations stored in AsyncStorage
- ✅ **No Cloud Sync**: Your data stays on your device

### Responsible Disclosure

Found a security issue? Please create a private security advisory.

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Contribution Guidelines

- Follow existing code style (TypeScript, functional components)
- Add tests for new features
- Update documentation
- Ensure 0 TypeScript errors: `npx tsc --noEmit`
- Test on real devices (Android/iOS)

---

## 📊 Roadmap

### v1.0.0 (Current - Beta)
- ✅ On-device inference with llama.rn
- ✅ 3 specialized AI modes
- ✅ Model download and caching
- ✅ 6 language support
- ✅ Comprehensive error handling

### v1.1.0 (Q1 2026)
- 🔄 Additional AI modes (Code Assistant, Translator)
- 🔄 Model size optimization
- 🔄 iOS support
- 🔄 Widget support

### v2.0.0 (Q2 2026)
- 🔮 Multi-model support (load multiple models)
- 🔮 Function calling capabilities
- 🔮 Voice input/output
- 🔮 Advanced conversation features (search, export)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with amazing open-source technologies:

- [React Native](https://reactnative.dev/) - Mobile framework
- [llama.rn](https://github.com/mybigday/llama.rn) - On-device LLM inference
- [Capacitor](https://capacitorjs.com/) - Native runtime
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool

Special thanks to:
- HuggingFace for hosting GGUF models
- The llama.cpp community
- All open-source contributors

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/joshsegatt/Lumina/issues)
- **Discussions**: [GitHub Discussions](https://github.com/joshsegatt/Lumina/discussions)

---

<div align="center">

**Made with ❤️ for the AI community**

⭐ Star us on GitHub if you find this project useful!

</div>
