# ClioDesk - Writing Assistant for Historians

**NOTE that *ClioDesk* is a vibe-coding experiment aimed at developping a Proof Of Concept. It is provided *as is*, at your own risk**.

Multi-platform desktop application (Electron + React + TypeScript) to assist historians in writing articles (v1) and books (not implmented yet), with RAG (Retrieval-Augmented Generation) and Zotero (v1) / Tropy (not implemented yet) integrations.

**License:** [GPLv3](https://www.gnu.org/licenses/gpl-3.0.html)

## Objective

Create a writing assistant that allows historians to:
- Efficiently search their bibliographic data
- Query their digitized sources (PDFs) via RAG
- Integrate Zotero for bibliography
- Integrate Tropy for archival sources (not implemented yet)
- Edit in markdown (v1) with contextual AI assistant (not implmented yet)

## Progress Status

**ClioDesk is approaching version 1.0**

### ✅ Completed (Phases 1-5)

**Phase 1: Core Infrastructure**
- [x] Electron + React + TypeScript project initialized
- [x] VectorStore with SQLite (documents, chunks, embeddings)
- [x] IPC handlers and preload bridge
- [x] ConfigManager with electron-store

**Phase 2: Advanced Features**
- [x] PDF indexing with adaptive chunking (cpuOptimized/standard/large)
- [x] HNSW + BM25 hybrid search (16x faster than baseline)
- [x] Word export (.docx) with .dotx template support
- [x] Bibliography management with merge/replace modes
- [x] System prompt customization (FR/EN)
- [x] PDF renaming during import

**Phase 3: Documentation**
- [x] Technical architecture documentation (ARCHITECTURE.md)
- [x] Build and deployment guide (BUILD_AND_DEPLOYMENT.md)
- [x] Platform-specific installation guides (macOS, Linux)

**Phase 4: Internationalization**
- [x] Complete i18n implementation (FR/EN/DE)
- [x] 667+ translation keys per language
- [x] All UI components translated

**Phase 5: Cleanup**
- [x] Removed experimental features (contextual suggestions)
- [x] Codebase cleanup and optimization

### 🚧 In Progress (Phase 6: Release - 46% complete)

- [x] Centralized logging system with production filters
- [ ] DevTools production configuration
- [ ] Version bump to 1.0.0
- [ ] Complete CHANGELOG.md
- [ ] Multi-platform build testing
- [ ] GitHub release preparation

See [ROADMAP_V1.0]([ROADMAP_V1.0.md](https://github.com/inactinique/cliodeck/wiki/3.-Implementation-Plan-%E2%80%90-ClioDesk-v1.0)) for detailed progress tracking.

## Architecture

```
cliodesk/
├── src/
│   ├── main/              # Electron Main Process
│   │   ├── index.ts       # Entry point
│   │   ├── ipc/
│   │   │   └── handlers.ts # IPC handlers
│   │   └── services/
│   │       └── config-manager.ts # Configuration
│   ├── preload/
│   │   └── index.ts       # Secure IPC bridge
│   └── renderer/          # React Frontend
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           └── components/
│
├── backend/               # Node.js Modules
│   ├── core/
│   │   ├── vector-store/
│   │   │   └── VectorStore.ts
│   │   ├── chunking/
│   │   ├── pdf/
│   │   ├── llm/
│   │   └── bibliography/
│   ├── integrations/
│   │   ├── zotero/
│   │   └── tropy/
│   └── types/
│       ├── config.ts
│       └── pdf-document.ts
│
└── package.json
```

## Tech Stack

### Frontend
- **Electron 28** - Multi-platform desktop
- **React 18** - UI components
- **TypeScript 5** - Type safety
- **Monaco Editor** - Markdown editor
- **Zustand** - State management
- **Vite** - Build tool

### Backend
- **Node.js 20+** - JavaScript runtime
- **better-sqlite3** - SQLite database (vector store)
- **pdfjs-dist** - PDF extraction
- **electron-store** - Config persistence
- **Python 3.11+** - Analysis services (topic modeling)

### LLM & AI
- **Ollama** - Local models (nomic-embed-text, gemma2:2b)
  - Embedding model: `nomic-embed-text` (768 dimensions)
  - Chat model: `gemma2:2b` (fast, multilingual)
- **BERTopic** - Topic modeling and clustering (Python)
- **Claude API** - Cloud option (Anthropic)
- **OpenAI API** - Alternative cloud option

## Installation

### Detailed Platform Guides

For complete installation instructions including system dependencies, Ollama configuration, and troubleshooting:

- **[macOS Installation Guide](https://github.com/inactinique/cliodeck/wiki/1.2-ClioDesk-Installation-%E2%80%90-macOS)** - Complete installation on macOS (Intel and Apple Silicon)
- **[Linux Installation Guide](https://github.com/inactinique/cliodeck/wiki/1.1-ClioDesk-Installation-%E2%80%90-Linux)** - Installation on Ubuntu, Debian, Fedora, Arch Linux, etc.

### Quick Installation (Developers)

**Prerequisites:**
- Node.js 20+ and npm 10+
- Python 3.11+ (with venv)
- Ollama with models:
  - `nomic-embed-text` (required for embeddings)
  - `gemma2:2b` (recommended for chat)

**Installation:**

```bash
# Clone the repository
git clone https://github.com/your-org/cliodesk.git
cd cliodesk

# Install npm dependencies
npm install

# Compile native modules for Electron
npx electron-rebuild -f

# Build the project
npm run build

# Launch the application
npm start
```

**Installing Ollama and Models:**

```bash
# macOS
brew install ollama
brew services start ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Download models
ollama pull nomic-embed-text
ollama pull gemma2:2b
```

## Available Scripts

```bash
# Development (compile in watch mode + launch app)
npm run dev:full

# Development (compile only in watch mode)
npm run dev

# Production build
npm run build

# Launch application
npm start

# Build for distribution
npm run build:linux    # AppImage + .deb
npm run build:mac      # DMG (x64 + arm64)
npm run build:win      # NSIS installer

# Tests
npm test
npm run test:watch
npm run test:coverage

# Type checking
npm run typecheck

# Lint
npm run lint

# Clean
npm run clean
```

## Main Components

### VectorStore (Completed)

**File:** `backend/core/vector-store/VectorStore.ts`

SQLite database management for vector embeddings.

**Features:**
- PDF document storage with metadata
- Text chunk storage with embeddings (Float32Array → Buffer)
- Cosine similarity search
- Statistics (documents, chunks, embeddings)
- Integrity checks (orphaned chunks)
- Automatic CASCADE delete

**SQLite Schema:**
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  year TEXT,
  bibtex_key TEXT,
  page_count INTEGER,
  created_at TEXT,
  indexed_at TEXT,
  last_accessed_at TEXT,
  metadata TEXT
);

CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  content TEXT NOT NULL,
  page_number INTEGER,
  chunk_index INTEGER,
  start_position INTEGER,
  end_position INTEGER,
  embedding BLOB,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
```

**Usage:**
```typescript
import { VectorStore } from './backend/core/vector-store/VectorStore';

const vectorStore = new VectorStore();

// Save document
vectorStore.saveDocument(pdfDoc);

// Save chunk with embedding
vectorStore.saveChunk(chunk, embedding);

// Semantic search
const results = vectorStore.search(queryEmbedding, 10);

// Stats
const stats = vectorStore.getStatistics();
console.log(stats.documentCount, stats.embeddingCount);
```

### ConfigManager (Completed)

**File:** `src/main/services/config-manager.ts`

Configuration management with electron-store.

**Configuration:**
```typescript
{
  llm: {
    backend: 'ollama',
    ollamaURL: 'http://localhost:11434',
    ollamaEmbeddingModel: 'nomic-embed-text',
    ollamaChatModel: 'gemma2:2b'
  },
  rag: {
    topK: 10,
    similarityThreshold: 0.2,
    chunkingConfig: 'cpuOptimized'
  },
  editor: {
    fontSize: 14,
    theme: 'dark',
    wordWrap: true
  },
  recentProjects: []
}
```

## Port from Swift

The project rewrites ClioDesk (Swift/macOS) as a multi-platform Electron application.

**Ported Files:**
- VectorStore.swift (586 lines) → `VectorStore.ts`
  - 100% portable logic
  - SQLite3 → better-sqlite3
  - Identical cosine similarity
  - Optimized embeddings management

**To Port:**
- `DocumentChunker.swift` → `DocumentChunker.ts`
- `BibTeXParser.swift` → `BibTeXParser.ts`
- `OllamaBackend.swift` → `OllamaClient.ts`
- `PDFTextExtractor.swift` → `PDFExtractor.ts` (PDFKit → pdfjs-dist)

## Next Steps

1. **Finalize core backend** (2-3 days)
   - Port DocumentChunker
   - Port BibTeXParser
   - Implement PDFExtractor with pdfjs-dist
   - Port OllamaClient

2. **Build scripts** (1 day)
   - Configure Vite for Electron
   - Separate main + renderer build
   - TypeScript compilation

3. **End-to-end testing** (1 day)
   - Test VectorStore
   - Test PDF indexing
   - Test semantic search

4. **React interface** (1 week)
   - 3-panel layout
   - Monaco Editor
   - RAG chat interface
   - Bibliography panel

## Documentation

See the [ClioDesk wiki](https://github.com/inactinique/cliodeck/wiki).
