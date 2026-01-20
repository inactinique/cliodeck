# ClioDeck Changelog

## Beta 3.1

**Release Date**: January 2026

### Major Features

#### Zotero Synchronization
- Bidirectional sync between local bibliography and Zotero library
- Intelligent diff detection for additions, modifications, and deletions
- Three conflict resolution strategies: Remote Wins, Local Wins, Manual
- Field-level comparison with side-by-side diff view
- MD5 hash comparison for PDF attachment changes
- Automatic backup before sync operations

#### Bibliography Statistics Dashboard
- Comprehensive statistical analysis with 4 interactive tabs
- Overview: Total counts, year range, PDF coverage, publication types
- Authors: Top 15 authors with collaboration metrics
- Publications: Top journals, yearly distribution
- Timeline: Cumulative and annual publication trends
- O(n) performance, responsive design

#### Tags and Metadata System
- Custom tags for organizing citations
- Multi-select tag filtering
- Custom fields for additional metadata
- Personal notes per citation
- Automatic date tracking (added/modified)
- Full BibTeX preservation on import/export

#### Orphan PDF Cleanup
- Automated detection of unlinked PDFs
- Summary dashboard with statistics
- Safe archive option (moves to orphan_pdfs folder)
- Permanent delete option with confirmation
- Rescan functionality

#### BibTeX Export
- Export bibliography with all metadata preserved
- Custom fields, tags, keywords, and notes included
- Modern Unicode format
- Lossless round-trip (import → export → import)

#### PDF Modification Detection
- Proactive notification when indexed PDFs are modified
- MD5 hash comparison to detect changes
- Batch re-indexation of modified PDFs
- Periodic checks every 5 minutes

#### Unified Bibliography Panel
- Removed separate PDFs panel
- All PDF management through Bibliography
- Zotero-first philosophy
- Simplified UI with cleaner navigation

### Statistics
- 7 major features implemented
- ~5,500 lines of code added
- 22 new files created
- 24 existing files modified
- 100% completion of Beta 2 backlog (excluding low-priority items)

---

## Beta 2

### Major Features

#### Theme System
- Light/dark mode toggle
- Auto theme based on time of day
- Consistent styling across all components

#### Zotero PDF Integration
- Zotero API integration for PDF attachments
- Extended Citation type with Zotero metadata
- UI indicators showing PDF availability
- Multi-PDF selection dialog

#### PDF Download & Indexation
- Download PDFs directly from Zotero
- Citation card integration for download-on-index
- Download all missing PDFs button
- Batch progress tracking

#### Configuration Improvements
- Enhanced warnings for embedding model changes
- Better UX for critical configuration changes
- Topic Modeling status fixes
- "Open in Finder" button for projects

### Features Postponed to Beta 3
The following features were planned but postponed:
1. Zotero Update/Sync function → ✅ Implemented in Beta 3.1
2. Modified PDF detection → ✅ Implemented in Beta 3.1
3. Orphan PDF cleanup → ✅ Implemented in Beta 3.1
4. Merge Bibliography/PDFs tabs → ✅ Implemented in Beta 3.1
5. Statistics dashboard → ✅ Implemented in Beta 3.1
6. Tags and metadata → ✅ Implemented in Beta 3.1
7. Embedding options dropdown → Deferred (low priority)
8. Standalone embeddings → Not recommended (high complexity, low benefit)

---

## Beta 1

### Initial Release
- Core RAG functionality
- PDF indexing and semantic search
- Basic bibliography management
- BibTeX import
- Milkdown editor with markdown support
- Ollama LLM integration
- Research journal and chat history
- Multi-language support (FR, EN, DE)
- Project management (Article, Book, Presentation)
- PDF and Word export via Pandoc

---

## Migration Notes

### Upgrading to Beta 3.1

**No breaking changes** - all new features are additive:
- Existing citations continue to work
- No database migration needed
- No configuration changes required
- All new fields are optional

**Recommended Actions**:
1. Sync with Zotero to get latest data
2. Add tags to frequently-used citations
3. Review statistics to understand your bibliography
4. Add notes to important citations
5. Run orphan PDF cleanup to recover disk space

---

## Known Limitations

### Current Limitations
- Tag hierarchies: Single-level tags only (no parent/child)
- Batch tag operations: Can't apply tags to multiple citations at once
- PDF version tracking: MD5 comparison works but no historical version tracking
- Export format: Always uses modern Unicode format (no legacy option)
- Manual PDFs: Previously manually-added PDFs remain in index but have no citations

### Planned Improvements
See the Features documentation for the roadmap of planned enhancements.
