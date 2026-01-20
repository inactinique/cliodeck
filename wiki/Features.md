# ClioDeck Features

This document provides an overview of ClioDeck's main features.

## Bibliography Management

### Zotero Integration

ClioDeck integrates seamlessly with Zotero for bibliography management:

- **Import from Zotero**: Connect to your Zotero library and import collections with a single click
- **Bidirectional Sync**: Detect changes (additions, modifications, deletions) between local and Zotero bibliographies
- **Conflict Resolution**: Three strategies - Remote Wins, Local Wins, or Manual selection
- **PDF Download**: Automatically download PDFs from Zotero attachments
- **Collection Selection**: Choose which Zotero collection to sync

### BibTeX Support

- **Import**: Load existing `.bib` files
- **Export**: Export bibliography to BibTeX format with all metadata preserved
- **Round-trip**: Full preservation of custom fields, tags, and notes during import/export

### PDF Management

- **Automatic Indexing**: Index PDFs for semantic search using RAG
- **Batch Download**: Download all missing PDFs from Zotero
- **Orphan Detection**: Find and clean up PDFs not linked to any citation
- **Re-indexation**: Detect modified PDFs and propose re-indexing
- **Archive Option**: Safely move orphan PDFs to archive folder instead of deleting

### Tags and Metadata

- **Custom Tags**: Organize citations with user-defined tags
- **Tag Filtering**: Filter bibliography by one or more tags
- **Custom Fields**: Store additional metadata not covered by BibTeX
- **Notes**: Add personal notes to citations
- **Date Tracking**: Automatic timestamps for added/modified citations

### Statistics Dashboard

Interactive statistics with 4 tabs:

- **Overview**: Total counts, year range, PDF coverage, publication types
- **Authors**: Top 15 authors, collaboration metrics, publication years
- **Publications**: Top journals, yearly distribution histogram
- **Timeline**: Cumulative and annual publication trends

## AI-Powered Research Assistant

### RAG (Retrieval-Augmented Generation)

- **Semantic Search**: Query your indexed PDFs using natural language
- **Context Retrieval**: Automatically retrieves relevant passages from your corpus
- **Source Citations**: Every answer includes references to source documents
- **Configurable Parameters**: Adjust topK, similarity threshold, chunking strategy

### LLM Integration

- **Ollama Support**: Use local LLMs via Ollama
- **Claude/OpenAI**: Connect to cloud LLM providers
- **Embedded LLM**: Download and run small models directly (Qwen 0.5B, 1.5B)
- **System Prompts**: Customizable system prompts in French or English

### Topic Modeling (Optional)

- **BERTopic Integration**: Identify main themes in your corpus
- **Python Environment**: Isolated Python venv for dependencies
- **Optional Feature**: Install only if needed

## Document Editing

### Milkdown Editor

- **WYSIWYG Markdown**: Visual editing with markdown support
- **Citation Autocomplete**: Type `@` to insert citations from bibliography
- **Footnotes**: Visual styling for footnotes in both dark and light themes
- **Live Preview**: See formatted output as you type

### Export Options

- **PDF Export**: Generate professional PDFs via Pandoc/LaTeX
- **Word Export**: Export to .docx format
- **Beamer Presentations**: Create slides from markdown (presentation projects)

## Project Management

- **Project Types**: Article, Book, or Presentation projects
- **Recent Projects**: Quick access to recently opened projects
- **Project Settings**: CSL styles, Beamer themes
- **Database Actions**: Purge, rebuild, and optimize project database

## User Interface

### Themes

- **Dark/Light Mode**: Toggle between themes
- **Auto Theme**: Automatic switching based on time of day
- **Consistent Styling**: All components adapt to selected theme

### Internationalization

- **Languages**: French, English, German
- **Auto-detection**: Detects system language on first launch
- **Menu Translations**: Complete localization including menus

### Research Journal

- **Session Tracking**: Track research sessions and activities
- **Chat History**: Review past conversations with the AI assistant
- **Date/Time Display**: Sessions show both date and time
- **Filter Empty Sessions**: Hide sessions without activity

## Technical Features

### Vector Database

- **HNSW Index**: Fast approximate nearest neighbor search
- **BM25 Search**: Hybrid search combining semantic and keyword matching
- **SQLite Storage**: Persistent storage for chunks and metadata
- **Chunking Strategies**: CPU-optimized, standard, or large chunk configurations

### Configuration

- **Settings Panel**: Centralized configuration for all features
- **Per-project Settings**: Some settings (like database actions) are project-specific
- **Persistent Storage**: Settings saved via Electron Store

---

For detailed technical documentation on specific features, see the individual feature documentation files.
