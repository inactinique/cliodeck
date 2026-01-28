# ClioDeck - Writing Assistant for Historians

Multi-platform desktop application (Electron + React + TypeScript) to assist historians in writing articles (v1) and books (not implemented yet), with RAG (Retrieval-Augmented Generation) and Zotero (v1) / Tropy (v1 - beta) integrations.

**NOTE that *ClioDeck* is a [vibe-coding](https://en.wikipedia.org/wiki/Vibe_coding) experiment aimed at developping a Proof Of Concept. It is provided *as is*, at your own risk**: it has been designed by [Frédéric Clavert](https://inactinique.net) and coded through [claude code](https://claude.com/product/claude-code). I made a small talk on vibe-coding / vibe-writing for historians, [that you can see here](https://inactinique.net/prez/2025-07-03_DH-LLM/2025-07-03_DH-LLM.html#/title-slide) (in French, once open, hit 's' to get my notes). On the ethics of vibe coding, see [here](https://github.com/inactinique/cliodeck/wiki/4.-Ethics).

**License:** [GPLv3](https://www.gnu.org/licenses/gpl-3.0.html)

## Objective

Create a writing assistant that allows historians to:
- Efficiently search their bibliographic data
- Query their digitized sources (PDFs) via RAG
- Integrate Zotero for bibliography
- Integrate Tropy for archival sources (v1 - beta)
- Edit in markdown (WYSIWYG v1) with contextual AI assistant (not implmented yet)

## Quick Installation

*This software is provided **as is** with no guarantee and at your own risks*

[Download the prerelease (macos and linux)](https://github.com/inactinique/cliodeck/releases/tag/v1.0.0-RC1)

For complete installation instructions including system dependencies, Ollama configuration, and troubleshooting:

- **[macOS Installation Guide](https://github.com/inactinique/cliodeck/wiki/1.2-ClioDeck-Installation-%E2%80%90-macOS)** - Complete installation on macOS (Intel and Apple Silicon)
- **[Linux Installation Guide](https://github.com/inactinique/cliodeck/wiki/1.1-ClioDeck-Installation-%E2%80%90-Linux)** - Installation on Ubuntu, Debian, Fedora, Arch Linux, etc.

It should be installable one way or another on windows.

## Development information

- [Technical Architecture](https://github.com/inactinique/cliodeck/wiki/2.-Technical-Architecture)
- [Build and Deployment Guide](https://github.com/inactinique/cliodeck/wiki/2.1-Build-and-Deployment-Guide)

### Quick Installation (Developers)

**Prerequisites:**
- Node.js 20+ and npm 10+
- Python 3.11+ (with venv)
- Ollama with models:
  - `nomic-embed-text` and `mxbai-embed-large` (required for embeddings)
  - `gemma2:2b` (recommended for chat)

**Installation:**

```bash
# Clone the repository
git clone https://github.com/inactinique/cliodeck.git
cd cliodeck

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

### VectorStore

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

### ConfigManager

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


## Documentation

See the [ClioDeck wiki](https://github.com/inactinique/cliodeck/wiki).
