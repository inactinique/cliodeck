# Implementation Plan - ClioDesk v1.0

Current version: 0.1.0
Target: Stable and complete version 1.0

---

## Phase 1: User Interface Improvements

### 1.1 Settings Panel Redesign

**Files involved:**
- `src/renderer/src/components/Config/ConfigPanel.tsx`
- `src/renderer/src/components/Config/ConfigPanel.css`
- All configuration sections (`*ConfigSection.tsx`)

**Tasks:**
- [x] Improve design consistency across all sections
- [x] Add "Configuration saved" message to the right of buttons
- [x] Make Save/Reset buttons sticky (fixed) during scroll
- [x] Collapse all sections by default on load
- [x] Use or improve existing `CollapsibleSection` component

**Priority:** Medium
**Complexity:** Low
**Status:** **Completed**

---

### 1.2 Research Journal Panel Improvement

**Files involved:**
- `src/renderer/src/components/Journal/JournalPanel.tsx`
- `src/renderer/src/components/Journal/SessionTimeline.tsx`
- Backend: `backend/core/history/HistoryManager.ts`

**Tasks:**
- [x] Filter and hide empty sessions (without events)
- [x] Create new "Global View" displaying all events from all sessions
- [x] Add toggle to switch between "Session View" and "Global View"
- [x] Optimize queries to load only non-empty sessions *(client-side filtering)*

**Priority:** Medium
**Complexity:** Medium
**Status:** **Completed**

---

## Phase 2: Functional Improvements

### 2.1 Project Panel Exports

**Files involved:**
- `src/renderer/src/components/Project/ProjectPanel.tsx`
- `src/renderer/src/components/Export/WordExportModal.tsx`
- Backend: `src/main/services/word-export.ts`
- Backend: `src/main/ipc/handlers/export-handlers.ts`

**Tasks:**
- [x] Add Word export option (.docx)
  - Use `docx` library already in dependencies
  - Word export service created (word-export.ts, ~600 lines)
  - Export modal with complete form (WordExportModal.tsx)
- [x] Add CSL file management (Citation Style Language)
  - CSL field added in ProjectPanel and CSLSettings
  - CSL support integrated in Word exports
  - CSLSettings.tsx component for selection management
- [x] Word template support (.dotx)
  - Automatic detection of .dotx files (`findTemplate()` method)
  - Template merge via docxtemplater (`mergeWithTemplate()` method)
  - Detected template display in WordExportModal (green badge)
  - Supported placeholders: {title}, {author}, {date}, {content}, {abstract}
  - Automatic fallback if invalid template
- [x] PageNumber bug fix
  - Syntax corrected for page numbers in footer

**Dependencies added:**
- `docxtemplater@^3.55.7` - Word template processing
- `pizzip@^3.1.7` - ZIP archive manipulation
- `@types/pizzip` (dev) - TypeScript types

**Documentation created:**
- `WORD_TEMPLATES.md` - Complete user guide (184 lines)
- `EXPORT_WORD_IMPLEMENTATION.md` - Technical documentation (245 lines)

**Commits:**
- `75ee4d0` - feat: Add Word template (.dotx) support for exports
- `30e4219` - chore: Add docxtemplater/pizzip to package.json dependencies

**Priority:** High
**Complexity:** Medium-High
**Status:** **Completed** (2026-01-11)

**Remaining tests:**
- [ ] Manual tests with different templates
- [ ] Automated integration tests (to create)
- [ ] Test on all 3 platforms after build

---

### 2.2 Bibliography Management

**Files involved:**
- `src/renderer/src/components/Bibliography/BibliographyPanel.tsx`
- `src/renderer/src/components/Bibliography/BibImportModeModal.tsx`
- `src/renderer/src/components/Bibliography/BibImportSummaryModal.tsx`
- `src/renderer/src/stores/bibliographyStore.ts`

**Tasks:**
- [x] Modify "+" button to offer two options
  - Option 1: Completely replace current bibliography file
  - Option 2: Add references from new file to existing ones
- [x] Implement reference merge logic (avoid duplicates by citation key)
- [x] Add confirmation before complete replacement
- [x] Display summary after addition (X new references, Y duplicates ignored)

**Priority:** Medium
**Complexity:** Medium
**Status:** **Completed**

