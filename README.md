# ClioDesk Electron - Writing Assistant for Historians

Multi-platform desktop application (Electron + React + TypeScript) to assist historians in writing articles and books, with RAG (Retrieval-Augmented Generation) and Zotero/Tropy integrations.

## Objective

Create a writing assistant that allows historians to:
- Efficiently search their bibliographic data
- Query their digitized sources (PDFs) via RAG
- Integrate Zotero for bibliography
- Integrate Tropy for archival sources
- Edit in markdown with contextual AI assistant

## Progress Status

### Phase 1: Infrastructure (COMPLETED)
- [x] Electron + React + TypeScript project initialized
- [x] Folder structure created (src/, backend/)
- [x] Dependencies installed (better-sqlite3, electron-store, Monaco, pdfjs-dist, etc.)
- [x] IPC handlers configured (preload bridge)
- [x] ConfigManager with electron-store
- [x] **VectorStore.ts** ported from Swift (586 lines)
  - SQLite database with better-sqlite3
  - Documents and chunks management
  - Embeddings as BLOB
  - Cosine similarity search
  - CASCADE delete
  - Statistics and integrity checks

### In Progress: Core Backend Modules
- [ ] DocumentChunker.ts
- [ ] BibTeXParser.ts
- [ ] PDFExtractor.ts (pdfjs-dist)
- [ ] OllamaClient.ts
- [ ] PDFIndexer.ts (orchestration)

### Upcoming
- [ ] React Interface (Monaco Editor, RAG Chat, Bibliography)
- [ ] Zotero/Tropy Integrations
- [ ] Exports (PDF, DOCX, reveal.js)

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

- **[macOS Installation Guide](INSTALL_MACOS.md)** - Complete installation on macOS (Intel and Apple Silicon)
- **[Linux Installation Guide](INSTALL_LINUX.md)** - Installation on Ubuntu, Debian, Fedora, Arch Linux, etc.

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

### Installation Guides
- [INSTALL_MACOS.md](INSTALL_MACOS.md) - Complete guide for macOS (Intel & Apple Silicon)
- [INSTALL_LINUX.md](INSTALL_LINUX.md) - Complete guide for Linux (Ubuntu, Debian, Fedora, Arch)
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment and user workflow

### Technical Documentation
- [VectorStore API](#vectorstore-completed) - VectorStore documentation
- [Configuration](#configmanager-completed) - Configuration options
- [Architecture](#architecture) - Project structure

## Links

- **Original repository:** `/home/inactinique/GitHub/ClioDesk` (Swift)
- **New repository:** `/home/inactinique/GitHub/cliodesk` (Electron)
- **Zotero API:** https://www.zotero.org/support/dev/web_api/v3/basics
- **Tropy:** https://tropy.org/
- **Ollama:** https://ollama.ai/

## License

MIT

---

**Note:** This project is under active development. Phase 1 (infrastructure) is completed. The core backend is being ported from the Swift version.