---

### 2.3 Chat Panel Improvement

**Files involved:**
- `src/renderer/src/components/Chat/RAGSettingsPanel.tsx`
- `src/renderer/src/stores/ragQueryStore.ts`
- `backend/core/llm/SystemPrompts.ts`
- `src/main/services/chat-service.ts`

**Tasks:**
- [x] Add "System Prompt" field in RAG settings
- [x] Create two default system prompts
  - French prompt: Academic assistant in French
  - English prompt: Academic assistant in English
- [x] Add system prompt language selector (FR/EN) in RAGSettingsPanel
- [x] Allow user modification of system prompt
- [x] Save system prompt preferences in configuration
- [x] Integrate system prompt in LLM requests

**Priority:** High
**Complexity:** Low-Medium
**Status:** **Completed**

---

### 2.4 PDF Indexing Improvement

**Files involved:**
- `src/renderer/src/components/PDFIndex/PDFIndexPanel.tsx`
- `src/renderer/src/components/PDFIndex/PDFRenameModal.tsx`
- `backend/core/pdf/PDFIndexer.ts`

**Tasks:**
- [x] During PDF import, allow document renaming
- [x] Add renaming interface after file selection, before indexing
- [x] Suggest default name based on
  - Title extracted from PDF metadata
  - Filename (if no metadata)
- [x] Allow name editing after import
- [x] Store custom names in database

**Priority:** Medium
**Complexity:** Medium
**Status:** **Completed**

---

## Phase 3: Content Revision and Documentation

### 3.1 Methodology Guide

**Files involved:**
- `src/renderer/src/components/Methodology/MethodologyModal.tsx`
- Guide content files (to locate)

**Tasks:**
- [x] Audit current methodology guide content
- [x] Evaluate relevance for users (historians/researchers)
- [ ] Rewrite obsolete or irrelevant sections *(Current guide is relevant and up to date)*
- [ ] Add concrete ClioDesk usage examples *(To do if necessary)*
- [x] Ensure guide reflects current features (embeddings, BM25, etc.)

**Priority:** Medium
**Complexity:** Low (writing)
**Status:** Audit completed - Good quality guide

---

### 3.2 GitHub Technical Documentation

**Files involved:**
- `BUILD.md`
- `DEPLOYMENT.md` (if exists)
- `INSTALL.md` or installation files
- `README.md` (manual review, not by Claude Code)

**Tasks:**
- [x] Merge BUILD.md and DEPLOYMENT.md into single coherent document → `BUILD_AND_DEPLOYMENT.md`
- [x] Review and update installation instructions
- [x] Verify all steps are current (native dependencies, Python, etc.)
- [x] Add common troubleshooting sections
- [x] Organize by platform (macOS, Linux, Windows)

**Priority:** High
**Complexity:** Low-Medium
**Status:** Completed - Existing INSTALL_*.md files are complete and up to date

---

### 3.3 Technical Features Documentation

**Files involved:**
- `CHUNKING_IMPROVEMENTS.md`
- `EMBEDDINGS_IMPROVEMENTS.md`
- New file: `ARCHITECTURE.md`

**Tasks:**
- [x] Merge CHUNKING_IMPROVEMENTS.md and EMBEDDINGS_IMPROVEMENTS.md
- [x] Create structured ARCHITECTURE.md document:
  - Introduction: What is ClioDesk and how it works
  - Global architecture (Electron frontend + backend + Python services)
  - RAG system (Vector store, HNSW, BM25, hybrid search)
  - Indexing pipeline (adaptive chunking, embeddings)
  - Integrations (Zotero, PDF, export)
- [x] Make document accessible to external developers
- [x] Add diagrams if necessary

**Priority:** Medium
**Complexity:** Medium
**Status:** Completed - ARCHITECTURE.md created with diagrams and complete explanations

---

## Phase 4: Internationalization (i18n)

### 4.1 Audit and Complete English Translation

**Files involved:**
- All React components using `useTranslation`
- Translation files (to locate: probably in `src/renderer/src/i18n/` or similar)

**Tasks:**
- [x] Locate current translation system (i18next already installed)
- [x] Identify all untranslated strings
- [x] Create/complete translation files:
  - `en/common.json`
  - `fr/common.json`
  - `de/common.json`
- [x] Replace all hardcoded texts with translation keys
- [x] Areas verified and translated:
  - Configuration panel (ActionsSection, LanguageConfigSection)
  - Error messages (Alerts/prompts in all components)
  - Chat Interface and empty state
  - Bibliography (CitationCard, ZoteroImport)
  - Confirmation modals

**Priority:** High
**Complexity:** Medium (significant volume)
**Status:** Completed - Detailed report created in I18N_MIGRATION_REPORT.md

**Modified files:**
- `public/locales/fr/common.json` - Added ~50+ new keys
- `public/locales/en/common.json` - Added ~50+ new keys
- `public/locales/de/common.json` - Added ~50+ new keys
- `src/renderer/src/components/Config/LanguageConfigSection.tsx` - Translated
- `src/renderer/src/components/Config/ActionsSection.tsx` - Translated
- `src/renderer/src/components/Chat/ChatInterface.tsx` - Translated
- `src/renderer/src/components/Bibliography/ZoteroImport.tsx` - Translated
- `src/renderer/src/components/Bibliography/CitationCard.tsx` - Translated

---

## Phase 5: Cleanup and Preparation

### 5.1 Experimental Features Removal

**Files involved:**
- `src/renderer/src/components/Editor/ContextualSuggestions.tsx`
- `src/renderer/src/components/Editor/CitationSuggestionsPanel.tsx`
- `src/renderer/src/components/Config/SuggestionsConfigSection.tsx`
- References in other components

**Tasks:**
- [x] Remove ContextualSuggestions component
- [x] Remove CitationSuggestionsPanel
- [x] Remove SuggestionsConfigSection
- [x] Remove references in ConfigPanel
- [x] Clean up associated imports and types
- [x] Remove associated backend services if isolated
- [x] Verify no active feature depends on these components

**Priority:** Low (to do before release)
**Complexity:** Low
**Status:** **Completed**

**Modified files:**
- Deleted: `ContextualSuggestions.tsx`, `ContextualSuggestions.css`
- Deleted: `CitationSuggestionsPanel.tsx`, `CitationSuggestionsPanel.css`
- Deleted: `SuggestionsConfigSection.tsx`
- Modified: `ConfigPanel.tsx`, `EditorPanel.tsx`, `editorStore.ts`
- Modified: `useMenuShortcuts.ts`, `MarkdownEditor.tsx`

---

## Phase 6: Final Version 1.0 (dedicated branch)

### 6.1 Log Optimization

**Files involved:**
- `src/shared/logger.ts` (created)
- `src/shared/console-filter.ts` (created)
- `src/main/index.ts`
- `src/renderer/src/main.tsx`

**Tasks:**
- [x] Audit all application logs (~850 console.* calls in 85+ files)
- [x] Create centralized logging system with levels (debug, info, warn, error)
- [x] ~~Replace console.log with logging system~~ → Pragmatic approach: automatic filter
- [x] Configure logs for
  - Development mode: all levels
  - Production mode: warn and error only
- [x] ~~Add log rotation if necessary~~ → Not needed for v1.0
- [x] Document how to enable debug logs in production → `LOGGING.md`

**Implemented approach:** Pragmatic solution with automatic console filter that disables `console.log` and `console.info` in production, without requiring migration of 850+ existing calls.

**Created files:**
- `src/shared/logger.ts` - Centralized logger with levels
- `src/shared/console-filter.ts` - Automatic filter in production
- `LOGGING.md` - Documentation

**Environment variables:**
- `CLIODESK_DEBUG=1`: Enable all logs in production
- `CLIODESK_LOG_LEVEL=debug`: Set log level

**Priority:** High
**Complexity:** Medium
**Status:** **Completed** (2026-01-14)

---

### 6.2 DevTools Removal (ON HOLD FOR NOW)

**Files involved:**
- `src/main/index.ts`
- Electron configuration

**Tasks:**
- [ ] Locate DevTools activation in code
- [ ] Disable DevTools in production mode
- [ ] Keep ability to enable via environment variable for debug
- [ ] Verify no DevTools reference remains in production build
- [ ] Test final build without DevTools

**Priority:** High
**Complexity:** Low

---

### 6.3 Release Preparation

**Files involved:**
- `package.json`
- `CHANGELOG.md` (to create)
- Git tags

**Tasks:**
- [ ] Update version in package.json: 0.1.0 → 1.0.0
- [ ] Create complete CHANGELOG.md listing:
  - New features
  - Improvements
  - Bug fixes
  - Breaking changes (if applicable)
- [ ] Test complete build on all three platforms:
  - macOS (Intel and Apple Silicon)
  - Linux (AppImage and deb)
  - Windows (NSIS)
- [ ] Create Git tag v1.0.0
- [ ] Prepare GitHub release notes

**Priority:** Critical
**Complexity:** Low

---

## Phase Organization

### Recommended Execution Order:

1. **Phase 3** (Documentation) - While code is still fresh
2. **Phase 4** (i18n) - To have complete interface before tests
3. **Phase 2** (Features) - Major additions
4. **Phase 1** (UI) - Interface polish
5. **Phase 5** (Cleanup) - Remove experimental features
6. **Phase 6** (Release) - Finalization and publication

### Recommended Git Branches:

- `towards-1.0` (current branch) - Phases 1 to 5
- `release/1.0` - Phase 6 only
- Optional sub-branches for major features:
  - `feature/word-export`
  - `feature/i18n-complete`
  - `feature/system-prompt`

---

## Global Estimate

**Total tasks:** ~60-70 individual tasks

**Complexity by phase:**
- Phase 1: ~1-2 weeks
- Phase 2: ~2-3 weeks
- Phase 3: ~1 week
- Phase 4: ~1-2 weeks
- Phase 5: ~2-3 days
- Phase 6: ~3-5 days

---

## Important Notes

### External Dependencies to Add:
- CSL library (citation-js or citeproc-js) for citation style management
- Possibly: structured logging library (winston, pino, or custom)

### Tests to Plan:
- Integration tests for new exports (Word, CSL)
- System prompt tests
- Bibliography merge tests
- Multi-platform tests of final build

### User Documentation:
- Update methodology guide after each phase
- Create usage examples for new features
- Prepare screenshots for documentation

---

## Global Progress to v1.0

### Overview by Phase

| Phase | Total Tasks | Completed | In Progress | Not Started | Progress |
|-------|-------------|-----------|-------------|-------------|----------|
| **Phase 1** - UI | 9 | 9 | 0 | 0 | 100% |
| **Phase 2** - Features | 22 | 22 | 0 | 0 | 100% |
| **Phase 3** - Documentation | 8 | 8 | 0 | 0 | 100% |
| **Phase 4** - i18n | 7 | 7 | 0 | 0 | 100% |
| **Phase 5** - Cleanup | 7 | 7 | 0 | 0 | 100% |
| **Phase 6** - Release | 13 | 6 | 0 | 7 | 46% |
| **TOTAL** | **66** | **59** | **0** | **7** | **89%** |

### Phase 2 Detail - Functional Improvements

| Sub-section | Tasks | Completed | Status |
|-------------|-------|-----------|--------|
| 2.1 Word Export + CSL + Templates | 7 | 7 | **100%** |
| 2.2 Bibliography Management | 4 | 4 | **100%** |
| 2.3 Chat System Prompt | 6 | 6 | **100%** |
| 2.4 PDF Renaming | 5 | 5 | **100%** |

### Phase 6 Detail - Release

| Sub-section | Tasks | Completed | Status |
|-------------|-------|-----------|--------|
| 6.1 Log Optimization | 6 | 6 | **100%** |
| 6.2 DevTools Removal | 5 | 0 | 0% |
| 6.3 Release Preparation | 5 | 0 | 0% |

### Next Priorities

1. **Phase 6.2 - DevTools Removal**
   - Disable DevTools in production
   - Environment variable for debug
   - Complexity: Low

2. **Phase 6.3 - Release Preparation**
   - Update version 1.0.0
   - CHANGELOG.md
   - Multi-platform tests
   - Git tag v1.0.0

---

**Last updated:** 2026-01-14
**Status:** 89% complete - Phases 1-5 complete, Phase 6.1 (logs) completed
**Next step:** Phase 6.2 (DevTools) then Phase 6.3 (Release)
